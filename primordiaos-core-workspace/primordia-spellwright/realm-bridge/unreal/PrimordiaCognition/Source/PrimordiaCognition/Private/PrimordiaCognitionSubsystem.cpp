#include "PrimordiaCognitionSubsystem.h"

#include "Components/LightComponent.h"
#include "Dom/JsonObject.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"
#include "GameFramework/Controller.h"
#include "GameFramework/GameModeBase.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/WorldSettings.h"
#include "JulesTypes.h"
#include "Misc/FileHelper.h"
#include "Misc/ScopeExit.h"
#include "Misc/Paths.h"
#include "Modules/ModuleManager.h"
#include "PrimordiaBlenderSubsystem.h"
#include "PrimordiaBoltBridgeSubsystem.h"
#include "PrimordiaCADCAMSubsystem.h"
#include "PrimordiaDaVinciSubsystem.h"
#include "PrimordiaJulesSubsystem.h"
#include "PrimordiaLoreEngine.h"
#include "PrimordiaLoreSubsystem.h"
#include "PrimordiaSpellwrightSubsystem.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "SpellwrightOps.h"
#include "SpellwrightValidator.h"

DEFINE_LOG_CATEGORY(LogCognition);

IMPLEMENT_MODULE(FPrimordiaCognitionModule, PrimordiaCognition)

namespace
{
	FSpellwrightStepResult FromBoltJob(const FBoltJob& Job)
	{
		if (Job.Status != EBoltJobStatus::Succeeded)
		{
			return FSpellwrightStepResult::Failure(Job.Error.IsEmpty() ? FString::Printf(TEXT("job %s"), *FBoltJob::StatusToString(Job.Status)) : Job.Error);
		}
		FSpellwrightStepResult R = FSpellwrightStepResult::Success(Job.Message);
		R.JobId = Job.Id;
		if (const TSharedPtr<FJsonObject> Result = UPrimordiaBoltBridgeSubsystem::ParseResult(Job))
		{
			for (const TPair<FString, TSharedPtr<FJsonValue>>& F : Result->Values)
			{
				FString S;
				if (F.Value.IsValid() && F.Value->TryGetString(S)) { R.Outputs.Add(F.Key, S); }
				else if (F.Value.IsValid() && F.Value->Type == EJson::Number) { R.Outputs.Add(F.Key, FString::SanitizeFloat(F.Value->AsNumber())); }
				else if (F.Value.IsValid() && F.Value->Type == EJson::Boolean) { R.Outputs.Add(F.Key, F.Value->AsBool() ? TEXT("true") : TEXT("false")); }
			}
		}
		return R;
	}

	UClass* LoadActorClass(const FString& InPath)
	{
		TArray<FString> Candidates = {InPath};
		if (!InPath.EndsWith(TEXT("_C")))
		{
			Candidates.Add(InPath + TEXT("_C"));
			// "/Game/Dir/BP_Thing" -> "/Game/Dir/BP_Thing.BP_Thing_C"
			int32 Dot;
			if (!InPath.FindChar('.', Dot))
			{
				Candidates.Add(FString::Printf(TEXT("%s.%s_C"), *InPath, *FPaths::GetBaseFilename(InPath)));
			}
		}
		for (const FString& Path : Candidates)
		{
			UClass* C = FindObject<UClass>(nullptr, *Path);
			if (!C)
			{
				C = LoadObject<UClass>(nullptr, *Path, nullptr, LOAD_NoWarn | LOAD_Quiet);
			}
			if (C && C->IsChildOf(AActor::StaticClass()))
			{
				return C;
			}
		}
		return nullptr;
	}

	bool IsProtectedActor(const AActor* Actor)
	{
		if (Actor->IsA<AController>() || Actor->IsA<AGameModeBase>() || Actor->IsA<AWorldSettings>())
		{
			return true;
		}
		if (const APawn* Pawn = Cast<APawn>(Actor))
		{
			return Pawn->IsPlayerControlled();
		}
		return false;
	}
}

bool UPrimordiaCognitionSubsystem::ShouldCreateSubsystem(UObject* Outer) const
{
	if (!Super::ShouldCreateSubsystem(Outer) || !GetDefault<UPrimordiaCognitionSettings>()->bEnabled)
	{
		return false;
	}
	const UWorld* World = Cast<UWorld>(Outer);
	return World && (World->WorldType == EWorldType::Game || World->WorldType == EWorldType::PIE);
}

UPrimordiaCognitionSubsystem* UPrimordiaCognitionSubsystem::Get(const UObject* WorldContext)
{
	const UWorld* World = GEngine ? GEngine->GetWorldFromContextObject(WorldContext, EGetWorldErrorMode::ReturnNull) : nullptr;
	return World ? World->GetSubsystem<UPrimordiaCognitionSubsystem>() : nullptr;
}

TStatId UPrimordiaCognitionSubsystem::GetStatId() const
{
	RETURN_QUICK_DECLARE_CYCLE_STAT(UPrimordiaCognitionSubsystem, STATGROUP_Tickables);
}

void UPrimordiaCognitionSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	const UPrimordiaCognitionSettings* S = GetDefault<UPrimordiaCognitionSettings>();

	Realm = S->DefaultRealm;
	Collector.TrackedTagPrefixes = S->TrackedTagPrefixes;
	Collector.MaxTrackedEntities = S->MaxTrackedEntities;
	Memory.Capacity = S->MemoryCapacity;
	Memory.HalfLifeHours = S->MemoryHalfLifeHours;
	MemoryPath = FPaths::Combine(FLoreText::SavedDir(TEXT("Cognition")), TEXT("memory.json"));
	if (S->bPersistMemory && FPaths::FileExists(MemoryPath))
	{
		Memory.Load(MemoryPath);
	}

	Executor = MakeShared<FPrimordiaActionExecutor>();
	Executor->StepTimeoutSeconds = S->StepTimeoutSeconds;
	TWeakObjectPtr<UPrimordiaCognitionSubsystem> WeakThis(this);
	Executor->OnRunFinished = [WeakThis](const FPrimordiaSpellRun& Run)
	{
		if (UPrimordiaCognitionSubsystem* Self = WeakThis.Get()) { Self->HandleRunFinished(Run); }
	};
	Executor->OnStepFinished = [WeakThis](const FPrimordiaSpellRun& Run, int32 Step)
	{
		UPrimordiaCognitionSubsystem* Self = WeakThis.Get();
		if (!Self) { return; }
		const FSpellwrightStep& St = Run.Spell.Steps[Step];
		const FSpellwrightStepResult& R = Run.Results[Step];
		const bool bOk = Run.States[Step] == EPrimordiaStepState::Succeeded;
		UE_LOG(LogCognition, Log, TEXT("%s/%s %s %s"), *Run.Spell.Name.ToString(), *St.Label.ToString(), bOk ? TEXT("succeeded") : TEXT("failed:"), *R.Message);
		Self->Memory.Remember(TEXT("action"), FString::Printf(TEXT("%s %s: %s"), *St.Op.ToString(), bOk ? TEXT("succeeded") : TEXT("failed"), *R.Message),
			{St.Op, Run.Spell.Name, bOk ? FName(TEXT("success")) : FName(TEXT("failure"))}, bOk ? 0.45f : 0.7f);
	};

	LoadPlannerResources();
	SetModelBridge(nullptr);
	RegisterHandlers();

	if (UPrimordiaBoltBridgeSubsystem* Bolt = UPrimordiaBoltBridgeSubsystem::Get())
	{
		BoltEventHandle = Bolt->OnEventNative.AddUObject(this, &UPrimordiaCognitionSubsystem::HandleBoltEvent);
	}
	Memory.Remember(TEXT("observation"), FString::Printf(TEXT("Cognition awoke in %s"), *GetWorld()->GetMapName()), {TEXT("cognition"), Realm}, 0.5f);
	UE_LOG(LogCognition, Log, TEXT("Cognition online in %s: realm %s, %d memories, %d planner methods, %d triggers, model %s"),
		*GetWorld()->GetMapName(), *Realm.ToString(), Memory.Num(), Planner.GetMethods().Num(), RuleModel->Triggers.Num(),
		*StaticEnum<EPrimordiaModelBackend>()->GetNameStringByValue(static_cast<int64>(GetDefault<UPrimordiaCognitionSettings>()->ModelBackend)));
}

