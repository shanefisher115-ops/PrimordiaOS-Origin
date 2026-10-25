#include "SpellwrightValidator.h"

#include "SpellwrightOps.h"

namespace
{
	void Add(TArray<FSpellwrightIssue>& Issues, ESpellwrightIssueSeverity Severity, int32 Step, const FString& Message)
	{
		FSpellwrightIssue& I = Issues.AddDefaulted_GetRef();
		I.Severity = Severity;
		I.StepIndex = Step;
		I.Message = Message;
	}

	bool IsIdentifier(const FString& S)
	{
		if (S.IsEmpty() || !(FChar::IsAlpha(S[0]) || S[0] == '_'))
		{
			return false;
		}
		for (const TCHAR C : S)
		{
			if (!(FChar::IsAlnum(C) || C == '_' || C == '-'))
			{
				return false;
			}
		}
		return true;
	}

	FString TypeName(ESpellwrightArgType T)
	{
		switch (T)
		{
		case ESpellwrightArgType::String: return TEXT("text");
		case ESpellwrightArgType::Number: return TEXT("a number");
		case ESpellwrightArgType::Integer: return TEXT("an integer");
		case ESpellwrightArgType::Bool: return TEXT("true/false");
		case ESpellwrightArgType::Vector: return TEXT("a vector x,y,z");
		case ESpellwrightArgType::Size: return TEXT("a size AxB or AxBxC");
		case ESpellwrightArgType::Path: return TEXT("a path");
		case ESpellwrightArgType::Json: return TEXT("JSON");
		}
		return TEXT("?");
	}
}

bool FSpellwrightValidator::HasErrors(const TArray<FSpellwrightIssue>& Issues)
{
	return Issues.ContainsByPredicate([](const FSpellwrightIssue& I) { return I.Severity == ESpellwrightIssueSeverity::Error; });
}

TArray<TPair<FName, FString>> FSpellwrightValidator::FindReferences(const FString& Value)
{
	TArray<TPair<FName, FString>> Out;
	int32 From = 0;
	while ((From = Value.Find(TEXT("${"), ESearchCase::CaseSensitive, ESearchDir::FromStart, From)) != INDEX_NONE)
	{
		const int32 Close = Value.Find(TEXT("}"), ESearchCase::CaseSensitive, ESearchDir::FromStart, From);
		if (Close == INDEX_NONE)
		{
			break;
		}
		const FString Inner = Value.Mid(From + 2, Close - From - 2);
		FString Label, Key;
		if (Inner.Split(TEXT("."), &Label, &Key))
		{
			Out.Emplace(FName(*Label), Key);
		}
		From = Close + 1;
	}
	return Out;
}

bool FSpellwrightValidator::TopologicalOrder(const FSpellwrightSpell& Spell, TArray<int32>& OutOrder)
{
	const int32 N = Spell.Steps.Num();
	TArray<int32> InDegree;
	InDegree.Init(0, N);
	TArray<TArray<int32>> Dependents;
	Dependents.SetNum(N);
	for (int32 i = 0; i < N; ++i)
	{
		for (const FName& Dep : Spell.Steps[i].After)
		{
			const int32 j = Spell.FindStep(Dep);
			if (j != INDEX_NONE && j != i)
			{
				Dependents[j].Add(i);
				++InDegree[i];
			}
		}
	}
	OutOrder.Reset();
	TArray<int32> Ready;
	for (int32 i = N - 1; i >= 0; --i)
	{
		if (InDegree[i] == 0) { Ready.Add(i); }
	}
	while (Ready.Num() > 0)
	{
		const int32 i = Ready.Pop(EAllowShrinking::No);
		OutOrder.Add(i);
		for (const int32 d : Dependents[i])
		{
			if (--InDegree[d] == 0) { Ready.Add(d); }
		}
	}
	return OutOrder.Num() == N;
}

