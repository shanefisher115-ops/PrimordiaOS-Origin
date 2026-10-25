#pragma once

#include "CoreMinimal.h"
#include "JulesTypes.generated.h"

UENUM(BlueprintType)
enum class EJulesSeverity : uint8
{
	Info,
	Warning,
	/** Blocks the spell. */
	Error,
	/** Blocks the spell and every other spell from the same goal this cycle. */
	Fatal,
};

UENUM(BlueprintType)
enum class EJulesConstraintKind : uint8
{
	/** Every step op must match one of Values (wildcards: "cadcam.*"). */
	AllowOps,
	/** No step op may match any of Values. */
	DenyOps,
	/** At most Max steps. */
	MaxSteps,
	/** Spell cost at most Max. */
	MaxCost,
	/** Steps matching OpPattern must carry argument Arg (with a non-empty value). */
	RequireArg,
	/** Steps matching OpPattern: numeric argument Arg within [Min, Max] when present. */
	ArgRange,
	/** Steps matching OpPattern: argument Arg must not start with any of Values (case-insensitive), e.g. forbidden paths. */
	ArgDenyPrefix,
	/** The spell's realm laws from the codex: forbidden schools (spell and step schools), forbidden ops, allowed schools. */
	RealmLaw,
	/** Ops forbidden by any faction holding at least Min influence in the spell's realm. */
	FactionLaw,
	/** Realm stability must be at least Min for steps matching OpPattern. */
	MinStability,
	/** At least Min glyphs in the inscription. */
	RequireGlyphs,
	/** Steps matching OpPattern: at most Max per Window seconds across all spells. */
	RateLimit,
	/**
	 * Pipeline steps (and bolt.submit kinds) must be listed in an allow-list file
	 * ({"allowed_tasks": [...]}, the Bolt adapter's format). Values[0] is the path; relative paths
	 * resolve against the project directory.
	 */
	AllowlistFile,
	/** Spell must name a realm that exists in the codex. */
	RequireKnownRealm,
};

USTRUCT(BlueprintType)
struct PRIMORDIAJULESSUBSYSTEM_API FJulesConstraint
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") EJulesConstraintKind Kind = EJulesConstraintKind::DenyOps;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") TArray<FString> Values;
	/** Which steps a step-level constraint applies to. Empty = all steps. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") FString OpPattern;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") FString Arg;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") double Min = 0.0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") double Max = 0.0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") double Window = 60.0;
};

/** A named rule: all of its constraints must hold. */
USTRUCT(BlueprintType)
struct PRIMORDIAJULESSUBSYSTEM_API FJulesRule
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") FName Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") FString Description;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") EJulesSeverity Severity = EJulesSeverity::Error;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") bool bEnabled = true;
	/** Apply only to spells whose realm matches (wildcards). Empty = every realm. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") FString RealmPattern;
	/** Apply only to spells whose provenance matches (planner, model, user, dsl). Empty = all. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") FString ProvenancePattern;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jules") TArray<FJulesConstraint> Constraints;
};

USTRUCT(BlueprintType)
struct PRIMORDIAJULESSUBSYSTEM_API FJulesViolation
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Jules") FName RuleId;
	UPROPERTY(BlueprintReadOnly, Category = "Jules") EJulesSeverity Severity = EJulesSeverity::Error;
	UPROPERTY(BlueprintReadOnly, Category = "Jules") FString Message;
	/** 0-based, INDEX_NONE for the spell as a whole. */
	UPROPERTY(BlueprintReadOnly, Category = "Jules") int32 StepIndex = INDEX_NONE;
};

/** Jules' verdict on one spell. */
USTRUCT(BlueprintType)
struct PRIMORDIAJULESSUBSYSTEM_API FJulesReport
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Jules") FGuid SpellId;
	UPROPERTY(BlueprintReadOnly, Category = "Jules") FName SpellName;
	UPROPERTY(BlueprintReadOnly, Category = "Jules") bool bApproved = true;
	UPROPERTY(BlueprintReadOnly, Category = "Jules") EJulesSeverity Highest = EJulesSeverity::Info;
	UPROPERTY(BlueprintReadOnly, Category = "Jules") TArray<FJulesViolation> Violations;
	UPROPERTY(BlueprintReadOnly, Category = "Jules") int32 RulesEvaluated = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Jules") float ElapsedMs = 0.f;

	FString Summary() const;
};