void UPrimordiaCognitionSubsystem::Deinitialize()
{
	if (UPrimordiaBoltBridgeSubsystem* Bolt = UPrimordiaBoltBridgeSubsystem::Get())
	{
		Bolt->OnEventNative.Remove(BoltEventHandle);
	}
	if (GetDefault<UPrimordiaCognitionSettings>()->bPersistMemory)
	{
		Memory.Save(MemoryPath);
	}
	if (Executor.IsValid())
	{
		Executor->OnRunFinished = nullptr;
		Executor->OnStepFinished = nullptr;
		Executor.Reset();
	}
	Model.Reset();
	RuleModel.Reset();
	Super::Deinitialize();
}

void UPrimordiaCognitionSubsystem::LoadPlannerResources()
{
	const FString Dir = FPaths::Combine(FLoreText::ResourcesDir(), TEXT("Planner"));
	FString Json, Error;
	if (FFileHelper::LoadFileToString(Json, *FPaths::Combine(Dir, TEXT("methods.json"))) && !Planner.LoadMethodsFromJson(Json, Error))
	{
		UE_LOG(LogCognition, Error, TEXT("Planner methods: %s"), *Error);
	}
	RuleModel = MakeShared<FPrimordiaRuleModel>();
	if (FFileHelper::LoadFileToString(Json, *FPaths::Combine(Dir, TEXT("triggers.json"))) && !Planner.LoadTriggersFromJson(Json, RuleModel->Triggers, Error))
	{
		UE_LOG(LogCognition, Error, TEXT("Planner triggers: %s"), *Error);
	}
}

void UPrimordiaCognitionSubsystem::SetModelBridge(TSharedPtr<IPrimordiaModelBridge> InModel)
{
	if (InModel.IsValid())
	{
		Model = InModel;
		return;
	}
	const UPrimordiaCognitionSettings* S = GetDefault<UPrimordiaCognitionSettings>();
	if (S->ModelBackend == EPrimordiaModelBackend::Ollama)
	{
		TSharedPtr<FPrimordiaOllamaModel> Ollama = MakeShared<FPrimordiaOllamaModel>();
		Ollama->Url = S->OllamaUrl;
		Ollama->Model = S->OllamaModel;
		Ollama->TimeoutSeconds = S->ModelTimeoutSeconds;
		Ollama->MaxGoals = S->MaxModelGoals;
		Model = Ollama;
	}
	else
	{
		Model.Reset(); // Rules run anyway; None means only the triggers' absence is honoured
	}
}

void UPrimordiaCognitionSubsystem::RegisterHandlers()
{
	TWeakObjectPtr<UPrimordiaCognitionSubsystem> WeakThis(this);
	Router.RegisterDomain(TEXT("world"), [WeakThis](const FSpellwrightStep& Step, FSpellwrightStepCallback)
	{
		UPrimordiaCognitionSubsystem* Self = WeakThis.Get();
		return Self ? Self->ExecuteWorldStep(Step) : FSpellwrightStepResult::Failure(TEXT("cognition is gone"));
	});
	Router.RegisterDomain(TEXT("lore"), [WeakThis](const FSpellwrightStep& Step, FSpellwrightStepCallback)
	{
		UPrimordiaCognitionSubsystem* Self = WeakThis.Get();
		return Self ? Self->ExecuteLoreStep(Step) : FSpellwrightStepResult::Failure(TEXT("cognition is gone"));
	});
	Router.RegisterDomain(TEXT("cadcam"), [](const FSpellwrightStep& Step, FSpellwrightStepCallback Done)
	{
		UPrimordiaCADCAMSubsystem* Cad = UPrimordiaCADCAMSubsystem::Get();
		return Cad ? Cad->ExecuteStep(Step, MoveTemp(Done)) : FSpellwrightStepResult::Failure(TEXT("CAD/CAM subsystem is not loaded"));
	});
	Router.RegisterDomain(TEXT("blender"), [WeakThis](const FSpellwrightStep& Step, FSpellwrightStepCallback Done)
	{
		UPrimordiaBlenderSubsystem* Blender = UPrimordiaBlenderSubsystem::Get();
		UWorld* World = WeakThis.IsValid() ? WeakThis->GetWorld() : nullptr;
		return Blender ? Blender->ExecuteStep(Step, World, MoveTemp(Done)) : FSpellwrightStepResult::Failure(TEXT("Blender subsystem is not loaded"));
	});
	Router.RegisterDomain(TEXT("davinci"), [](const FSpellwrightStep& Step, FSpellwrightStepCallback Done)
	{
		UPrimordiaDaVinciSubsystem* Resolve = UPrimordiaDaVinciSubsystem::Get();
		return Resolve ? Resolve->ExecuteStep(Step, MoveTemp(Done)) : FSpellwrightStepResult::Failure(TEXT("DaVinci subsystem is not loaded"));
	});
	auto Pipeline = [WeakThis](const FSpellwrightStep& Step, FSpellwrightStepCallback Done)
	{
		UPrimordiaCognitionSubsystem* Self = WeakThis.Get();
		return Self ? Self->ExecutePipelineStep(Step, MoveTemp(Done)) : FSpellwrightStepResult::Failure(TEXT("cognition is gone"));
	};
	Router.RegisterDomain(TEXT("bolt"), Pipeline);
	Router.RegisterDomain(TEXT("autobuilder"), Pipeline);
}

void UPrimordiaCognitionSubsystem::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);
	if (bPaused || !Executor.IsValid())
	{
		return;
	}
	// Running spells advance every frame, so a step starts the frame its dependency finishes.
	Executor->Advance(Router, FPlatformTime::Seconds());

	const float Cycle = GetDefault<UPrimordiaCognitionSettings>()->CycleSeconds;
	Accumulator += DeltaTime;
	if (Accumulator >= Cycle)
	{
		// Never run more than one cycle per frame, even after a hitch.
		Accumulator = FMath::Fmod(Accumulator, static_cast<double>(Cycle));
		RunCycle();
	}
}

