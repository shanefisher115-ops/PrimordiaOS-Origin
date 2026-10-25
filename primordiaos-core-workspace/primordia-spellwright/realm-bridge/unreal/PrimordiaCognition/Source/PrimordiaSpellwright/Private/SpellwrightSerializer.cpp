#include "SpellwrightSerializer.h"

#include "Dom/JsonObject.h"
#include "JsonObjectConverter.h"
#include "Policies/CondensedJsonPrintPolicy.h"
#include "Policies/PrettyJsonPrintPolicy.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "SpellwrightCompiler.h"

const TCHAR* FSpellwrightSerializer::Schema = TEXT("primordia.spell/1");

namespace
{
	FString Write(const TSharedRef<FJsonObject>& Obj, bool bPretty)
	{
		FString Out;
		if (bPretty)
		{
			const TSharedRef<TJsonWriter<TCHAR, TPrettyJsonPrintPolicy<TCHAR>>> W = TJsonWriterFactory<TCHAR, TPrettyJsonPrintPolicy<TCHAR>>::Create(&Out);
			FJsonSerializer::Serialize(Obj, W);
		}
		else
		{
			const TSharedRef<TJsonWriter<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>> W = TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&Out);
			FJsonSerializer::Serialize(Obj, W);
		}
		return Out;
	}

	TSharedPtr<FJsonObject> Read(const FString& Json, FString& OutError)
	{
		TSharedPtr<FJsonObject> Obj;
		const TSharedRef<TJsonReader<>> R = TJsonReaderFactory<>::Create(Json);
		if (!FJsonSerializer::Deserialize(R, Obj) || !Obj.IsValid())
		{
			OutError = FString::Printf(TEXT("invalid JSON: %s"), *R->GetErrorMessage());
			return nullptr;
		}
		return Obj;
	}
}

TSharedRef<FJsonObject> FSpellwrightSerializer::StepToJsonObject(const FSpellwrightStep& Step)
{
	TSharedRef<FJsonObject> Obj = MakeShared<FJsonObject>();
	FJsonObjectConverter::UStructToJsonObject(FSpellwrightStep::StaticStruct(), &Step, Obj, 0, 0);
	return Obj;
}

TSharedRef<FJsonObject> FSpellwrightSerializer::ToJsonObject(const FSpellwrightSpell& Spell)
{
	TSharedRef<FJsonObject> Obj = MakeShared<FJsonObject>();
	FJsonObjectConverter::UStructToJsonObject(FSpellwrightSpell::StaticStruct(), &Spell, Obj, 0, 0);
	// The wire format carries the id in canonical 8-4-4-4-12 form, which every language parses.
	Obj->SetStringField(TEXT("id"), Spell.Id.ToString(EGuidFormats::DigitsWithHyphensLower));
	// Source text is for humans; it can be large and the pipeline never needs it.
	Obj->RemoveField(TEXT("source"));
	return Obj;
}

FString FSpellwrightSerializer::ToJson(const FSpellwrightSpell& Spell, bool bPretty)
{
	return Write(ToJsonObject(Spell), bPretty);
}

bool FSpellwrightSerializer::FromJsonObject(const TSharedRef<FJsonObject>& Object, FSpellwrightSpell& OutSpell, FString& OutError)
{
	FSpellwrightSpell Spell;
	// The wire id is hyphenated, which FGuid's text import rejects: parse it ourselves.
	TSharedRef<FJsonObject> WithoutId = MakeShared<FJsonObject>(*Object);
	WithoutId->RemoveField(TEXT("id"));
	if (!FJsonObjectConverter::JsonObjectToUStruct(WithoutId, &Spell, 0, 0))
	{
		OutError = TEXT("JSON does not describe a spell");
		return false;
	}
	FString IdText;
	if (Object->TryGetStringField(TEXT("id"), IdText) && !FGuid::Parse(IdText, Spell.Id))
	{
		OutError = FString::Printf(TEXT("bad spell id '%s'"), *IdText);
		return false;
	}
	OutSpell = MoveTemp(Spell);
	return true;
}

