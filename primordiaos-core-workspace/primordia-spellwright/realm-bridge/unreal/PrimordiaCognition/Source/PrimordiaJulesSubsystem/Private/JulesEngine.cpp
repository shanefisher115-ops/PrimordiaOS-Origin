#include "JulesEngine.h"

#include "Dom/JsonObject.h"
#include "HAL/FileManager.h"
#include "JsonObjectConverter.h"
#include "LoreCodex.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "SpellwrightOps.h"

namespace
{
	const TCHAR* SeverityName(EJulesSeverity S)
	{
		switch (S)
		{
		case EJulesSeverity::Info: return TEXT("info");
		case EJulesSeverity::Warning: return TEXT("warning");
		case EJulesSeverity::Error: return TEXT("error");
		case EJulesSeverity::Fatal: return TEXT("fatal");
		}
		return TEXT("?");
	}

	bool MatchesAny(const TArray<FString>& Patterns, const FString& Text)
	{
		for (const FString& P : Patterns)
		{
			if (FJulesEngine::WildcardMatch(P, Text))
			{
				return true;
			}
		}
		return false;
	}

	FName StepSchool(const FSpellwrightStep& Step)
	{
		const FSpellwrightOpSpec* Spec = FSpellwrightOpRegistry::Get().Find(Step.Op);
		return Spec ? Spec->School : NAME_None;
	}

	bool IsPipelineStep(const FSpellwrightStep& Step)
	{
		const FSpellwrightOpSpec* Spec = FSpellwrightOpRegistry::Get().Find(Step.Op);
		return Spec && Spec->bPipeline;
	}
}

FString FJulesReport::Summary() const
{
	if (Violations.Num() == 0)
	{
		return FString::Printf(TEXT("%s approved (%d rules)"), *SpellName.ToString(), RulesEvaluated);
	}
	TArray<FString> Lines;
	for (const FJulesViolation& V : Violations)
	{
		Lines.Add(FString::Printf(TEXT("[%s] %s%s: %s"), SeverityName(V.Severity), *V.RuleId.ToString(),
			V.StepIndex == INDEX_NONE ? TEXT("") : *FString::Printf(TEXT(" (step %d)"), V.StepIndex + 1), *V.Message));
	}
	return FString::Printf(TEXT("%s %s: %s"), *SpellName.ToString(), bApproved ? TEXT("approved with notes") : TEXT("rejected"), *FString::Join(Lines, TEXT("; ")));
}

bool FJulesEngine::WildcardMatch(const FString& Pattern, const FString& Text)
{
	if (Pattern.IsEmpty() || Pattern == TEXT("*"))
	{
		return true;
	}
	// "a|b" matches either alternative.
	TArray<FString> Alternatives;
	Pattern.ParseIntoArray(Alternatives, TEXT("|"), true);
	for (const FString& Alt : Alternatives)
	{
		if (Text.MatchesWildcard(Alt.TrimStartAndEnd(), ESearchCase::IgnoreCase))
		{
			return true;
		}
	}
	return false;
}

bool FJulesEngine::LoadRulesFromJson(const FString& Json, FString& OutError)
{
	TSharedPtr<FJsonObject> Root;
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Json);
	if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
	{
		OutError = FString::Printf(TEXT("rules are not valid JSON: %s"), *Reader->GetErrorMessage());
		return false;
	}
	const TArray<TSharedPtr<FJsonValue>>* Values = nullptr;
	if (!Root->TryGetArrayField(TEXT("rules"), Values))
	{
		OutError = TEXT("rules file has no \"rules\" array");
		return false;
	}
	TArray<FJulesRule> Loaded;
	for (int32 i = 0; i < Values->Num(); ++i)
	{
		const TSharedPtr<FJsonObject>* Obj = nullptr;
		FJulesRule Rule;
		if (!(*Values)[i]->TryGetObject(Obj) || !FJsonObjectConverter::JsonObjectToUStruct(Obj->ToSharedRef(), &Rule, 0, 0))
		{
			OutError = FString::Printf(TEXT("rules[%d] is not a valid rule"), i);
			return false;
		}
		Loaded.Add(MoveTemp(Rule));
	}
	Rules = MoveTemp(Loaded);
	RateHistory.Reset();
	return true;
}