TArray<FString> UPrimordiaCognitionSubsystem::KnownTasks() const
{
	TArray<FString> Tasks = Planner.GetCompoundTasks();
	if (const UPrimordiaSpellwrightSubsystem* SW = UPrimordiaSpellwrightSubsystem::Get())
	{
		for (const FName& Verb : SW->GetVerbs())
		{
			Tasks.Add(TEXT("intent:") + Verb.ToString());
		}
	}
	return Tasks;
}

FName UPrimordiaCognitionSubsystem::AddGoalInternal(FPrimordiaGoal Goal)
{
	if (!Planner.IsKnownTask(Goal.Task))
	{
		UE_LOG(LogCognition, Warning, TEXT("Goal refused: unknown task '%s'"), *Goal.Task);
		return NAME_None;
	}
	// The same task with the same params already being pursued is one goal, not two.
	for (const TArray<FPrimordiaGoal>* List : {&Goals, &IncomingGoals})
	{
		for (const FPrimordiaGoal& G : *List)
		{
			if ((G.State == EPrimordiaGoalState::Pending || G.State == EPrimordiaGoalState::Executing) && G.Task == Goal.Task && G.Params.OrderIndependentCompareEqual(Goal.Params))
			{
				return G.Id;
			}
		}
	}
	Goal.Id = FName(*FString::Printf(TEXT("goal_%lld"), ++GoalCounter));
	Goal.State = EPrimordiaGoalState::Pending;
	Goal.Attempts = 0;
	Goal.RetryAt = 0.0;
	if (Goal.Description.IsEmpty())
	{
		Goal.Description = Goal.Task;
	}
	// During a cycle the goal list is being walked by reference; new goals join when it ends.
	(bInCycle ? IncomingGoals : Goals).Add(Goal);
	Memory.Remember(TEXT("goal"), FString::Printf(TEXT("New goal %s: %s (%s)"), *Goal.Id.ToString(), *Goal.Description, *Goal.Source), {TEXT("goal"), FName(*Goal.Task)}, 0.6f);
	Say(FString::Printf(TEXT("Goal %s: %s (from %s)"), *Goal.Id.ToString(), *Goal.Description, *Goal.Source), FColor::Cyan);
	OnGoalChanged.Broadcast(Goal);
	return Goal.Id;
}

FName UPrimordiaCognitionSubsystem::AddGoal(const FString& Task, const TMap<FString, FString>& Params, int32 Priority, const FString& SatisfiedWhen, const FString& Description)
{
	FPrimordiaGoal Goal;
	Goal.Task = Task;
	Goal.Params = Params;
	Goal.Priority = Priority;
	Goal.SatisfiedWhen = SatisfiedWhen;
	Goal.Description = Description;
	Goal.Source = TEXT("user");
	return AddGoalInternal(Goal);
}

bool UPrimordiaCognitionSubsystem::AbandonGoal(FName GoalId)
{
	for (FPrimordiaGoal& G : Goals)
	{
		if (G.Id == GoalId && (G.State == EPrimordiaGoalState::Pending || G.State == EPrimordiaGoalState::Executing))
		{
			G.State = EPrimordiaGoalState::Abandoned;
			G.Queued.Reset();
			for (const FGuid& Spell : G.Spells) { Executor->Cancel(Spell); }
			OnGoalChanged.Broadcast(G);
			return true;
		}
	}
	return false;
}

int32 UPrimordiaCognitionSubsystem::CastSpell(const FString& Source, TArray<FString>& OutIssues)
{
	UPrimordiaSpellwrightSubsystem* SW = UPrimordiaSpellwrightSubsystem::Get();
	if (!SW)
	{
		OutIssues.Add(TEXT("Spellwright is not loaded"));
		return 0;
	}
	TArray<FSpellwrightIssue> Issues;
	TArray<FSpellwrightSpell> Spells = SW->CompileSource(Source, Issues);
	for (const FSpellwrightIssue& I : Issues) { OutIssues.Add(I.ToString()); }
	if (FSpellwrightValidator::HasErrors(Issues))
	{
		return 0;
	}
	for (FSpellwrightSpell& Spell : Spells)
	{
		if (Spell.Realm.IsNone()) { Spell.Realm = Realm; }
		Spell.Provenance = TEXT("user");
		QueuedSpells.Add(Spell);
	}
	return Spells.Num();
}

void UPrimordiaCognitionSubsystem::SubmitIntent(const FSpellwrightIntent& Intent)
{
	QueuedIntents.Add(Intent);
}

bool UPrimordiaCognitionSubsystem::CancelSpell(const FGuid& SpellId)
{
	return Executor.IsValid() && Executor->Cancel(SpellId);
}

TArray<FPrimordiaMemoryRecord> UPrimordiaCognitionSubsystem::RecallMemories(const FString& Query, int32 Limit)
{
	return Memory.Recall(Query, {}, Limit);
}

void UPrimordiaCognitionSubsystem::RememberNote(const FString& Text, const TArray<FName>& Tags, float Salience)
{
	Memory.Remember(TEXT("user"), Text, Tags, Salience);
}

TArray<FPrimordiaRunStatus> UPrimordiaCognitionSubsystem::GetSpellRuns() const
{
	return Executor.IsValid() ? Executor->GetStatus() : TArray<FPrimordiaRunStatus>();
}

void UPrimordiaCognitionSubsystem::SetRealm(FName InRealm)
{
	if (InRealm != Realm)
	{
		Memory.Remember(TEXT("observation"), FString::Printf(TEXT("Crossed from %s into %s"), *Realm.ToString(), *InRealm.ToString()), {TEXT("realm"), InRealm}, 0.75f);
		Realm = InRealm;
	}
}

bool UPrimordiaCognitionSubsystem::CompileIntent(const FSpellwrightIntent& InIntent, FSpellwrightSpell& OutSpell, FString& OutError) const
{
	const UPrimordiaSpellwrightSubsystem* SW = UPrimordiaSpellwrightSubsystem::Get();
	if (!SW)
	{
		OutError = TEXT("Spellwright is not loaded");
		return false;
	}
	FString Reason;
	if (!Router.CanRouteIntent(InIntent, SW->GetCompiler(), Reason))
	{
		OutError = Reason;
		return false;
	}
	FSpellwrightIntent Intent = InIntent;
	if (Intent.Realm.IsNone())
	{
		Intent.Realm = Realm;
	}
	TArray<FSpellwrightIssue> Issues;
	if (!SW->CompileIntent(Intent, OutSpell, Issues))
	{
		TArray<FString> Lines;
		for (const FSpellwrightIssue& I : Issues)
		{
			if (I.Severity == ESpellwrightIssueSeverity::Error) { Lines.Add(I.ToString()); }
		}
		OutError = FString::Join(Lines, TEXT("; "));
		return false;
	}
	return true;
}