TArray<FSpellwrightIssue> FSpellwrightValidator::Validate(const FSpellwrightSpell& Spell) const
{
	TArray<FSpellwrightIssue> Issues;
	using ESev = ESpellwrightIssueSeverity;

	if (!IsIdentifier(Spell.Name.ToString()))
	{
		Add(Issues, ESev::Error, INDEX_NONE, FString::Printf(TEXT("spell name '%s' is not an identifier"), *Spell.Name.ToString()));
	}
	if (Spell.Steps.Num() == 0)
	{
		Add(Issues, ESev::Error, INDEX_NONE, TEXT("a spell needs at least one step"));
	}
	if (Spell.Steps.Num() > MaxSteps)
	{
		Add(Issues, ESev::Error, INDEX_NONE, FString::Printf(TEXT("%d steps exceeds the limit of %d"), Spell.Steps.Num(), MaxSteps));
	}

	TSet<FName> Labels;
	for (int32 i = 0; i < Spell.Steps.Num(); ++i)
	{
		const FSpellwrightStep& Step = Spell.Steps[i];
		if (!Step.Label.IsNone())
		{
			if (Labels.Contains(Step.Label))
			{
				Add(Issues, ESev::Error, i, FString::Printf(TEXT("label '%s' is used twice"), *Step.Label.ToString()));
			}
			Labels.Add(Step.Label);
		}
	}

	const FSpellwrightOpRegistry& Registry = FSpellwrightOpRegistry::Get();
	for (int32 i = 0; i < Spell.Steps.Num(); ++i)
	{
		const FSpellwrightStep& Step = Spell.Steps[i];
		const FSpellwrightOpSpec* Spec = Registry.Find(Step.Op);
		if (!Spec)
		{
			Add(Issues, ESev::Error, i, FString::Printf(TEXT("unknown op '%s'"), *Step.Op.ToString()));
			continue;
		}
		if (Spec->bTargetRequired && Step.Target.IsEmpty())
		{
			Add(Issues, ESev::Error, i, FString::Printf(TEXT("%s needs a target"), *Step.Op.ToString()));
		}
		for (const FSpellwrightArgSpec& Arg : Spec->Args)
		{
			const FString* Value = Step.Args.Find(Arg.Name);
			if (!Value)
			{
				if (Arg.bRequired)
				{
					Add(Issues, ESev::Error, i, FString::Printf(TEXT("%s needs argument '%s'"), *Step.Op.ToString(), *Arg.Name));
				}
				continue;
			}
			if (!FSpellwrightOpRegistry::ValueMatches(*Value, Arg.Type))
			{
				Add(Issues, ESev::Error, i, FString::Printf(TEXT("%s=%s should be %s"), *Arg.Name, **Value, *TypeName(Arg.Type)));
			}
			else if (Arg.Choices.Num() > 0 && !Value->Contains(TEXT("${")) && !Arg.Choices.Contains(Value->ToLower()))
			{
				Add(Issues, ESev::Error, i, FString::Printf(TEXT("%s=%s is not one of %s"), *Arg.Name, **Value, *FString::Join(Arg.Choices, TEXT(", "))));
			}
		}
		for (const TPair<FString, FString>& Given : Step.Args)
		{
			if (!Spec->FindArg(Given.Key))
			{
				Add(Issues, bUnknownArgsAreErrors ? ESev::Error : ESev::Warning, i,
					FString::Printf(TEXT("%s has no argument '%s'"), *Step.Op.ToString(), *Given.Key));
			}
		}
		for (const FName& Dep : Step.After)
		{
			const int32 j = Spell.FindStep(Dep);
			if (j == INDEX_NONE)
			{
				Add(Issues, ESev::Error, i, FString::Printf(TEXT("depends on unknown step '%s'"), *Dep.ToString()));
			}
			else if (j == i)
			{
				Add(Issues, ESev::Error, i, TEXT("a step cannot depend on itself"));
			}
		}
	}

	TArray<int32> Order;
	if (!TopologicalOrder(Spell, Order))
	{
		Add(Issues, ESev::Error, INDEX_NONE, TEXT("the step dependencies form a cycle"));
		return Issues;
	}

	// ${label.key} must name a step this one (transitively) waits for, or the value may not exist yet.
	TArray<TSet<int32>> Ancestors;
	Ancestors.SetNum(Spell.Steps.Num());
	for (const int32 i : Order)
	{
		for (const FName& Dep : Spell.Steps[i].After)
		{
			const int32 j = Spell.FindStep(Dep);
			if (j != INDEX_NONE)
			{
				Ancestors[i].Add(j);
				Ancestors[i].Append(Ancestors[j]);
			}
		}
	}
	for (int32 i = 0; i < Spell.Steps.Num(); ++i)
	{
		const FSpellwrightStep& Step = Spell.Steps[i];
		TArray<FString> Values;
		Step.Args.GenerateValueArray(Values);
		Values.Add(Step.Target);
		for (const FString& V : Values)
		{
			for (const TPair<FName, FString>& Ref : FindReferences(V))
			{
				const int32 j = Spell.FindStep(Ref.Key);
				if (j == INDEX_NONE)
				{
					Add(Issues, ESev::Error, i, FString::Printf(TEXT("${%s.%s} names no step"), *Ref.Key.ToString(), *Ref.Value));
				}
				else if (!Ancestors[i].Contains(j))
				{
					Add(Issues, ESev::Error, i, FString::Printf(TEXT("${%s.%s} is used without 'after %s'"), *Ref.Key.ToString(), *Ref.Value, *Ref.Key.ToString()));
				}
			}
		}
	}
	return Issues;
}