FString FJulesEngine::SaveRulesToJson() const
{
	TArray<TSharedPtr<FJsonValue>> Values;
	for (const FJulesRule& Rule : Rules)
	{
		TSharedRef<FJsonObject> Obj = MakeShared<FJsonObject>();
		FJsonObjectConverter::UStructToJsonObject(FJulesRule::StaticStruct(), &Rule, Obj, 0, 0);
		Values.Add(MakeShared<FJsonValueObject>(Obj));
	}
	TSharedRef<FJsonObject> Root = MakeShared<FJsonObject>();
	Root->SetArrayField(TEXT("rules"), Values);
	FString Out;
	const TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Out);
	FJsonSerializer::Serialize(Root, Writer);
	return Out;
}

void FJulesEngine::AddRule(const FJulesRule& Rule)
{
	RemoveRule(Rule.Id);
	Rules.Add(Rule);
}

bool FJulesEngine::RemoveRule(FName Id)
{
	return Rules.RemoveAll([Id](const FJulesRule& R) { return R.Id == Id; }) > 0;
}

void FJulesEngine::SetRuleEnabled(FName Id, bool bEnabled)
{
	for (FJulesRule& R : Rules)
	{
		if (R.Id == Id)
		{
			R.bEnabled = bEnabled;
		}
	}
}

TArray<FString> FJulesEngine::ValidateRules() const
{
	TArray<FString> Issues;
	TSet<FName> Seen;
	for (const FJulesRule& R : Rules)
	{
		if (R.Id.IsNone()) { Issues.Add(TEXT("a rule has no id")); }
		if (Seen.Contains(R.Id)) { Issues.Add(FString::Printf(TEXT("rule id %s is used twice"), *R.Id.ToString())); }
		Seen.Add(R.Id);
		if (R.Constraints.Num() == 0) { Issues.Add(FString::Printf(TEXT("rule %s has no constraints"), *R.Id.ToString())); }
		for (const FJulesConstraint& C : R.Constraints)
		{
			switch (C.Kind)
			{
			case EJulesConstraintKind::AllowOps:
			case EJulesConstraintKind::DenyOps:
				if (C.Values.Num() == 0) { Issues.Add(FString::Printf(TEXT("rule %s: op list is empty"), *R.Id.ToString())); }
				break;
			case EJulesConstraintKind::RequireArg:
			case EJulesConstraintKind::ArgRange:
			case EJulesConstraintKind::ArgDenyPrefix:
				if (C.Arg.IsEmpty()) { Issues.Add(FString::Printf(TEXT("rule %s: constraint needs an arg"), *R.Id.ToString())); }
				if (C.Kind == EJulesConstraintKind::ArgRange && C.Min > C.Max) { Issues.Add(FString::Printf(TEXT("rule %s: min > max"), *R.Id.ToString())); }
				if (C.Kind == EJulesConstraintKind::ArgDenyPrefix && C.Values.Num() == 0) { Issues.Add(FString::Printf(TEXT("rule %s: no prefixes"), *R.Id.ToString())); }
				break;
			case EJulesConstraintKind::RateLimit:
				if (C.Max < 1 || C.Window <= 0) { Issues.Add(FString::Printf(TEXT("rule %s: rate limit needs max >= 1 and window > 0"), *R.Id.ToString())); }
				break;
			case EJulesConstraintKind::AllowlistFile:
				if (C.Values.Num() == 0) { Issues.Add(FString::Printf(TEXT("rule %s: allow-list path missing"), *R.Id.ToString())); }
				break;
			default:
				break;
			}
		}
	}
	return Issues;
}

void FJulesEngine::Violate(FJulesReport& Report, const FJulesRule& Rule, int32 Step, const FString& Message) const
{
	FJulesViolation& V = Report.Violations.AddDefaulted_GetRef();
	V.RuleId = Rule.Id;
	V.Severity = Rule.Severity;
	V.StepIndex = Step;
	V.Message = Message;
	if (static_cast<uint8>(Rule.Severity) > static_cast<uint8>(Report.Highest))
	{
		Report.Highest = Rule.Severity;
	}
	if (Rule.Severity >= EJulesSeverity::Error)
	{
		Report.bApproved = false;
	}
}