bool UPrimordiaCognitionSubsystem::JudgeAndBegin(const FSpellwrightSpell& Spell, FPrimordiaCycleReport& Report)
{
	if (!Judge(Spell, Report))
	{
		return false;
	}
	Begin(Spell);
	return true;
}

bool UPrimordiaCognitionSubsystem::Judge(const FSpellwrightSpell& Spell, FPrimordiaCycleReport& Report)
{
	const UPrimordiaSpellwrightSubsystem* SW = UPrimordiaSpellwrightSubsystem::Get();
	const TArray<FSpellwrightIssue> Issues = SW ? SW->ValidateSpell(Spell) : TArray<FSpellwrightIssue>();
	if (FSpellwrightValidator::HasErrors(Issues))
	{
		TArray<FString> Lines;
		for (const FSpellwrightIssue& I : Issues) { Lines.Add(I.ToString()); }
		const FString Why = FString::Join(Lines, TEXT("; "));
		++Report.SpellsRejected;
		Memory.Remember(TEXT("spell"), FString::Printf(TEXT("Spell %s is malformed: %s"), *Spell.Name.ToString(), *Why), {Spell.Name, TEXT("rejected")}, 0.6f);
		Say(FString::Printf(TEXT("Spell %s is malformed: %s"), *Spell.Name.ToString(), *Why), FColor::Orange);
		OnSpellRejected.Broadcast(Spell.Name, Why);
		return false;
	}
	for (const FSpellwrightStep& Step : Spell.Steps)
	{
		if (!Router.CanRouteStep(Step))
		{
			const FString Why = FString::Printf(TEXT("no engine handles %s"), *Step.Op.ToString());
			++Report.SpellsRejected;
			OnSpellRejected.Broadcast(Spell.Name, Why);
			return false;
		}
	}

	UPrimordiaJulesSubsystem* Jules = UPrimordiaJulesSubsystem::Get();
	if (!Jules)
	{
		++Report.SpellsRejected;
		OnSpellRejected.Broadcast(Spell.Name, TEXT("Jules is not loaded; nothing runs unjudged"));
		return false;
	}
	const FJulesReport Verdict = Jules->Evaluate(Spell);
	if (!Verdict.bApproved)
	{
		++Report.SpellsRejected;
		Report.Notes.Add(Verdict.Summary());
		Memory.Remember(TEXT("spell"), Verdict.Summary(), {Spell.Name, TEXT("rejected"), TEXT("jules")}, 0.7f);
		Say(FString::Printf(TEXT("Jules refused %s"), *Verdict.Summary()), FColor::Orange);
		OnSpellRejected.Broadcast(Spell.Name, Verdict.Summary());
		return false;
	}

	++Report.SpellsApproved;
	return true;
}

void UPrimordiaCognitionSubsystem::Begin(const FSpellwrightSpell& Spell)
{
	Executor->Begin(Spell, FPlatformTime::Seconds());
	Say(FString::Printf(TEXT("Casting %s (%s, %d steps) in %s"), *Spell.Name.ToString(), *Spell.School.ToString(), Spell.Steps.Num(), *Spell.Realm.ToString()), FColor::White);
	Memory.Remember(TEXT("spell"), FString::Printf(TEXT("Cast %s (%s, %s, %d steps, cost %.1f) in %s"), *Spell.Name.ToString(), *Spell.School.ToString(),
		*Spell.Provenance, Spell.Steps.Num(), Spell.Cost, *Spell.Realm.ToString()), {Spell.Name, Spell.School, Spell.Realm, TEXT("cast")}, 0.55f);
	if (UPrimordiaBoltBridgeSubsystem* Bolt = UPrimordiaBoltBridgeSubsystem::Get())
	{
		// Telemetry: the pipeline sees every spell that runs.
		Bolt->SubmitSpell(Spell);
	}
}

void UPrimordiaCognitionSubsystem::FailGoalAttempt(FPrimordiaGoal& Goal, const FString& Why, double Now)
{
	Goal.LastError = Why;
	if (Goal.Attempts >= Goal.MaxAttempts)
	{
		Goal.State = EPrimordiaGoalState::Failed;
		Memory.Remember(TEXT("goal"), FString::Printf(TEXT("Gave up on %s after %d attempts: %s"), *Goal.Description, Goal.Attempts, *Why), {TEXT("goal"), TEXT("failure")}, 0.8f);
		Say(FString::Printf(TEXT("Goal %s failed: %s"), *Goal.Id.ToString(), *Why), FColor::Red);
	}
	else
	{
		Goal.State = EPrimordiaGoalState::Pending;
		Goal.RetryAt = Now + Goal.RetrySeconds * FMath::Pow(2.0, FMath::Max(0, Goal.Attempts - 1));
	}
	OnGoalChanged.Broadcast(Goal);
}

void UPrimordiaCognitionSubsystem::HandleRunFinished(const FPrimordiaSpellRun& Run)
{
	const FPrimordiaRunStatus Status = Run.ToStatus();
	TArray<FString> Failures;
	for (int32 i = 0; i < Run.States.Num(); ++i)
	{
		if (Run.States[i] == EPrimordiaStepState::Failed)
		{
			Failures.Add(FString::Printf(TEXT("%s: %s"), *Run.Spell.Steps[i].Op.ToString(), *Run.Results[i].Message));
		}
	}
	Memory.Remember(TEXT("spell"), Run.bSucceeded ? FString::Printf(TEXT("%s completed"), *Run.Spell.Name.ToString())
		: FString::Printf(TEXT("%s failed (%s)"), *Run.Spell.Name.ToString(), *FString::Join(Failures, TEXT("; "))),
		{Run.Spell.Name, Run.bSucceeded ? FName(TEXT("success")) : FName(TEXT("failure"))}, Run.bSucceeded ? 0.6f : 0.8f);
	OnSpellFinished.Broadcast(Status);
	Say(Run.bSucceeded ? FString::Printf(TEXT("%s completed"), *Run.Spell.Name.ToString())
		: FString::Printf(TEXT("%s failed: %s"), *Run.Spell.Name.ToString(), *FString::Join(Failures, TEXT("; "))), Run.bSucceeded ? FColor::Green : FColor::Red);

	if (Run.Spell.GoalId.IsNone())
	{
		return;
	}
	FPrimordiaGoal* Goal = Goals.FindByPredicate([&](const FPrimordiaGoal& G) { return G.Id == Run.Spell.GoalId; });
	if (!Goal || Goal->State != EPrimordiaGoalState::Executing)
	{
		return;
	}
	if (!Run.bSucceeded)
	{
		Goal->Queued.Reset(); // the rest of the plan depended on this spell
		FailGoalAttempt(*Goal, FString::Join(Failures, TEXT("; ")), FPlatformTime::Seconds());
		return;
	}
	if (Goal->Queued.Num() > 0)
	{
		const FSpellwrightSpell Next = Goal->Queued[0];
		Goal->Queued.RemoveAt(0);
		Begin(Next);
		return;
	}
	if (Goal->SatisfiedWhen.IsEmpty())
	{
		Goal->State = EPrimordiaGoalState::Satisfied;
		Memory.Remember(TEXT("goal"), FString::Printf(TEXT("Achieved: %s"), *Goal->Description), {TEXT("goal"), TEXT("success")}, 0.7f);
		Say(FString::Printf(TEXT("Achieved: %s"), *Goal->Description), FColor::Green);
	}
	else
	{
		Goal->State = EPrimordiaGoalState::Pending; // the next cycle checks SatisfiedWhen against the world
	}
	OnGoalChanged.Broadcast(*Goal);
}

