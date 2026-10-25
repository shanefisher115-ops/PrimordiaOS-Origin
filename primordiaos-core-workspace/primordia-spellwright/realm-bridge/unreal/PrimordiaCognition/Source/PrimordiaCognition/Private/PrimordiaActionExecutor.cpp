#include "PrimordiaActionExecutor.h"

#include "Async/Async.h"
#include "PrimordiaIntentRouter.h"

FPrimordiaRunStatus FPrimordiaSpellRun::ToStatus() const
{
	FPrimordiaRunStatus S;
	S.SpellId = Spell.Id;
	S.SpellName = Spell.Name;
	S.GoalId = Spell.GoalId;
	S.StepStates = States;
	S.bFinished = bFinished;
	S.bSucceeded = bSucceeded;
	S.StartedAt = StartedAt;
	for (int32 i = 0; i < Spell.Steps.Num(); ++i)
	{
		S.StepOps.Add(Spell.Steps[i].Op);
		S.StepMessages.Add(Results.IsValidIndex(i) ? Results[i].Message : FString());
	}
	return S;
}

bool FPrimordiaActionExecutor::ResolveStep(const FSpellwrightStep& In, const TMap<FString, FString>& Context, FSpellwrightStep& Out, FString& OutMissing)
{
	Out = In;
	auto Resolve = [&Context, &OutMissing](const FString& Value, FString& Result) -> bool
	{
		Result.Reset();
		int32 i = 0;
		while (i < Value.Len())
		{
			const int32 Open = Value.Find(TEXT("${"), ESearchCase::CaseSensitive, ESearchDir::FromStart, i);
			const int32 Close = Open == INDEX_NONE ? INDEX_NONE : Value.Find(TEXT("}"), ESearchCase::CaseSensitive, ESearchDir::FromStart, Open);
			if (Open == INDEX_NONE || Close == INDEX_NONE)
			{
				Result += Value.Mid(i);
				return true;
			}
			Result += Value.Mid(i, Open - i);
			const FString Ref = Value.Mid(Open + 2, Close - Open - 2);
			const FString* Found = Context.Find(Ref);
			if (!Found)
			{
				OutMissing = Ref;
				return false;
			}
			Result += *Found;
			i = Close + 1;
		}
		return true;
	};
	if (!Resolve(In.Target, Out.Target))
	{
		return false;
	}
	for (const TPair<FString, FString>& Arg : In.Args)
	{
		FString V;
		if (!Resolve(Arg.Value, V))
		{
			return false;
		}
		Out.Args.Add(Arg.Key, V);
	}
	return true;
}

void FPrimordiaActionExecutor::Begin(const FSpellwrightSpell& Spell, double Now)
{
	TSharedPtr<FPrimordiaSpellRun> Run = MakeShared<FPrimordiaSpellRun>();
	Run->Spell = Spell;
	Run->States.Init(EPrimordiaStepState::Waiting, Spell.Steps.Num());
	Run->Results.SetNum(Spell.Steps.Num());
	Run->StepStartedAt.Init(0.0, Spell.Steps.Num());
	Run->StartedAt = Now;
	Runs.Add(Spell.Id, Run);
	if (Spell.Steps.Num() == 0)
	{
		CheckFinished(Spell.Id);
	}
}

