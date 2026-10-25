#pragma once

#include "CoreMinimal.h"
#include "Engine/DeveloperSettings.h"
#include "SpellwrightTypes.h"
#include "CognitionTypes.generated.h"

/** An actor the cognition loop pays attention to (it carries a tracked tag). */
USTRUCT(BlueprintType)
struct PRIMORDIACOGNITION_API FPrimordiaEntityState
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FString Name;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FString Class;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") TArray<FName> Tags;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FVector Location = FVector::ZeroVector;
};

/** What the world looked like at one cognition cycle. */
USTRUCT(BlueprintType)
struct PRIMORDIACOGNITION_API FPrimordiaWorldSnapshot
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FString WorldName;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") double TimeSeconds = 0.0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 ActorCount = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") TArray<FPrimordiaEntityState> Entities;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") TMap<FName, int32> TagCounts;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") TMap<FString, int32> ClassCounts;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") bool bHasPlayer = false;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FVector PlayerLocation = FVector::ZeroVector;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FName Realm;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 Era = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") bool bBoltConnected = false;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 ActiveJobs = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 ActiveSpells = 0;
	/** Flattened key -> value view the planner and models reason over. */
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") TMap<FString, FString> Facts;
};

USTRUCT(BlueprintType)
struct PRIMORDIACOGNITION_API FPrimordiaMemoryRecord
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int64 Id = 0;
	/** observation, action, spell, job, lore, goal, model, user */
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FName Kind;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FString Summary;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") TArray<FName> Tags;
	/** 0..1, how much it matters. Decays with age unless recalled. */
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") float Salience = 0.5f;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 Recalls = 0;
	/** Times the same thing was observed again and merged into this record. */
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 Repeats = 1;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FDateTime CreatedAt;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FDateTime LastSeenAt;
};

UENUM(BlueprintType)
enum class EPrimordiaGoalState : uint8
{
	Pending,
	Executing,
	Satisfied,
	Failed,
	Abandoned,
};

USTRUCT(BlueprintType)
struct PRIMORDIACOGNITION_API FPrimordiaGoal
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FName Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Cognition") FString Description;
	/** A compound task from the method table, or "intent:<verb>" for a single spell. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Cognition") FString Task;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Cognition") TMap<FString, FString> Params;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Cognition") int32 Priority = 0;
	/** Fact expression ("tag.Primordia.Lantern >= 3"). Empty = satisfied once its spells succeed. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Cognition") FString SatisfiedWhen;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Cognition") int32 MaxAttempts = 3;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Cognition") float RetrySeconds = 10.f;
	/** Who asked: user, trigger:<id>, model:<name>. */
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FString Source;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") EPrimordiaGoalState State = EPrimordiaGoalState::Pending;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 Attempts = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") double RetryAt = 0.0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FString LastError;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") TArray<FGuid> Spells;
	/** Approved spells of the current plan still waiting for the one before them to succeed. */
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") TArray<FSpellwrightSpell> Queued;
};

UENUM(BlueprintType)
enum class EPrimordiaStepState : uint8
{
	Waiting,
	Running,
	Succeeded,
	Failed,
	Skipped,
};

USTRUCT(BlueprintType)
struct PRIMORDIACOGNITION_API FPrimordiaRunStatus
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FGuid SpellId;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FName SpellName;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") FName GoalId;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") TArray<FName> StepOps;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") TArray<EPrimordiaStepState> StepStates;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") TArray<FString> StepMessages;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") bool bFinished = false;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") bool bSucceeded = false;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") double StartedAt = 0.0;
};

/** What one cognition cycle did. */
USTRUCT(BlueprintType)
struct PRIMORDIACOGNITION_API FPrimordiaCycleReport
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int64 Cycle = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") double TimeSeconds = 0.0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 Facts = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 Observations = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 MemoriesRecalled = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 LoreConsulted = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 GoalsPlanned = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 SpellsCompiled = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 SpellsApproved = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 SpellsRejected = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") int32 StepsStarted = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") float ElapsedMs = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "Cognition") TArray<FString> Notes;
};

UENUM(BlueprintType)
enum class EPrimordiaModelBackend : uint8
{
	/** Deterministic triggers from Resources/Planner/triggers.json. */
	Rules,
	/** A local Ollama model proposes goals; triggers still run. */
	Ollama,
	/** No goal proposals; only goals added by Blueprints, spells cast by hand, and the planner. */
	None,
};

UCLASS(Config = Game, DefaultConfig, meta = (DisplayName = "PrimordiaOS Cognition"))
class PRIMORDIACOGNITION_API UPrimordiaCognitionSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	virtual FName GetCategoryName() const override { return TEXT("Plugins"); }

	UPROPERTY(Config, EditAnywhere, Category = "Loop") bool bEnabled = true;
	/** Print goals, spells and verdicts on screen while playing. */
	UPROPERTY(Config, EditAnywhere, Category = "Loop") bool bOnScreenMessages = true;
	/** Seconds between cognition cycles. */
	UPROPERTY(Config, EditAnywhere, Category = "Loop", meta = (ClampMin = "0.05")) float CycleSeconds = 1.f;
	UPROPERTY(Config, EditAnywhere, Category = "Loop", meta = (ClampMin = "1")) int32 MaxSpellsPerCycle = 2;
	UPROPERTY(Config, EditAnywhere, Category = "Loop", meta = (ClampMin = "1")) int32 MaxConcurrentSpells = 4;
	/** A step that has not finished after this long fails. */
	UPROPERTY(Config, EditAnywhere, Category = "Loop", meta = (ClampMin = "5")) float StepTimeoutSeconds = 3600.f;
	/** The realm this world stands in (a codex realm id). */
	UPROPERTY(Config, EditAnywhere, Category = "World") FName DefaultRealm = TEXT("realm_worldforge");
	/** Actors with a tag starting with one of these are tracked as entities. */
	UPROPERTY(Config, EditAnywhere, Category = "World") TArray<FString> TrackedTagPrefixes = {TEXT("Primordia")};
	UPROPERTY(Config, EditAnywhere, Category = "World", meta = (ClampMin = "1")) int32 MaxTrackedEntities = 256;

	UPROPERTY(Config, EditAnywhere, Category = "Memory", meta = (ClampMin = "64")) int32 MemoryCapacity = 2048;
	/** Salience halves over this many hours unless the memory is recalled. */
	UPROPERTY(Config, EditAnywhere, Category = "Memory", meta = (ClampMin = "0.01")) float MemoryHalfLifeHours = 24.f;
	UPROPERTY(Config, EditAnywhere, Category = "Memory") bool bPersistMemory = true;

	UPROPERTY(Config, EditAnywhere, Category = "Model") EPrimordiaModelBackend ModelBackend = EPrimordiaModelBackend::Rules;
	UPROPERTY(Config, EditAnywhere, Category = "Model") FString OllamaUrl = TEXT("http://127.0.0.1:11434");
	UPROPERTY(Config, EditAnywhere, Category = "Model") FString OllamaModel = TEXT("llama3.2:3b");
	/** Seconds between model consultations (the model is slow; the loop is not). */
	UPROPERTY(Config, EditAnywhere, Category = "Model", meta = (ClampMin = "1")) float ModelSeconds = 15.f;
	UPROPERTY(Config, EditAnywhere, Category = "Model", meta = (ClampMin = "1")) float ModelTimeoutSeconds = 90.f;
	/** Proposed goals kept at most this many at a time from the model. */
	UPROPERTY(Config, EditAnywhere, Category = "Model", meta = (ClampMin = "1")) int32 MaxModelGoals = 3;
};