void UPrimordiaCognitionSubsystem::HandleBoltEvent(const FBoltEvent& Event)
{
	if (Event.Type == TEXT("job.updated"))
	{
		TSharedPtr<FJsonObject> Root;
		const TSharedPtr<FJsonObject>* Job = nullptr;
		FString Status, Kind, Error;
		if (FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Event.Json), Root) && Root.IsValid() && Root->TryGetObjectField(TEXT("job"), Job))
		{
			(*Job)->TryGetStringField(TEXT("status"), Status);
			(*Job)->TryGetStringField(TEXT("kind"), Kind);
			(*Job)->TryGetStringField(TEXT("error"), Error);
			if ((Status == TEXT("succeeded") || Status == TEXT("failed")) && Kind != TEXT("spell.cast"))
			{
				Memory.Remember(TEXT("job"), FString::Printf(TEXT("Pipeline %s %s%s"), *Kind, *Status, Error.IsEmpty() ? TEXT("") : *FString::Printf(TEXT(": %s"), *Error)),
					{FName(*Kind), TEXT("pipeline"), FName(*Status)}, Status == TEXT("failed") ? 0.75f : 0.5f);
			}
		}
	}
	else if (Event.Type.StartsWith(TEXT("build.")) || Event.Type.StartsWith(TEXT("worker.")))
	{
		Memory.Remember(TEXT("job"), FString::Printf(TEXT("Pipeline event %s"), *Event.Type), {TEXT("pipeline"), FName(*Event.Type)}, 0.45f);
	}
}

void UPrimordiaCognitionSubsystem::ConsultModels(const FPrimordiaWorldSnapshot& Snapshot, const TArray<FPrimordiaMemoryRecord>& Recalled, const TArray<FString>& Lore, double Now)
{
	const UPrimordiaCognitionSettings* S = GetDefault<UPrimordiaCognitionSettings>();
	FPrimordiaModelRequest Request;
	Request.World = Snapshot;
	Request.Memories = Recalled;
	Request.Lore = Lore;
	Request.ActiveGoals = Goals.FilterByPredicate([](const FPrimordiaGoal& G) { return G.State == EPrimordiaGoalState::Pending || G.State == EPrimordiaGoalState::Executing; });
	Request.KnownTasks = KnownTasks();
	Request.Now = Now;

	if (S->ModelBackend != EPrimordiaModelBackend::None && RuleModel.IsValid())
	{
		RuleModel->Propose(Request, [this](const FPrimordiaModelResponse& R) { AcceptProposals(R.Goals, TEXT("rules")); });
	}
	if (Model.IsValid() && !Model->IsBusy() && Now >= NextModelTime)
	{
		NextModelTime = Now + S->ModelSeconds;
		const int32 ModelGoals = Request.ActiveGoals.FilterByPredicate([](const FPrimordiaGoal& G) { return G.Source.StartsWith(TEXT("model")); }).Num();
		if (ModelGoals >= S->MaxModelGoals)
		{
			return;
		}
		Request.WorldSummary = FPrimordiaWorldState::Summarize(Snapshot);
		TWeakObjectPtr<UPrimordiaCognitionSubsystem> WeakThis(this);
		const FName ModelName = Model->GetName();
		Model->Propose(Request, [WeakThis, ModelName](const FPrimordiaModelResponse& R)
		{
			UPrimordiaCognitionSubsystem* Self = WeakThis.Get();
			if (!Self)
			{
				return;
			}
			if (!R.Error.IsEmpty())
			{
				UE_LOG(LogCognition, Verbose, TEXT("Model %s: %s"), *ModelName.ToString(), *R.Error);
			}
			if (!R.Thought.IsEmpty())
			{
				Self->Memory.Remember(TEXT("model"), R.Thought, {TEXT("model"), ModelName}, 0.4f);
			}
			Self->AcceptProposals(R.Goals, FString::Printf(TEXT("model:%s"), *ModelName.ToString()));
		});
	}
}

void UPrimordiaCognitionSubsystem::AcceptProposals(const TArray<FPrimordiaGoal>& Proposed, const FString& From)
{
	for (FPrimordiaGoal Goal : Proposed)
	{
		if (Goal.Source.IsEmpty())
		{
			Goal.Source = From;
		}
		AddGoalInternal(Goal);
	}
}

