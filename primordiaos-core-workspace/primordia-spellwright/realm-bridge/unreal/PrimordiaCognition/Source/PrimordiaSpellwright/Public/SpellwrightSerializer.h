#pragma once

#include "CoreMinimal.h"
#include "SpellwrightTypes.h"

class FJsonObject;

/** Spells to and from JSON (the pipeline wire format) and back to DSL text. */
class PRIMORDIASPELLWRIGHT_API FSpellwrightSerializer
{
public:
	/** Wire schema id carried in every envelope. */
	static const TCHAR* Schema;

	static TSharedRef<FJsonObject> ToJsonObject(const FSpellwrightSpell& Spell);
	static FString ToJson(const FSpellwrightSpell& Spell, bool bPretty = false);
	static bool FromJson(const FString& Json, FSpellwrightSpell& OutSpell, FString& OutError);
	static bool FromJsonObject(const TSharedRef<FJsonObject>& Object, FSpellwrightSpell& OutSpell, FString& OutError);

	/** { "schema": "primordia.spell/1", "spell": {...}, "sentAt": "..." } */
	static FString ToEnvelope(const FSpellwrightSpell& Spell);
	static bool FromEnvelope(const FString& Json, FSpellwrightSpell& OutSpell, FString& OutError);

	/** Canonical DSL text. Parse(ToDsl(s)) yields the same steps, args, labels and dependencies. */
	static FString ToDsl(const FSpellwrightSpell& Spell);

	static TSharedRef<FJsonObject> StepToJsonObject(const FSpellwrightStep& Step);
};