const TArray<FString>& FJulesEngine::LoadAllowlist(const FString& InPath) const
{
	const FString Path = FPaths::IsRelative(InPath) ? FPaths::Combine(BaseDir.IsEmpty() ? FPaths::ProjectDir() : BaseDir, InPath) : InPath;
	const FDateTime Stamp = IFileManager::Get().GetTimeStamp(*Path);
	FAllowlistCache& Cache = AllowlistCache.FindOrAdd(Path);
	if (Cache.Stamp == Stamp && Stamp != FDateTime::MinValue())
	{
		return Cache.Tasks;
	}
	Cache.Stamp = Stamp;
	Cache.Tasks.Reset();
	FString Json;
	TSharedPtr<FJsonObject> Root;
	if (FFileHelper::LoadFileToString(Json, *Path) && FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Json), Root) && Root.IsValid())
	{
		Root->TryGetStringArrayField(TEXT("allowed_tasks"), Cache.Tasks);
	}
	return Cache.Tasks;
}

void FJulesEngine::EvaluateConstraint(const FJulesRule& Rule, const FJulesConstraint& C, const FSpellwrightSpell& Spell, const FLoreCodex* Codex, double Now, FJulesReport& Report) const
{
	const TArray<FSpellwrightStep>& Steps = Spell.Steps;
	auto ForMatchingSteps = [&](TFunctionRef<void(int32, const FSpellwrightStep&)> Fn)
	{
		for (int32 i = 0; i < Steps.Num(); ++i)
		{
			if (WildcardMatch(C.OpPattern, Steps[i].Op.ToString()))
			{
				Fn(i, Steps[i]);
			}
		}
	};
	const FLoreRealm* Realm = (Codex && !Spell.Realm.IsNone()) ? Codex->FindRealm(Spell.Realm) : nullptr;

	switch (C.Kind)
	{
	case EJulesConstraintKind::AllowOps:
		ForMatchingSteps([&](int32 i, const FSpellwrightStep& S)
		{
			if (!MatchesAny(C.Values, S.Op.ToString()))
			{
				Violate(Report, Rule, i, FString::Printf(TEXT("%s is not an allowed op"), *S.Op.ToString()));
			}
		});
		break;

	case EJulesConstraintKind::DenyOps:
		ForMatchingSteps([&](int32 i, const FSpellwrightStep& S)
		{
			if (MatchesAny(C.Values, S.Op.ToString()))
			{
				Violate(Report, Rule, i, FString::Printf(TEXT("%s is forbidden"), *S.Op.ToString()));
			}
		});
		break;

	case EJulesConstraintKind::MaxSteps:
		if (Steps.Num() > C.Max)
		{
			Violate(Report, Rule, INDEX_NONE, FString::Printf(TEXT("%d steps (limit %d)"), Steps.Num(), static_cast<int32>(C.Max)));
		}
		break;

	case EJulesConstraintKind::MaxCost:
		if (Spell.Cost > C.Max)
		{
			Violate(Report, Rule, INDEX_NONE, FString::Printf(TEXT("cost %.1f exceeds %.1f"), Spell.Cost, C.Max));
		}
		break;

	case EJulesConstraintKind::RequireArg:
		ForMatchingSteps([&](int32 i, const FSpellwrightStep& S)
		{
			if (S.GetArg(C.Arg).TrimStartAndEnd().IsEmpty())
			{
				Violate(Report, Rule, i, FString::Printf(TEXT("%s must give '%s'"), *S.Op.ToString(), *C.Arg));
			}
		});
		break;

	case EJulesConstraintKind::ArgRange:
		ForMatchingSteps([&](int32 i, const FSpellwrightStep& S)
		{
			const FString* V = S.Args.Find(C.Arg);
			if (!V || V->Contains(TEXT("${")))
			{
				return;
			}
			// Sizes and vectors are range-checked per component.
			TArray<FString> Parts;
			V->Replace(TEXT("x"), TEXT(",")).ParseIntoArray(Parts, TEXT(","), true);
			for (const FString& P : Parts)
			{
				const double D = FCString::Atod(*P);
				if (!FCString::IsNumeric(*P) || D < C.Min || D > C.Max)
				{
					Violate(Report, Rule, i, FString::Printf(TEXT("%s=%s outside [%g, %g]"), *C.Arg, **V, C.Min, C.Max));
					return;
				}
			}
		});
		break;

	case EJulesConstraintKind::ArgDenyPrefix:
		ForMatchingSteps([&](int32 i, const FSpellwrightStep& S)
		{
			const FString Raw = S.GetArg(C.Arg);
			// "auto" and "current" are placeholders the engines resolve into Saved/; ${refs} are checked when known.
			if (Raw.IsEmpty() || Raw == TEXT("auto") || Raw == TEXT("current") || Raw.Contains(TEXT("${")))
			{
				return;
			}
			// Relative paths are relative to the project, not to wherever the process started.
			const FString V = FPaths::ConvertRelativePathToFull(FPaths::ProjectDir(), Raw).Replace(TEXT("\\"), TEXT("/"));
			for (const FString& Prefix : C.Values)
			{
				if (V.StartsWith(Prefix.Replace(TEXT("\\"), TEXT("/")), ESearchCase::IgnoreCase))
				{
					Violate(Report, Rule, i, FString::Printf(TEXT("%s may not point into %s"), *C.Arg, *Prefix));
					return;
				}
			}
		});
		break;

	case EJulesConstraintKind::RealmLaw:
		if (!Realm)
		{
			break;
		}
		if (!Spell.School.IsNone() && Realm->ForbiddenSchools.Contains(Spell.School))
		{
			Violate(Report, Rule, INDEX_NONE, FString::Printf(TEXT("%s refuses the %s school"), *Realm->Name, *Spell.School.ToString()));
		}
		if (!Spell.School.IsNone() && Realm->AllowedSchools.Num() > 0 && !Realm->AllowedSchools.Contains(Spell.School))
		{
			Violate(Report, Rule, INDEX_NONE, FString::Printf(TEXT("%s does not permit the %s school"), *Realm->Name, *Spell.School.ToString()));
		}
		for (int32 i = 0; i < Steps.Num(); ++i)
		{
			const FName School = StepSchool(Steps[i]);
			if (!School.IsNone() && Realm->ForbiddenSchools.Contains(School))
			{
				Violate(Report, Rule, i, FString::Printf(TEXT("%s is %s, which %s refuses"), *Steps[i].Op.ToString(), *School.ToString(), *Realm->Name));
			}
			if (MatchesAny(Realm->ForbiddenOps, Steps[i].Op.ToString()))
			{
				Violate(Report, Rule, i, FString::Printf(TEXT("%s is forbidden in %s"), *Steps[i].Op.ToString(), *Realm->Name));
			}
		}
		break;

	case EJulesConstraintKind::FactionLaw:
		if (!Codex || Spell.Realm.IsNone())
		{
			break;
		}
		for (const FLoreFaction* F : Codex->GetFactionsInRealm(Spell.Realm))
		{
			if (F->Influence < C.Min)
			{
				continue;
			}
			for (int32 i = 0; i < Steps.Num(); ++i)
			{
				if (MatchesAny(F->ForbiddenOps, Steps[i].Op.ToString()))
				{
					Violate(Report, Rule, i, FString::Printf(TEXT("%s forbids %s (influence %.0f%%)"), *F->Name, *Steps[i].Op.ToString(), F->Influence * 100.f));
				}
			}
		}
		break;

	case EJulesConstraintKind::MinStability:
		if (Realm && Realm->Stability < C.Min)
		{
			ForMatchingSteps([&](int32 i, const FSpellwrightStep& S)
			{
				Violate(Report, Rule, i, FString::Printf(TEXT("%s is too unstable (%.2f < %.2f) for %s"), *Realm->Name, Realm->Stability, C.Min, *S.Op.ToString()));
			});
		}
		break;

	case EJulesConstraintKind::RequireGlyphs:
		if (Spell.Glyphs.Num() < C.Min)
		{
			Violate(Report, Rule, INDEX_NONE, FString::Printf(TEXT("%d glyphs; at least %d needed"), Spell.Glyphs.Num(), static_cast<int32>(C.Min)));
		}
		break;

	case EJulesConstraintKind::RateLimit:
	{
		const FString Key = Rule.Id.ToString() + TEXT("|") + C.OpPattern;
		int32 Recent = 0;
		if (const TArray<double>* History = RateHistory.Find(Key))
		{
			for (const double T : *History)
			{
				Recent += (Now - T) <= C.Window ? 1 : 0;
			}
		}
		int32 Incoming = 0;
		ForMatchingSteps([&](int32, const FSpellwrightStep&) { ++Incoming; });
		if (Incoming > 0 && Recent + Incoming > C.Max)
		{
			Violate(Report, Rule, INDEX_NONE, FString::Printf(TEXT("%s: %d in the last %.0fs, limit %d"), *C.OpPattern, Recent, C.Window, static_cast<int32>(C.Max)));
		}
		break;
	}

	case EJulesConstraintKind::AllowlistFile:
	{
		const TArray<FString>& Allowed = LoadAllowlist(C.Values[0]);
		for (int32 i = 0; i < Steps.Num(); ++i)
		{
			if (!IsPipelineStep(Steps[i]))
			{
				continue;
			}
			const FString Kind = Steps[i].Op == TEXT("bolt.submit") ? Steps[i].GetArg(TEXT("kind")) : Steps[i].Op.ToString();
			if (!MatchesAny(Allowed, Kind))
			{
				Violate(Report, Rule, i, FString::Printf(TEXT("pipeline task '%s' is not in %s"), *Kind, *C.Values[0]));
			}
		}
		break;
	}

	case EJulesConstraintKind::RequireKnownRealm:
		if (Spell.Realm.IsNone())
		{
			Violate(Report, Rule, INDEX_NONE, TEXT("spell names no realm"));
		}
		else if (Codex && !Realm)
		{
			Violate(Report, Rule, INDEX_NONE, FString::Printf(TEXT("realm %s is not in the codex"), *Spell.Realm.ToString()));
		}
		break;
	}
}