FPrimordiaCycleReport UPrimordiaCognitionSubsystem::RunCycle()
{
	const double Start = FPlatformTime::Seconds();
	const double Now = Start;
	const UPrimordiaCognitionSettings* S = GetDefault<UPrimordiaCognitionSettings>();
	FPrimordiaCycleReport Report;
	Report.Cycle = ++CycleCount;
	TGuardValue<bool> CycleGuard(bInCycle, true);

	UPrimordiaLoreSubsystem* Lore = UPrimordiaLoreSubsystem::Get();
	const FLoreCodex* Codex = Lore ? &Lore->GetCodex() : nullptr;
	UPrimordiaBoltBridgeSubsystem* Bolt = UPrimordiaBoltBridgeSubsystem::Get();

	// 1. World-state
	FPrimordiaWorldSnapshot Snapshot = Collector.Collect(GetWorld(), Realm, Codex,
		Bolt && Bolt->IsEventStreamConnected(), Bolt ? Bolt->GetActiveJobs().Num() : 0, Executor->NumActive());
	Snapshot.Facts.Add(TEXT("memory.count"), FString::FromInt(Memory.Num()));
	for (const FPrimordiaGoal& G : Goals)
	{
		Snapshot.Facts.Add(FString::Printf(TEXT("goal.%s"), *G.Id.ToString()), StaticEnum<EPrimordiaGoalState>()->GetNameStringByValue(static_cast<int64>(G.State)));
	}
	Report.TimeSeconds = Snapshot.TimeSeconds;
	Report.Facts = Snapshot.Facts.Num();

	// 2. Memory: what changed, then what is relevant now
	if (bHaveSnapshot)
	{
		for (const FPrimordiaObservation& O : FPrimordiaWorldState::Diff(LastSnapshot, Snapshot))
		{
			Memory.Remember(TEXT("observation"), O.Summary, O.Tags, O.Salience);
			++Report.Observations;
		}
	}
	LastSnapshot = Snapshot;
	bHaveSnapshot = true;

	FString Focus = Snapshot.Facts.FindRef(TEXT("realm.name"));
	for (const FPrimordiaGoal& G : Goals)
	{
		if (G.State == EPrimordiaGoalState::Pending || G.State == EPrimordiaGoalState::Executing) { Focus += TEXT(" ") + G.Description; }
	}
	for (const TPair<FName, int32>& T : Snapshot.TagCounts) { Focus += TEXT(" ") + T.Key.ToString(); }
	const TArray<FPrimordiaMemoryRecord> Recalled = Memory.Recall(Focus, {Realm}, 8);
	Report.MemoriesRecalled = Recalled.Num();

	// 3. Lore: the realm's laws and whatever the moment touches
	TArray<FString> LoreLines;
	if (Lore)
	{
		FLoreQuery Q;
		Q.Text = Focus;
		Q.Limit = 5;
		for (const FLoreQueryHit& Hit : Lore->QueryLore(Q))
		{
			LoreLines.Add(FString::Printf(TEXT("%s: %s"), *Hit.Title, *Hit.Text.Left(240)));
		}
		if (const FLoreRealm* R = Codex->FindRealm(Realm))
		{
			for (const FString& Law : R->Laws) { LoreLines.Add(FString::Printf(TEXT("Law of %s: %s"), *R->Name, *Law)); }
		}
	}
	Report.LoreConsulted = LoreLines.Num();

	// 4. Proposals (triggers every cycle, the model on its own clock)
	ConsultModels(Snapshot, Recalled, LoreLines, Now);

	// 5-8. Planning -> Spellwright -> validation -> Jules -> execution
	int32 Budget = S->MaxSpellsPerCycle;
	auto HasRoom = [&]() { return Budget > 0 && Executor->NumActive() < S->MaxConcurrentSpells; };

	TArray<int32> Order;
	for (int32 i = 0; i < Goals.Num(); ++i) { Order.Add(i); }
	Order.StableSort([this](int32 A, int32 B) { return Goals[A].Priority > Goals[B].Priority; });
	for (const int32 Index : Order)
	{
		FPrimordiaGoal& Goal = Goals[Index];
		if (Goal.State != EPrimordiaGoalState::Pending)
		{
			continue;
		}
		if (!Goal.SatisfiedWhen.IsEmpty() && FPrimordiaPlanner::Evaluate(Goal.SatisfiedWhen, Snapshot.Facts, Goal.Params))
		{
			Goal.State = EPrimordiaGoalState::Satisfied;
			Memory.Remember(TEXT("goal"), FString::Printf(TEXT("Achieved: %s"), *Goal.Description), {TEXT("goal"), TEXT("success")}, 0.7f);
			Say(FString::Printf(TEXT("Achieved: %s"), *Goal.Description), FColor::Green);
			OnGoalChanged.Broadcast(Goal);
			continue;
		}
		if (Now < Goal.RetryAt || !HasRoom())
		{
			continue;
		}

		++Goal.Attempts;
		const FPrimordiaPlan Plan = Planner.Plan(Goal, Snapshot.Facts);
		++Report.GoalsPlanned;
		if (!Plan.bSuccess || Plan.Intents.Num() == 0)
		{
			FailGoalAttempt(Goal, Plan.bSuccess ? TEXT("the plan is empty") : Plan.Error, Now);
			continue;
		}
		TArray<FSpellwrightSpell> Spells;
		FString Error;
		for (const FSpellwrightIntent& Intent : Plan.Intents)
		{
			FSpellwrightSpell Spell;
			if (!CompileIntent(Intent, Spell, Error))
			{
				break;
			}
			Spells.Add(Spell);
		}
		Report.SpellsCompiled += Spells.Num();
		if (Spells.Num() != Plan.Intents.Num())
		{
			FailGoalAttempt(Goal, Error, Now);
			continue;
		}
		// Jules approves the whole plan before any of it runs; then its spells run one after another.
		bool bAllApproved = true;
		for (const FSpellwrightSpell& Spell : Spells)
		{
			if (!Judge(Spell, Report))
			{
				bAllApproved = false;
				break;
			}
		}
		if (!bAllApproved)
		{
			FailGoalAttempt(Goal, Report.Notes.Num() > 0 ? Report.Notes.Last() : TEXT("the plan was rejected"), Now);
			continue;
		}
		Goal.Spells.Reset();
		for (const FSpellwrightSpell& Spell : Spells) { Goal.Spells.Add(Spell.Id); }
		Goal.Queued = Spells;
		Goal.Queued.RemoveAt(0);
		Goal.State = EPrimordiaGoalState::Executing;
		--Budget;
		Begin(Spells[0]);
		Report.Notes.Add(FString::Printf(TEXT("%s: %s"), *Goal.Id.ToString(), *FString::Join(Plan.Trace, TEXT(" > "))));
		OnGoalChanged.Broadcast(Goal);
	}

	while (QueuedIntents.Num() > 0 && HasRoom())
	{
		const FSpellwrightIntent Intent = QueuedIntents[0];
		QueuedIntents.RemoveAt(0);
		FSpellwrightSpell Spell;
		FString Error;
		if (!CompileIntent(Intent, Spell, Error))
		{
			++Report.SpellsRejected;
			OnSpellRejected.Broadcast(Intent.Verb, Error);
			continue;
		}
		++Report.SpellsCompiled;
		if (JudgeAndBegin(Spell, Report)) { --Budget; }
	}
	while (QueuedSpells.Num() > 0 && HasRoom())
	{
		const FSpellwrightSpell Spell = QueuedSpells[0];
		QueuedSpells.RemoveAt(0);
		++Report.SpellsCompiled;
		if (JudgeAndBegin(Spell, Report)) { --Budget; }
	}

	// 9-10. Route and act: start whatever is ready now (pipeline steps submit Bolt jobs)
	Report.StepsStarted = Executor->Advance(Router, FPlatformTime::Seconds());

	Goals.Append(MoveTemp(IncomingGoals));
	IncomingGoals.Reset();

	// Forget goals that ended long ago so the list stays small.
	if (Goals.Num() > 128)
	{
		Goals.RemoveAll([](const FPrimordiaGoal& G) { return G.State == EPrimordiaGoalState::Satisfied || G.State == EPrimordiaGoalState::Failed || G.State == EPrimordiaGoalState::Abandoned; });
	}
	if (S->bPersistMemory && CycleCount % 60 == 0)
	{
		Memory.Save(MemoryPath);
	}

	Report.ElapsedMs = static_cast<float>((FPlatformTime::Seconds() - Start) * 1000.0);
	LastReport = Report;
	OnCycle.Broadcast(Report);
	return Report;
}

void UPrimordiaCognitionSubsystem::Say(const FString& Text, const FColor& Color) const
{
	UE_LOG(LogCognition, Display, TEXT("%s"), *Text);
	if (GEngine && GetDefault<UPrimordiaCognitionSettings>()->bOnScreenMessages)
	{
		GEngine->AddOnScreenDebugMessage(-1, 10.f, Color, FString::Printf(TEXT("[Primordia] %s"), *Text));
	}
}

