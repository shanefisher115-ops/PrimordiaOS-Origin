#include "PrimordiaPlanner.h"

#include "Dom/JsonObject.h"
#include "JsonObjectConverter.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

namespace
{
	bool Truthy(const FString& V)
	{
		const FString L = V.ToLower();
		return !(L.IsEmpty() || L == TEXT("false") || L == TEXT("0") || L == TEXT("no") || L == TEXT("none"));
	}

	template <typename T>
	bool ReadStructArray(const FString& Json, const TCHAR* Field, TArray<T>& Out, FString& Error)
	{
		TSharedPtr<FJsonObject> Root;
		if (!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Json), Root) || !Root.IsValid())
		{
			Error = TEXT("not valid JSON");
			return false;
		}
		const TArray<TSharedPtr<FJsonValue>>* Values = nullptr;
		if (!Root->TryGetArrayField(Field, Values))
		{
			Error = FString::Printf(TEXT("no \"%s\" array"), Field);
			return false;
		}
		for (int32 i = 0; i < Values->Num(); ++i)
		{
			const TSharedPtr<FJsonObject>* Obj = nullptr;
			T Item;
			if (!(*Values)[i]->TryGetObject(Obj) || !FJsonObjectConverter::JsonObjectToUStruct(Obj->ToSharedRef(), &Item, 0, 0))
			{
				Error = FString::Printf(TEXT("%s[%d] is malformed"), Field, i);
				return false;
			}
			Out.Add(MoveTemp(Item));
		}
		return true;
	}
}

bool FPrimordiaPlanner::LoadMethodsFromJson(const FString& Json, FString& OutError)
{
	TArray<FPrimordiaMethod> Loaded;
	if (!ReadStructArray(Json, TEXT("methods"), Loaded, OutError))
	{
		return false;
	}
	Methods = MoveTemp(Loaded);
	return true;
}

bool FPrimordiaPlanner::LoadTriggersFromJson(const FString& Json, TArray<FPrimordiaTrigger>& OutTriggers, FString& OutError) const
{
	return ReadStructArray(Json, TEXT("triggers"), OutTriggers, OutError);
}

TArray<FString> FPrimordiaPlanner::GetCompoundTasks() const
{
	TArray<FString> Tasks;
	for (const FPrimordiaMethod& M : Methods) { Tasks.AddUnique(M.Task); }
	Tasks.Sort();
	return Tasks;
}

bool FPrimordiaPlanner::IsKnownTask(const FString& Task) const
{
	return Task.StartsWith(TEXT("intent:")) || Task == TEXT("noop") || Methods.ContainsByPredicate([&](const FPrimordiaMethod& M) { return M.Task == Task; });
}

FString FPrimordiaPlanner::Substitute(const FString& Text, const TMap<FString, FString>& Facts, const TMap<FString, FString>& Params)
{
	FString Out;
	int32 i = 0;
	while (i < Text.Len())
	{
		const int32 Open = Text.Find(TEXT("${"), ESearchCase::CaseSensitive, ESearchDir::FromStart, i);
		if (Open == INDEX_NONE)
		{
			Out += Text.Mid(i);
			break;
		}
		const int32 Close = Text.Find(TEXT("}"), ESearchCase::CaseSensitive, ESearchDir::FromStart, Open);
		if (Close == INDEX_NONE)
		{
			Out += Text.Mid(i);
			break;
		}
		Out += Text.Mid(i, Open - i);
		const FString Name = Text.Mid(Open + 2, Close - Open - 2);
		if (Name.StartsWith(TEXT("fact:")))
		{
			Out += Facts.FindRef(Name.Mid(5));
		}
		else if (const FString* P = Params.Find(Name))
		{
			Out += *P;
		}
		else
		{
			// Unknown names stay as written: later stages (Spellwright templates, step outputs) fill them.
			Out += Text.Mid(Open, Close - Open + 1);
		}
		i = Close + 1;
	}
	return Out;
}