bool FSpellwrightSerializer::FromJson(const FString& Json, FSpellwrightSpell& OutSpell, FString& OutError)
{
	const TSharedPtr<FJsonObject> Obj = Read(Json, OutError);
	return Obj.IsValid() && FromJsonObject(Obj.ToSharedRef(), OutSpell, OutError);
}

FString FSpellwrightSerializer::ToEnvelope(const FSpellwrightSpell& Spell)
{
	TSharedRef<FJsonObject> Env = MakeShared<FJsonObject>();
	Env->SetStringField(TEXT("schema"), Schema);
	Env->SetObjectField(TEXT("spell"), ToJsonObject(Spell));
	Env->SetStringField(TEXT("sentAt"), FDateTime::UtcNow().ToIso8601());
	return Write(Env, false);
}

bool FSpellwrightSerializer::FromEnvelope(const FString& Json, FSpellwrightSpell& OutSpell, FString& OutError)
{
	const TSharedPtr<FJsonObject> Env = Read(Json, OutError);
	if (!Env.IsValid())
	{
		return false;
	}
	FString SchemaText;
	if (!Env->TryGetStringField(TEXT("schema"), SchemaText) || SchemaText != Schema)
	{
		OutError = FString::Printf(TEXT("expected schema %s, found '%s'"), Schema, *SchemaText);
		return false;
	}
	const TSharedPtr<FJsonObject>* SpellObj = nullptr;
	if (!Env->TryGetObjectField(TEXT("spell"), SpellObj))
	{
		OutError = TEXT("envelope has no spell");
		return false;
	}
	return FromJsonObject(SpellObj->ToSharedRef(), OutSpell, OutError);
}

FString FSpellwrightSerializer::ToDsl(const FSpellwrightSpell& Spell)
{
	FString Out = FString::Printf(TEXT("spell %s"), *Spell.Name.ToString());
	if (!Spell.School.IsNone())
	{
		Out += FString::Printf(TEXT(" : %s"), *Spell.School.ToString());
	}
	Out += TEXT(" {\n");
	if (Spell.Intent != Spell.Name && !Spell.Intent.IsNone()) { Out += FString::Printf(TEXT("    intent %s\n"), *Spell.Intent.ToString()); }
	if (!Spell.Subject.IsEmpty()) { Out += FString::Printf(TEXT("    subject %s\n"), *FSpellwrightCompiler::QuoteValue(Spell.Subject)); }
	if (!Spell.Realm.IsNone()) { Out += FString::Printf(TEXT("    realm %s\n"), *Spell.Realm.ToString()); }
	if (!Spell.GoalId.IsNone()) { Out += FString::Printf(TEXT("    goal %s\n"), *Spell.GoalId.ToString()); }
	if (Spell.Priority != 0) { Out += FString::Printf(TEXT("    priority %d\n"), Spell.Priority); }
	if (Spell.Glyphs.Num() > 0)
	{
		TArray<FString> G;
		for (const FName& N : Spell.Glyphs) { G.Add(N.ToString()); }
		Out += FString::Printf(TEXT("    glyphs %s\n"), *FString::Join(G, TEXT(",")));
	}
	for (const FSpellwrightStep& Step : Spell.Steps)
	{
		Out += TEXT("    ") + Step.Op.ToString();
		if (!Step.Target.IsEmpty())
		{
			Out += TEXT(" ") + FSpellwrightCompiler::QuoteValue(Step.Target);
		}
		TArray<FString> Keys;
		Step.Args.GetKeys(Keys);
		Keys.Sort();
		for (const FString& K : Keys)
		{
			Out += FString::Printf(TEXT(" %s=%s"), *K, *FSpellwrightCompiler::QuoteValue(Step.Args[K]));
		}
		if (!Step.Label.IsNone())
		{
			Out += TEXT(" as ") + Step.Label.ToString();
		}
		if (Step.After.Num() > 0)
		{
			TArray<FString> A;
			for (const FName& N : Step.After) { A.Add(N.ToString()); }
			Out += TEXT(" after ") + FString::Join(A, TEXT(","));
		}
		Out += TEXT("\n");
	}
	Out += TEXT("}\n");
	return Out;
}