TArray<AActor*> UPrimordiaCognitionSubsystem::FindActors(const FString& TagOrName) const
{
	TArray<AActor*> Out;
	UWorld* World = GetWorld();
	if (!World || TagOrName.IsEmpty())
	{
		return Out;
	}
	const FName Tag(*TagOrName);
	for (TActorIterator<AActor> It(World); It; ++It)
	{
		if (IsValid(*It) && (It->ActorHasTag(Tag) || It->GetActorNameOrLabel() == TagOrName || It->GetName() == TagOrName))
		{
			Out.Add(*It);
		}
	}
	return Out;
}

FSpellwrightStepResult UPrimordiaCognitionSubsystem::ExecuteWorldStep(const FSpellwrightStep& Step)
{
	UWorld* World = GetWorld();
	if (!World)
	{
		return FSpellwrightStepResult::Failure(TEXT("no world"));
	}
	const FString Op = Step.Op.ToString();
	auto Vec = [&Step](const TCHAR* Key, FVector& Out) -> bool
	{
		const FString V = Step.GetArg(Key);
		return !V.IsEmpty() && FSpellwrightOpRegistry::ParseVector(V, Out);
	};

	if (Op == TEXT("world.spawn"))
	{
		UClass* Class = LoadActorClass(Step.GetArg(TEXT("class")));
		if (!Class)
		{
			return FSpellwrightStepResult::Failure(FString::Printf(TEXT("no actor class at %s"), *Step.GetArg(TEXT("class"))));
		}
		FVector At = FVector::ZeroVector, RotV = FVector::ZeroVector, Scale = FVector::OneVector;
		FVector Row = FVector::ForwardVector;
		const FString AtText = Step.GetArg(TEXT("at"));
		if (AtText.Equals(TEXT("player"), ESearchCase::IgnoreCase))
		{
			// Six metres in front of the player, 1.5 m up, in a row across their view.
			const APlayerController* PC = World->GetFirstPlayerController();
			const APawn* Pawn = PC ? PC->GetPawn() : nullptr;
			if (!Pawn)
			{
				return FSpellwrightStepResult::Failure(TEXT("at=player needs a player in the world (press Play)"));
			}
			const FRotator Yaw(0.f, PC->GetControlRotation().Yaw, 0.f);
			At = Pawn->GetActorLocation() + Yaw.Vector() * 600.0 + FVector(0, 0, 150);
			Row = FRotationMatrix(Yaw).GetUnitAxis(EAxis::Y);
		}
		else if (!AtText.IsEmpty() && !Vec(TEXT("at"), At))
		{
			return FSpellwrightStepResult::Failure(FString::Printf(TEXT("at=%s should be x,y,z or player"), *AtText));
		}
		Vec(TEXT("rotation"), RotV);
		Vec(TEXT("scale"), Scale);
		const int32 Count = FMath::Clamp(FCString::Atoi(*Step.GetArg(TEXT("count"), TEXT("1"))), 1, 256);
		const double Spacing = FCString::Atod(*Step.GetArg(TEXT("spacing"), TEXT("300")));
		const FName Tag(*Step.GetArg(TEXT("tag"), TEXT("Primordia.Manifest")));
		TArray<FString> Names;
		for (int32 i = 0; i < Count; ++i)
		{
			FActorSpawnParameters Params;
			Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;
			// Centre the row on At.
			const FVector Location = At + Row * Spacing * (i - (Count - 1) * 0.5);
			AActor* Actor = World->SpawnActor<AActor>(Class, Location, FRotator(RotV.X, RotV.Y, RotV.Z), Params);
			if (!Actor)
			{
				continue;
			}
			Actor->SetActorScale3D(Scale);
			Actor->Tags.AddUnique(Tag);
			Actor->Tags.AddUnique(TEXT("Primordia.Spawned"));
#if WITH_EDITOR
			const FString Label = Step.GetArg(TEXT("label"));
			if (!Label.IsEmpty()) { Actor->SetActorLabel(Count > 1 ? FString::Printf(TEXT("%s_%d"), *Label, i + 1) : Label); }
#endif
			Names.Add(Actor->GetName());
		}
		if (Names.Num() == 0)
		{
			return FSpellwrightStepResult::Failure(FString::Printf(TEXT("%s could not be spawned"), *Class->GetName()));
		}
		FSpellwrightStepResult R = FSpellwrightStepResult::Success(FString::Printf(TEXT("spawned %d %s"), Names.Num(), *Class->GetName()));
		R.Outputs.Add(TEXT("actors"), FString::Join(Names, TEXT(",")));
		R.Outputs.Add(TEXT("count"), FString::FromInt(Names.Num()));
		R.Outputs.Add(TEXT("tag"), Tag.ToString());
		return R;
	}

	if (Op == TEXT("world.destroy"))
	{
		const int32 Limit = FMath::Max(1, FCString::Atoi(*Step.GetArg(TEXT("limit"), TEXT("64"))));
		int32 Destroyed = 0;
		const FName Tag(*Step.Target);
		for (AActor* Actor : FindActors(Step.Target))
		{
			// Only actors that explicitly carry the tag, never the player or the game framework.
			if (Destroyed >= Limit || !Actor->ActorHasTag(Tag) || IsProtectedActor(Actor))
			{
				continue;
			}
			Actor->Destroy();
			++Destroyed;
		}
		FSpellwrightStepResult R = FSpellwrightStepResult::Success(FString::Printf(TEXT("unmade %d actors tagged %s"), Destroyed, *Step.Target));
		R.Outputs.Add(TEXT("count"), FString::FromInt(Destroyed));
		return R;
	}

	const TArray<AActor*> Targets = FindActors(Step.Target);
	if (Op == TEXT("world.tag"))
	{
		const FString Add = Step.GetArg(TEXT("add")), Remove = Step.GetArg(TEXT("remove"));
		for (AActor* A : Targets)
		{
			if (!Add.IsEmpty()) { A->Tags.AddUnique(FName(*Add)); }
			if (!Remove.IsEmpty()) { A->Tags.Remove(FName(*Remove)); }
		}
		FSpellwrightStepResult R = FSpellwrightStepResult::Success(FString::Printf(TEXT("retagged %d actors"), Targets.Num()));
		R.Outputs.Add(TEXT("count"), FString::FromInt(Targets.Num()));
		return R;
	}
	if (Op == TEXT("world.move"))
	{
		FVector To, By, RotV;
		const bool bTo = Vec(TEXT("to"), To), bBy = Vec(TEXT("by"), By), bRot = Vec(TEXT("rotation"), RotV);
		for (AActor* A : Targets)
		{
			if (IsProtectedActor(A)) { continue; }
			if (bTo) { A->SetActorLocation(To); }
			if (bBy) { A->AddActorWorldOffset(By); }
			if (bRot) { A->SetActorRotation(FRotator(RotV.X, RotV.Y, RotV.Z)); }
		}
		FSpellwrightStepResult R = FSpellwrightStepResult::Success(FString::Printf(TEXT("moved %d actors"), Targets.Num()));
		R.Outputs.Add(TEXT("count"), FString::FromInt(Targets.Num()));
		return R;
	}
	if (Op == TEXT("world.light"))
	{
		FVector Color;
		const bool bColor = Vec(TEXT("color"), Color);
		const FString Intensity = Step.GetArg(TEXT("intensity")), ScaleText = Step.GetArg(TEXT("scale"));
		int32 Lights = 0;
		for (AActor* A : Targets)
		{
			TArray<ULightComponent*> Components;
			A->GetComponents<ULightComponent>(Components);
			for (ULightComponent* L : Components)
			{
				if (!Intensity.IsEmpty()) { L->SetIntensity(FCString::Atof(*Intensity)); }
				if (!ScaleText.IsEmpty()) { L->SetIntensity(L->Intensity * FCString::Atof(*ScaleText)); }
				if (bColor) { L->SetLightColor(FLinearColor(Color.X, Color.Y, Color.Z)); }
				++Lights;
			}
		}
		if (Lights == 0)
		{
			return FSpellwrightStepResult::Failure(FString::Printf(TEXT("no lights on actors matching %s"), *Step.Target));
		}
		FSpellwrightStepResult R = FSpellwrightStepResult::Success(FString::Printf(TEXT("relit %d lights"), Lights));
		R.Outputs.Add(TEXT("count"), FString::FromInt(Lights));
		return R;
	}
	if (Op == TEXT("world.log"))
	{
		const FString Message = Step.GetArg(TEXT("message"));
		UE_LOG(LogCognition, Display, TEXT("%s"), *Message);
		Memory.Remember(TEXT("action"), Message, {TEXT("log")}, 0.4f);
		return FSpellwrightStepResult::Success(Message);
	}
	return FSpellwrightStepResult::Failure(FString::Printf(TEXT("unknown world op %s"), *Op));
}

