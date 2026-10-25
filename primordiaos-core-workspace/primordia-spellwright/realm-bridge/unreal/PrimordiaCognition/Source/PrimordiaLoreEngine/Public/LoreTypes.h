#pragma once

#include "CoreMinimal.h"
#include "LoreTypes.generated.h"

UENUM(BlueprintType)
enum class ELoreCategory : uint8
{
	Cosmology,
	Metaphysics,
	RealmLaw,
	FactionLaw,
	History,
	Sigil,
	Glyph,
	Language,
};

/** Glyph kinds match PRS-1 section 3.6. */
UENUM(BlueprintType)
enum class ELoreGlyphKind : uint8
{
	Soul,
	Sigil,
	Ward,
	Gate,
};

/** Atomic lore unit: one statement of cosmology, law, history or language. */
USTRUCT(BlueprintType)
struct PRIMORDIALOREENGINE_API FLoreEntry
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FName Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Title;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Body;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") ELoreCategory Category = ELoreCategory::Cosmology;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FName> Tags;
	/** Ids of related entries, realms, factions, events or glyphs. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FName> Links;
	/** Relative importance when ranking query results. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") float Weight = 1.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") int32 Era = 0;
};

/** A realm and the laws that hold inside it. Metaphysics keys follow PRS-1 section 3.5. */
USTRUCT(BlueprintType)
struct PRIMORDIALOREENGINE_API FLoreRealm
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FName Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Name;
	/** The substrate module that governs this realm (Heart, CosmicWeb, FateWeave, Soul, Dreamforge, Shadowforge...). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Domain;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Description;
	/** coherence, entropy, luminosity, inversion, lucidity, resonance: each 0..1. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TMap<FName, float> Metaphysics;
	/** Spell schools permitted here. Empty means every school not forbidden. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FName> AllowedSchools;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FName> ForbiddenSchools;
	/** Spell ops (wildcards allowed, e.g. "cadcam.*") that this realm refuses. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FString> ForbiddenOps;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FString> Laws;
	/** 0 = collapsing, 1 = perfectly stable. Evolves with events. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") float Stability = 1.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FName> Factions;
};

USTRUCT(BlueprintType)
struct PRIMORDIALOREENGINE_API FLoreFaction
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FName Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Name;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Creed;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FName HomeRealm;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FName> Allies;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FName> Rivals;
	/** Share of power, 0..1. The evolver keeps the sum of all factions at 1. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") float Influence = 0.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FString> Tenets;
	/** Spell ops (wildcards allowed) this faction forbids wherever it holds influence. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FString> ForbiddenOps;
	/** The school this faction practises. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FName School;
};

/** A mythic or recorded event and what it changed. */
USTRUCT(BlueprintType)
struct PRIMORDIALOREENGINE_API FLoreEvent
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FName Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Title;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Account;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") int32 Era = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FName Realm;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FName> Factions;
	/** Added to the realm's metaphysics (then clamped to 0..1). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TMap<FName, float> MetaphysicsShift;
	/** Added to each named faction's influence (then renormalized). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TMap<FName, float> InfluenceShift;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") float StabilityShift = 0.f;
	/** Mythic events are canon from the founding codex; non-mythic ones were recorded at runtime. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") bool bMythic = false;
	/** ISO-8601 time the event was recorded, empty for mythic events. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString RecordedAt;
};

/** Symbolic metaphysics unit: a letter of the glyph language, or a sigil composed of glyphs. */
USTRUCT(BlueprintType)
struct PRIMORDIALOREENGINE_API FLoreGlyph
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FName Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Name;
	/** The consonant(s) this glyph writes. Sigils have none. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Phoneme;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Meaning;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FName School;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") ELoreGlyphKind Kind = ELoreGlyphKind::Sigil;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") int32 Symmetry = 6;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") float Complexity = 0.5f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") float Hue = 0.f;
	/** For sigils: the glyph ids it is written with. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FName> Composes;
};

UENUM(BlueprintType)
enum class ELoreRecordKind : uint8
{
	Entry,
	Realm,
	Faction,
	Event,
	Glyph,
};

USTRUCT(BlueprintType)
struct PRIMORDIALOREENGINE_API FLoreQueryHit
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Lore") FName Id;
	UPROPERTY(BlueprintReadOnly, Category = "Lore") ELoreRecordKind Kind = ELoreRecordKind::Entry;
	UPROPERTY(BlueprintReadOnly, Category = "Lore") FString Title;
	UPROPERTY(BlueprintReadOnly, Category = "Lore") FString Text;
	UPROPERTY(BlueprintReadOnly, Category = "Lore") float Score = 0.f;
};

class FLoreCodex;

/** Query interface: every filter that is set must match; Text ranks what remains. */
USTRUCT(BlueprintType)
struct PRIMORDIALOREENGINE_API FLoreQuery
{
	GENERATED_BODY()

	/** Free text, ranked by token overlap. Empty matches everything (ranked by weight). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FString Text;
	/** Record kinds to search. Empty = all kinds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<ELoreRecordKind> Kinds;
	/** Entry categories to keep (applies to entries only). Empty = all. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<ELoreCategory> Categories;
	/** Every tag must be present (entries) . */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") TArray<FName> RequiredTags;
	/** Keep only records tied to this realm (entries linking it, its factions, events in it). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FName Realm;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") FName Faction;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") int32 MinEra = MIN_int32;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") int32 MaxEra = MAX_int32;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lore") int32 Limit = 8;

	TArray<FLoreQueryHit> Execute(const FLoreCodex& Codex) const;
};
