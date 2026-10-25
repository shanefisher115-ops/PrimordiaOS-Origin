#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleInterface.h"
#include "Subsystems/WorldSubsystem.h"
#include "CognitionTypes.h"
#include "PrimordiaActionExecutor.h"
#include "PrimordiaIntentRouter.h"
#include "PrimordiaMemory.h"
#include "PrimordiaModelBridge.h"
#include "PrimordiaPlanner.h"
#include "PrimordiaWorldState.h"
#include "SpellwrightTypes.h"
#include "PrimordiaCognitionSubsystem.generated.h"

PRIMORDIACOGNITION_API DECLARE_LOG_CATEGORY_EXTERN(LogCognition, Log, All);

struct FBoltEvent;
struct FJulesReport;

class FPrimordiaCognitionModule : public IModuleInterface
{
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnCognitionCycle, const FPrimordiaCycleReport&, Report);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnCognitionSpellFinished, const FPrimordiaRunStatus&, Run);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnCognitionGoalChanged, const FPrimordiaGoal&, Goal);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnCognitionSpellRejected, FName, SpellName, const FString&, Reason);

/**
 * Engine-native cognition. Ticks every frame (the executor advances running spells) and once per
 * CycleSeconds runs the full loop:
 *
 *   world-state -> memory -> lore -> model proposals -> planning -> Spellwright -> validation ->
 *   Jules -> routing -> action -> pipeline (Bolt)
 *
 * Exists in game and PIE worlds. Goals come from Blueprints (AddGoal), triggers, and the model;
 * spells can also be cast directly (CastSpell) and still pass validation and Jules.
 */
UCLASS()
class PRIMORDIACOGNITION_API UPrimordiaCognitionSubsystem : public UTickableWorldSubsystem
{
	GENERATED_BODY()

public:
	virtual bool ShouldCreateSubsystem(UObject* Outer) const override;
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;
	virtual void Tick(float DeltaTime) override;
	virtual TStatId GetStatId() const override;

	static UPrimordiaCognitionSubsystem* Get(const UObject* WorldContext);

	/** Adds a goal. Task is a planner task or "intent:<verb>". Returns its id. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	FName AddGoal(const FString& Task, const TMap<FString, FString>& Params, int32 Priority = 5, const FString& SatisfiedWhen = TEXT(""), const FString& Description = TEXT(""));

	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	bool AbandonGoal(FName GoalId);

	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	TArray<FPrimordiaGoal> GetGoals() const { return Goals; }

	/** Compiles DSL source; valid spells are queued for Jules and execution next cycle. Returns how many were queued. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	int32 CastSpell(const FString& Source, TArray<FString>& OutIssues);

	/** Queues an intent (compiled, judged and run next cycle). */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	void SubmitIntent(const FSpellwrightIntent& Intent);

	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	bool CancelSpell(const FGuid& SpellId);

	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	TArray<FPrimordiaMemoryRecord> RecallMemories(const FString& Query, int32 Limit = 8);

	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	void RememberNote(const FString& Text, const TArray<FName>& Tags, float Salience = 0.6f);

	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	FPrimordiaWorldSnapshot GetWorldState() const { return LastSnapshot; }

	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	TArray<FPrimordiaRunStatus> GetSpellRuns() const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	FPrimordiaCycleReport GetLastCycle() const { return LastReport; }

	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	void SetRealm(FName InRealm);

	UFUNCTION(BlueprintPure, Category = "Primordia|Cognition")
	FName GetRealm() const { return Realm; }

	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	void SetPaused(bool bInPaused) { bPaused = bInPaused; }

	UFUNCTION(BlueprintPure, Category = "Primordia|Cognition")
	bool IsPaused() const { return bPaused; }

	/** Runs one cycle now, regardless of the timer. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Cognition")
	FPrimordiaCycleReport RunCycleNow() { return RunCycle(); }

	/** Swaps the model (for custom bridges). Null restores the configured one. */
	void SetModelBridge(TSharedPtr<IPrimordiaModelBridge> InModel);

	FPrimordiaIntentRouter& GetRouter() { return Router; }
	FPrimordiaPlanner& GetPlanner() { return Planner; }
	FPrimordiaMemory& GetMemory() { return Memory; }

	UPROPERTY(BlueprintAssignable, Category = "Primordia|Cognition") FOnCognitionCycle OnCycle;
	UPROPERTY(BlueprintAssignable, Category = "Primordia|Cognition") FOnCognitionSpellFinished OnSpellFinished;
	UPROPERTY(BlueprintAssignable, Category = "Primordia|Cognition") FOnCognitionGoalChanged OnGoalChanged;
	UPROPERTY(BlueprintAssignable, Category = "Primordia|Cognition") FOnCognitionSpellRejected OnSpellRejected;

private:
	FPrimordiaCycleReport RunCycle();
	void LoadPlannerResources();
	void RegisterHandlers();
	void ConsultModels(const FPrimordiaWorldSnapshot& Snapshot, const TArray<FPrimordiaMemoryRecord>& Recalled, const TArray<FString>& Lore, double Now);
	void AcceptProposals(const TArray<FPrimordiaGoal>& Proposed, const FString& FromModel);
	FName AddGoalInternal(FPrimordiaGoal Goal);
	TArray<FString> KnownTasks() const;

	/** Validator + routing + Jules. True if the spell may run. */
	bool Judge(const FSpellwrightSpell& Spell, FPrimordiaCycleReport& Report);
	void Begin(const FSpellwrightSpell& Spell);
	bool JudgeAndBegin(const FSpellwrightSpell& Spell, FPrimordiaCycleReport& Report);
	bool CompileIntent(const FSpellwrightIntent& Intent, FSpellwrightSpell& OutSpell, FString& OutError) const;
	void FailGoalAttempt(FPrimordiaGoal& Goal, const FString& Why, double Now);
	void HandleRunFinished(const FPrimordiaSpellRun& Run);
	void HandleBoltEvent(const FBoltEvent& Event);

	FSpellwrightStepResult ExecuteWorldStep(const FSpellwrightStep& Step);
	FSpellwrightStepResult ExecuteLoreStep(const FSpellwrightStep& Step);
	FSpellwrightStepResult ExecutePipelineStep(const FSpellwrightStep& Step, FSpellwrightStepCallback OnComplete);
	TArray<AActor*> FindActors(const FString& TagOrName) const;
	void Say(const FString& Text, const FColor& Color) const;

	FPrimordiaWorldState Collector;
	FPrimordiaWorldSnapshot LastSnapshot;
	bool bHaveSnapshot = false;
	FPrimordiaMemory Memory;
	FPrimordiaPlanner Planner;
	FPrimordiaIntentRouter Router;
	TSharedPtr<FPrimordiaActionExecutor> Executor;
	TSharedPtr<FPrimordiaRuleModel> RuleModel;
	TSharedPtr<IPrimordiaModelBridge> Model;

	TArray<FPrimordiaGoal> Goals;
	TArray<FPrimordiaGoal> IncomingGoals;
	bool bInCycle = false;
	TArray<FSpellwrightIntent> QueuedIntents;
	TArray<FSpellwrightSpell> QueuedSpells;
	FName Realm;
	double Accumulator = 0.0;
	double NextModelTime = 0.0;
	int64 CycleCount = 0;
	int64 GoalCounter = 0;
	bool bPaused = false;
	FPrimordiaCycleReport LastReport;
	FDelegateHandle BoltEventHandle;
	FString MemoryPath;
};