bool FPrimordiaPlanner::EvaluateAtom(const FString& InAtom, const TMap<FString, FString>& Facts, const TMap<FString, FString>& Params)
{
	const FString Atom = Substitute(InAtom, Facts, Params).TrimStartAndEnd();
	if (Atom.IsEmpty() || Atom == TEXT("true")) { return true; }
	if (Atom == TEXT("false")) { return false; }
	if (Atom.StartsWith(TEXT("!exists "))) { return !Facts.Contains(Atom.Mid(8).TrimStartAndEnd()); }
	if (Atom.StartsWith(TEXT("exists "))) { return Facts.Contains(Atom.Mid(7).TrimStartAndEnd()); }

	static const TCHAR* Ops[] = {TEXT(">="), TEXT("<="), TEXT("=="), TEXT("!="), TEXT(">"), TEXT("<")};
	for (const TCHAR* Op : Ops)
	{
		const int32 At = Atom.Find(Op);
		if (At == INDEX_NONE)
		{
			continue;
		}
		const FString Key = Atom.Left(At).TrimStartAndEnd();
		FString Rhs = Atom.Mid(At + FCString::Strlen(Op)).TrimStartAndEnd().TrimQuotes();
		const FString* Lhs = Facts.Find(Key);
		const FString LhsText = Lhs ? *Lhs : FString();
		const bool bNumeric = Lhs && FCString::IsNumeric(*LhsText) && FCString::IsNumeric(*Rhs);
		const FString OpS(Op);
		if (bNumeric)
		{
			const double A = FCString::Atod(*LhsText), B = FCString::Atod(*Rhs);
			if (OpS == TEXT(">=")) { return A >= B; }
			if (OpS == TEXT("<=")) { return A <= B; }
			if (OpS == TEXT("==")) { return FMath::IsNearlyEqual(A, B); }
			if (OpS == TEXT("!=")) { return !FMath::IsNearlyEqual(A, B); }
			if (OpS == TEXT(">")) { return A > B; }
			return A < B;
		}
		// A missing numeric fact compares as 0 so "tag.X < 3" holds before any X exists.
		if (!Lhs && FCString::IsNumeric(*Rhs) && OpS != TEXT("==") && OpS != TEXT("!="))
		{
			const double B = FCString::Atod(*Rhs);
			if (OpS == TEXT(">=")) { return 0.0 >= B; }
			if (OpS == TEXT("<=")) { return 0.0 <= B; }
			if (OpS == TEXT(">")) { return 0.0 > B; }
			return 0.0 < B;
		}
		if (OpS == TEXT("==")) { return Lhs ? LhsText.Equals(Rhs, ESearchCase::IgnoreCase) : Rhs.IsEmpty(); }
		if (OpS == TEXT("!=")) { return Lhs ? !LhsText.Equals(Rhs, ESearchCase::IgnoreCase) : !Rhs.IsEmpty(); }
		return false; // ordering on non-numbers
	}
	if (Atom.StartsWith(TEXT("!")))
	{
		const FString* V = Facts.Find(Atom.Mid(1).TrimStartAndEnd());
		return !(V && Truthy(*V));
	}
	const FString* V = Facts.Find(Atom);
	return V && Truthy(*V);
}

bool FPrimordiaPlanner::Evaluate(const FString& Expression, const TMap<FString, FString>& Facts, const TMap<FString, FString>& Params)
{
	TArray<FString> Ors;
	Expression.ParseIntoArray(Ors, TEXT("||"), true);
	if (Ors.Num() == 0)
	{
		return true;
	}
	for (const FString& Or : Ors)
	{
		TArray<FString> Ands;
		Or.ParseIntoArray(Ands, TEXT("&&"), true);
		bool bAll = true;
		for (const FString& And : Ands)
		{
			if (!EvaluateAtom(And, Facts, Params))
			{
				bAll = false;
				break;
			}
		}
		if (bAll)
		{
			return true;
		}
	}
	return false;
}