FSpellwrightStepResult UPrimordiaCognitionSubsystem::ExecuteLoreStep(const FSpellwrightStep& Step)
{
	UPrimordiaLoreSubsystem* Lore = UPrimordiaLoreSubsystem::Get();
	if (!Lore)
	{
		return FSpellwrightStepResult::Failure(TEXT("the Lore engine is not loaded"));
	}
	const FString Op = Step.Op.ToString();
	if (Op == TEXT("lore.record"))
	{
		FLoreEvent Event;
		Event.Title = Step.GetArg(TEXT("title"));
		Event.Account = Step.GetArg(TEXT("account"));
		Event.Realm = FName(*Step.GetArg(TEXT("realm"), Realm.ToString()));
		if (!Lore->GetCodex().FindRealm(Event.Realm)) { Event.Realm = NAME_None; }
		Event.StabilityShift = FCString::Atof(*Step.GetArg(TEXT("stability"), TEXT("0")));
		Event.Id = FName(*FString::Printf(TEXT("record_%s"), *FGuid::NewGuid().ToString(EGuidFormats::Digits).Left(12).ToLower()));
		Lore->RecordEvent(Event);
		FSpellwrightStepResult R = FSpellwrightStepResult::Success(FString::Printf(TEXT("recorded \"%s\""), *Event.Title));
		R.Outputs.Add(TEXT("event"), Event.Id.ToString());
		return R;
	}
	if (Op == TEXT("lore.evolve"))
	{
		const int32 Eras = FMath::Clamp(FCString::Atoi(*Step.GetArg(TEXT("eras"), TEXT("1"))), 1, 100);
		const TArray<FLoreEvent> Events = Lore->Evolve(Eras);
		TArray<FString> Titles;
		for (const FLoreEvent& E : Events) { Titles.Add(E.Title); }
		FSpellwrightStepResult R = FSpellwrightStepResult::Success(FString::Printf(TEXT("%d eras passed; %d events"), Eras, Events.Num()));
		R.Outputs.Add(TEXT("era"), FString::FromInt(Lore->GetEra()));
		R.Outputs.Add(TEXT("events"), FString::Join(Titles, TEXT("; ")));
		return R;
	}
	if (Op == TEXT("lore.inscribe"))
	{
		const FString Text = Step.GetArg(TEXT("text"));
		const FLoreCodex& Codex = Lore->GetCodex();
		const TArray<FName> Glyphs = Codex.Inscribe(Text);
		TArray<FString> Ids, Names, Sigils;
		for (const FName& G : Glyphs)
		{
			Ids.Add(G.ToString());
			if (const FLoreGlyph* Glyph = Codex.FindGlyph(G)) { Names.Add(Glyph->Name); }
		}
		for (const FName& S : Codex.FindSigilsIn(Glyphs)) { Sigils.Add(S.ToString()); }
		FSpellwrightStepResult R = FSpellwrightStepResult::Success(FString::Join(Names, TEXT(" ")));
		R.Outputs.Add(TEXT("glyphs"), FString::Join(Names, TEXT(" ")));
		R.Outputs.Add(TEXT("glyph_ids"), FString::Join(Ids, TEXT(",")));
		R.Outputs.Add(TEXT("sigils"), FString::Join(Sigils, TEXT(",")));
		R.Outputs.Add(TEXT("meaning"), Codex.Translate(Glyphs));
		return R;
	}
	return FSpellwrightStepResult::Failure(FString::Printf(TEXT("unknown lore op %s"), *Op));
}

FSpellwrightStepResult UPrimordiaCognitionSubsystem::ExecutePipelineStep(const FSpellwrightStep& Step, FSpellwrightStepCallback OnComplete)
{
	UPrimordiaBoltBridgeSubsystem* Bolt = UPrimordiaBoltBridgeSubsystem::Get();
	if (!Bolt)
	{
		return FSpellwrightStepResult::Failure(TEXT("the Bolt bridge is not loaded"));
	}
	FName Kind = Step.Op;
	TSharedRef<FJsonObject> Payload = MakeShared<FJsonObject>();
	if (Step.Op == TEXT("bolt.submit"))
	{
		Kind = FName(*Step.GetArg(TEXT("kind")));
		const FString PayloadText = Step.GetArg(TEXT("payload"), TEXT("{}"));
		TSharedPtr<FJsonObject> Parsed;
		if (!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(PayloadText), Parsed) || !Parsed.IsValid())
		{
			return FSpellwrightStepResult::Failure(TEXT("payload must be a JSON object"));
		}
		Payload = Parsed.ToSharedRef();
	}
	else
	{
		for (const TPair<FString, FString>& Arg : Step.Args)
		{
			Payload->SetStringField(Arg.Key, Arg.Value);
		}
		if (!Step.Target.IsEmpty())
		{
			Payload->SetStringField(TEXT("target"), Step.Target);
		}
	}
	const FString JobId = Bolt->SubmitJob(Kind, Payload, FGuid(), [OnComplete](const FBoltJob& Done)
	{
		if (OnComplete) { OnComplete(FromBoltJob(Done)); }
	});
	return FSpellwrightStepResult::PendingJob(JobId, FString::Printf(TEXT("Bolt %s"), *Kind.ToString()));
}