int32 FPrimordiaActionExecutor::Advance(const FPrimordiaIntentRouter& Router, double Now)
{
	int32 Started = 0;
	TArray<FGuid> Ids;
	Runs.GetKeys(Ids);
	for (const FGuid& Id : Ids)
	{
		TSharedPtr<FPrimordiaSpellRun> Run = Runs.FindRef(Id);
		if (!Run.IsValid() || Run->bFinished)
		{
			continue;
		}
		for (int32 i = 0; i < Run->Spell.Steps.Num(); ++i)
		{
			if (Run->bFinished)
			{
				break;
			}
			if (Run->States[i] == EPrimordiaStepState::Running && Now - Run->StepStartedAt[i] > StepTimeoutSeconds)
			{
				CompleteStep(Id, i, FSpellwrightStepResult::Failure(FString::Printf(TEXT("timed out after %.0f s"), StepTimeoutSeconds)));
				continue;
			}
			if (Run->States[i] != EPrimordiaStepState::Waiting)
			{
				continue;
			}
			const FSpellwrightStep& Step = Run->Spell.Steps[i];
			bool bReady = true;
			for (const FName& Dep : Step.After)
			{
				const int32 j = Run->Spell.FindStep(Dep);
				if (j == INDEX_NONE || Run->States[j] != EPrimordiaStepState::Succeeded)
				{
					bReady = false;
					break;
				}
			}
			if (!bReady)
			{
				continue;
			}

			FSpellwrightStep Resolved;
			FString Missing;
			if (!ResolveStep(Step, Run->Context, Resolved, Missing))
			{
				CompleteStep(Id, i, FSpellwrightStepResult::Failure(FString::Printf(TEXT("${%s} was not produced by an earlier step"), *Missing)));
				continue;
			}

			Run->States[i] = EPrimordiaStepState::Running;
			Run->StepStartedAt[i] = Now;
			++Started;

			TWeakPtr<FPrimordiaActionExecutor> WeakSelf = AsShared();
			const int32 StepIndex = i;
			FSpellwrightStepCallback Callback = [WeakSelf, Id, StepIndex](const FSpellwrightStepResult& Result)
			{
				auto Apply = [WeakSelf, Id, StepIndex, Result]()
				{
					if (const TSharedPtr<FPrimordiaActionExecutor> Self = WeakSelf.Pin())
					{
						Self->CompleteStep(Id, StepIndex, Result);
					}
				};
				if (IsInGameThread()) { Apply(); }
				else { AsyncTask(ENamedThreads::GameThread, MoveTemp(Apply)); }
			};
			const FSpellwrightStepResult Immediate = Router.RouteStep(Resolved, MoveTemp(Callback));
			if (Immediate.Outcome != ESpellwrightStepOutcome::Pending)
			{
				CompleteStep(Id, i, Immediate);
			}
			else if (Run->States[i] == EPrimordiaStepState::Running)
			{
				Run->Results[i] = Immediate; // keeps the job id and message while it runs
			}
		}
	}
	return Started;
}

void FPrimordiaActionExecutor::CompleteStep(const FGuid& SpellId, int32 Step, const FSpellwrightStepResult& Result)
{
	TSharedPtr<FPrimordiaSpellRun> Run = Runs.FindRef(SpellId);
	if (!Run.IsValid() || !Run->States.IsValidIndex(Step))
	{
		return;
	}
	const EPrimordiaStepState State = Run->States[Step];
	if (State != EPrimordiaStepState::Running && State != EPrimordiaStepState::Waiting)
	{
		return; // already finished (a late callback after a timeout)
	}
	if (Result.Outcome == ESpellwrightStepOutcome::Pending)
	{
		return; // callbacks only carry final results
	}
	const FString JobId = Run->Results[Step].JobId;
	Run->Results[Step] = Result;
	if (Run->Results[Step].JobId.IsEmpty()) { Run->Results[Step].JobId = JobId; }

	const bool bOk = Result.Outcome == ESpellwrightStepOutcome::Succeeded;
	Run->States[Step] = bOk ? EPrimordiaStepState::Succeeded : EPrimordiaStepState::Failed;
	const FString Label = Run->Spell.Steps[Step].Label.ToString();
	if (bOk)
	{
		for (const TPair<FString, FString>& Out : Result.Outputs)
		{
			Run->Context.Add(Label + TEXT(".") + Out.Key, Out.Value);
		}
		Run->Context.Add(Label + TEXT(".message"), Result.Message);
	}
	else
	{
		SkipDependents(*Run, Step);
	}
	if (OnStepFinished)
	{
		OnStepFinished(*Run, Step);
	}
	CheckFinished(SpellId);
}