FJulesReport FJulesEngine::Evaluate(const FSpellwrightSpell& Spell, const FLoreCodex* Codex, double Now, bool bCommit)
{
	const double Start = FPlatformTime::Seconds();
	FJulesReport Report;
	Report.SpellId = Spell.Id;
	Report.SpellName = Spell.Name;

	for (const FJulesRule& Rule : Rules)
	{
		if (!Rule.bEnabled)
		{
			continue;
		}
		if (!Rule.RealmPattern.IsEmpty() && !WildcardMatch(Rule.RealmPattern, Spell.Realm.ToString()))
		{
			continue;
		}
		if (!Rule.ProvenancePattern.IsEmpty() && !WildcardMatch(Rule.ProvenancePattern, Spell.Provenance))
		{
			continue;
		}
		++Report.RulesEvaluated;
		for (const FJulesConstraint& C : Rule.Constraints)
		{
			if (C.Kind == EJulesConstraintKind::AllowlistFile && C.Values.Num() == 0)
			{
				continue;
			}
			EvaluateConstraint(Rule, C, Spell, Codex, Now, Report);
		}
	}

	if (bCommit && Report.bApproved)
	{
		for (const FJulesRule& Rule : Rules)
		{
			if (!Rule.bEnabled)
			{
				continue;
			}
			for (const FJulesConstraint& C : Rule.Constraints)
			{
				if (C.Kind != EJulesConstraintKind::RateLimit)
				{
					continue;
				}
				TArray<double>& History = RateHistory.FindOrAdd(Rule.Id.ToString() + TEXT("|") + C.OpPattern);
				History.RemoveAll([&](double T) { return Now - T > C.Window; });
				for (const FSpellwrightStep& S : Spell.Steps)
				{
					if (WildcardMatch(C.OpPattern, S.Op.ToString()))
					{
						History.Add(Now);
					}
				}
			}
		}
	}
	Report.ElapsedMs = static_cast<float>((FPlatformTime::Seconds() - Start) * 1000.0);
	return Report;
}