bool FPrimordiaPlanner::Decompose(const FString& Task, const TMap<FString, FString>& Params, TMap<FString, FString>& State, int32 Depth, FPrimordiaPlan& Out) const
{
	if (Depth > MaxDepth)
	{
		Out.Error = FString::Printf(TEXT("task %s recursed past depth %d"), *Task, MaxDepth);
		return false;
	}
	if (Task == TEXT("noop"))
	{
		return true;
	}
	if (Task.StartsWith(TEXT("intent:")))
	{
		FSpellwrightIntent Intent;
		Intent.Verb = FName(*Task.Mid(7));
		for (const TPair<FString, FString>& P : Params)
		{
			if (P.Key == TEXT("subject")) { Intent.Subject = P.Value; }
			else if (P.Key == TEXT("realm")) { Intent.Realm = FName(*P.Value); }
			else if (P.Key == TEXT("priority")) { Intent.Priority = FCString::Atoi(*P.Value); }
			else { Intent.Params.Add(P.Key, P.Value); }
		}
		Out.Intents.Add(Intent);
		return true;
	}

	bool bAnyMethod = false;
	for (const FPrimordiaMethod& M : Methods)
	{
		if (M.Task != Task)
		{
			continue;
		}
		bAnyMethod = true;
		bool bApplicable = true;
		for (const FString& Pre : M.Preconditions)
		{
			if (!Evaluate(Pre, State, Params))
			{
				bApplicable = false;
				break;
			}
		}
		if (!bApplicable)
		{
			continue;
		}

		// Plan the subtasks against a copy, so a failed method leaves no trace.
		TMap<FString, FString> Trial = State;
		FPrimordiaPlan Partial;
		bool bOk = true;
		for (const FPrimordiaSubtask& Sub : M.Subtasks)
		{
			TMap<FString, FString> SubParams;
			for (const TPair<FString, FString>& P : Sub.Params)
			{
				const FString Value = Substitute(P.Value, Trial, Params);
				// A param the goal never supplied ("${at}" left as written) is dropped, so the spell
				// template's own default applies instead of a dangling placeholder.
				if (Value.StartsWith(TEXT("${")) && Value.EndsWith(TEXT("}")) && !Value.Contains(TEXT(".")))
				{
					continue;
				}
				SubParams.Add(P.Key, Value);
			}
			// Parameters flow down: a subtask sees its parent's params unless it overrides them.
			for (const TPair<FString, FString>& P : Params)
			{
				if (!SubParams.Contains(P.Key)) { SubParams.Add(P.Key, P.Value); }
			}
			if (!Decompose(Substitute(Sub.Task, Trial, Params), SubParams, Trial, Depth + 1, Partial))
			{
				bOk = false;
				break;
			}
			for (const FString& Effect : Sub.Effects)
			{
				FString Key, Value;
				if (Substitute(Effect, Trial, SubParams).Split(TEXT("="), &Key, &Value))
				{
					Trial.Add(Key.TrimStartAndEnd(), Value.TrimStartAndEnd());
				}
			}
		}
		if (bOk)
		{
			State = MoveTemp(Trial);
			Out.Intents.Append(Partial.Intents);
			Out.Trace.Add(FString::Printf(TEXT("%s via %s"), *Task, *M.Name));
			Out.Trace.Append(Partial.Trace);
			return true;
		}
		if (!Partial.Error.IsEmpty())
		{
			Out.Error = Partial.Error;
		}
	}
	if (Out.Error.IsEmpty())
	{
		Out.Error = bAnyMethod ? FString::Printf(TEXT("no method for %s applies now"), *Task) : FString::Printf(TEXT("unknown task %s"), *Task);
	}
	return false;
}

FPrimordiaPlan FPrimordiaPlanner::Plan(const FPrimordiaGoal& Goal, const TMap<FString, FString>& Facts) const
{
	FPrimordiaPlan Out;
	TMap<FString, FString> State = Facts;
	Out.bSuccess = Decompose(Goal.Task, Goal.Params, State, 0, Out);
	if (Out.bSuccess)
	{
		Out.Error.Reset();
		for (FSpellwrightIntent& I : Out.Intents)
		{
			I.GoalId = Goal.Id;
			if (I.Priority == 0) { I.Priority = Goal.Priority; }
			I.Provenance = Goal.Source.StartsWith(TEXT("model")) ? TEXT("model") : (Goal.Source == TEXT("user") ? TEXT("user") : TEXT("planner"));
			I.Rationale = Goal.Description;
		}
	}
	else
	{
		Out.Intents.Reset();
	}
	return Out;
}