void FPrimordiaActionExecutor::SkipDependents(FPrimordiaSpellRun& Run, int32 Failed)
{
	TArray<int32> Frontier = {Failed};
	while (Frontier.Num() > 0)
	{
		const FName Label = Run.Spell.Steps[Frontier.Pop()].Label;
		for (int32 i = 0; i < Run.Spell.Steps.Num(); ++i)
		{
			if (Run.States[i] == EPrimordiaStepState::Waiting && Run.Spell.Steps[i].After.Contains(Label))
			{
				Run.States[i] = EPrimordiaStepState::Skipped;
				Run.Results[i] = FSpellwrightStepResult::Failure(FString::Printf(TEXT("skipped: %s failed"), *Label.ToString()));
				Frontier.Add(i);
			}
		}
	}
}

void FPrimordiaActionExecutor::CheckFinished(const FGuid& SpellId)
{
	TSharedPtr<FPrimordiaSpellRun> Run = Runs.FindRef(SpellId);
	if (!Run.IsValid() || Run->bFinished)
	{
		return;
	}
	bool bAllDone = true;
	bool bAllOk = true;
	for (const EPrimordiaStepState S : Run->States)
	{
		bAllDone &= S == EPrimordiaStepState::Succeeded || S == EPrimordiaStepState::Failed || S == EPrimordiaStepState::Skipped;
		bAllOk &= S == EPrimordiaStepState::Succeeded;
	}
	if (!bAllDone)
	{
		return;
	}
	Run->bFinished = true;
	Run->bSucceeded = bAllOk;
	FinishedOrder.Add(SpellId);
	if (OnRunFinished)
	{
		OnRunFinished(*Run);
	}
	while (FinishedOrder.Num() > FinishedRunsKept)
	{
		Runs.Remove(FinishedOrder[0]);
		FinishedOrder.RemoveAt(0);
	}
}

bool FPrimordiaActionExecutor::Cancel(const FGuid& SpellId)
{
	TSharedPtr<FPrimordiaSpellRun> Run = Runs.FindRef(SpellId);
	if (!Run.IsValid() || Run->bFinished)
	{
		return false;
	}
	for (int32 i = 0; i < Run->States.Num(); ++i)
	{
		if (Run->States[i] == EPrimordiaStepState::Waiting || Run->States[i] == EPrimordiaStepState::Running)
		{
			Run->States[i] = EPrimordiaStepState::Skipped;
			Run->Results[i].Message = TEXT("cancelled");
		}
	}
	CheckFinished(SpellId);
	return true;
}

int32 FPrimordiaActionExecutor::NumActive() const
{
	int32 N = 0;
	for (const TPair<FGuid, TSharedPtr<FPrimordiaSpellRun>>& R : Runs)
	{
		N += (R.Value.IsValid() && !R.Value->bFinished) ? 1 : 0;
	}
	return N;
}

TArray<FPrimordiaRunStatus> FPrimordiaActionExecutor::GetStatus() const
{
	TArray<FPrimordiaRunStatus> Out;
	for (const TPair<FGuid, TSharedPtr<FPrimordiaSpellRun>>& R : Runs)
	{
		if (R.Value.IsValid())
		{
			Out.Add(R.Value->ToStatus());
		}
	}
	Out.Sort([](const FPrimordiaRunStatus& A, const FPrimordiaRunStatus& B) { return A.StartedAt < B.StartedAt; });
	return Out;
}

const FPrimordiaSpellRun* FPrimordiaActionExecutor::FindRun(const FGuid& SpellId) const
{
	const TSharedPtr<FPrimordiaSpellRun>* R = Runs.Find(SpellId);
	return R && R->IsValid() ? R->Get() : nullptr;
}
