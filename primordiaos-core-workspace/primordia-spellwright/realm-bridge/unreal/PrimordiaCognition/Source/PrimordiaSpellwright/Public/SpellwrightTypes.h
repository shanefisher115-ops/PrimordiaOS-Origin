#pragma once

#include "CoreMinimal.h"
#include "SpellwrightTypes.generated.h"

/** One step of a spell: an op performed by one engine. */
USTRUCT(BlueprintType)
struct PRIMORDIASPELLWRIGHT_API FSpellwrightStep
{
	GENERATED_BODY()

	/** "<domain>.<verb>", e.g. "cadcam.fabricate". The domain picks the engine that runs it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FName Op;
	/** What the step acts on (an actor tag, a part name, a path). Optional. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FString Target;
	/**
	 * Arguments as text. A value may reference an earlier step's output as ${label.key};
	 * the executor substitutes it when the step starts.
	 */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") TMap<FString, FString> Args;
	/** Name other steps use to depend on this one. Defaults to s<1-based index>. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FName Label;
	/** Labels of steps that must succeed before this one starts. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") TArray<FName> After;

	FString GetArg(const FString& Key, const FString& Default = FString()) const
	{
		const FString* V = Args.Find(Key);
		return V ? *V : Default;
	}
	FName GetDomain() const;
};

/** A compiled spell: a small dependency graph of steps plus its standing in the lore. */
USTRUCT(BlueprintType)
struct PRIMORDIASPELLWRIGHT_API FSpellwrightSpell
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FGuid Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FName Name;
	/** The verb this spell enacts (fabricate, render, edit, manifest...). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FName Intent;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FString Subject;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FName School;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FName Realm;
	/** The subject inscribed in the glyph tongue. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") TArray<FName> Glyphs;
	/** Sigils that woke inside the inscription. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") TArray<FName> Sigils;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") TArray<FSpellwrightStep> Steps;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") float Cost = 0.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") int32 Priority = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FName GoalId;
	/** planner, model, dsl, user. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FString Provenance;
	/** The DSL text this spell was compiled from. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FString Source;

	int32 FindStep(FName Label) const;
};

/** What the planner wants done. The compiler turns it into a spell. */
USTRUCT(BlueprintType)
struct PRIMORDIASPELLWRIGHT_API FSpellwrightIntent
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FName Verb;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FString Subject;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FName Realm;
	/** Fill the template's ${name} placeholders. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") TMap<FString, FString> Params;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") int32 Priority = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FName GoalId;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FString Rationale;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spellwright") FString Provenance;
};

UENUM(BlueprintType)
enum class ESpellwrightIssueSeverity : uint8
{
	Warning,
	Error,
};

USTRUCT(BlueprintType)
struct PRIMORDIASPELLWRIGHT_API FSpellwrightIssue
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Spellwright") ESpellwrightIssueSeverity Severity = ESpellwrightIssueSeverity::Error;
	UPROPERTY(BlueprintReadOnly, Category = "Spellwright") FString Message;
	/** 0-based step index, or INDEX_NONE for the spell as a whole. */
	UPROPERTY(BlueprintReadOnly, Category = "Spellwright") int32 StepIndex = INDEX_NONE;
	/** 1-based source line for DSL errors, 0 when not from source. */
	UPROPERTY(BlueprintReadOnly, Category = "Spellwright") int32 Line = 0;

	FString ToString() const;
};

UENUM(BlueprintType)
enum class ESpellwrightStepOutcome : uint8
{
	Succeeded,
	Failed,
	/** Running elsewhere (a pipeline job); completes when JobId finishes. */
	Pending,
};

/** What an engine reports back when it runs a step. */
USTRUCT(BlueprintType)
struct PRIMORDIASPELLWRIGHT_API FSpellwrightStepResult
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Spellwright") ESpellwrightStepOutcome Outcome = ESpellwrightStepOutcome::Succeeded;
	UPROPERTY(BlueprintReadOnly, Category = "Spellwright") FString Message;
	/** Values later steps can reference as ${label.key}. */
	UPROPERTY(BlueprintReadOnly, Category = "Spellwright") TMap<FString, FString> Outputs;
	UPROPERTY(BlueprintReadOnly, Category = "Spellwright") FString JobId;

	static FSpellwrightStepResult Success(const FString& Message = FString()) { FSpellwrightStepResult R; R.Message = Message; return R; }
	static FSpellwrightStepResult Failure(const FString& Message) { FSpellwrightStepResult R; R.Outcome = ESpellwrightStepOutcome::Failed; R.Message = Message; return R; }
	static FSpellwrightStepResult PendingJob(const FString& JobId, const FString& Message = FString())
	{
		FSpellwrightStepResult R;
		R.Outcome = ESpellwrightStepOutcome::Pending;
		R.JobId = JobId;
		R.Message = Message;
		return R;
	}
};

/**
 * How an engine finishes a step it returned as Pending: it calls this exactly once with the final
 * result (Succeeded or Failed, with outputs). Steps that finish immediately never call it.
 */
using FSpellwrightStepCallback = TFunction<void(const FSpellwrightStepResult&)>;
