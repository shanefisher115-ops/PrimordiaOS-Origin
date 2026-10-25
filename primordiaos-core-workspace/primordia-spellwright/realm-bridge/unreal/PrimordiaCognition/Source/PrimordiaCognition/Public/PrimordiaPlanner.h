#pragma once

#include "CoreMinimal.h"
#include "CognitionTypes.h"
#include "SpellwrightTypes.h"
#include "PrimordiaPlanner.generated.h"

/** One step of a method: a compound task, or "intent:<verb>" (a spell), or "noop" (effects only). */
USTRUCT(BlueprintType)
struct PRIMORDIACOGNITION_API FPrimordiaSubtask
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Planner") FString Task;
	/** Values may use ${param} (the parent task's params) and ${fact:key} (the planning state). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Planner") TMap<FString, FString> Params;
	/** "key=value" written into the planning state when this subtask is planned. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Planner") TArray<FString> Effects;
};

/** One way to accomplish a compound task. Methods for a task are tried in order. */
USTRUCT(BlueprintType)
struct PRIMORDIACOGNITION_API FPrimordiaMethod
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Planner") FString Task;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Planner") FString Name;
	/** Fact expressions that must all hold. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Planner") TArray<FString> Preconditions;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Planner") TArray<FPrimordiaSubtask> Subtasks;
};

/** A standing rule: when its condition holds, propose a goal (the deterministic model). */
USTRUCT(BlueprintType)
struct PRIMORDIACOGNITION_API FPrimordiaTrigger
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Planner") FName Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Planner") FString When;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Planner") FPrimordiaGoal Goal;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Planner") float CooldownSeconds = 60.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Planner") bool bEnabled = true;
};

struct PRIMORDIACOGNITION_API FPrimordiaPlan
{
	bool bSuccess = false;
	TArray<FSpellwrightIntent> Intents;
	/** Which methods were chosen, for logs and memory. */
	TArray<FString> Trace;
	FString Error;
};

/**
 * Multi-step planning engine: a hierarchical task network over facts.
 *
 * A goal names a task. Compound tasks decompose through the first method whose preconditions hold;
 * each subtask is planned against the state the earlier ones leave (their effects), and if any
 * subtask cannot be planned the next method is tried (backtracking). Primitive "intent:<verb>"
 * subtasks become Spellwright intents.
 *
 * Expressions: "a && b", "a || b", "exists key", "!exists key", "key", "!key",
 * "key == v", "!=", "<", "<=", ">", ">=" (numeric when both sides are numbers).
 */
class PRIMORDIACOGNITION_API FPrimordiaPlanner
{
public:
	int32 MaxDepth = 16;

	bool LoadMethodsFromJson(const FString& Json, FString& OutError);
	bool LoadTriggersFromJson(const FString& Json, TArray<FPrimordiaTrigger>& OutTriggers, FString& OutError) const;
	void AddMethod(const FPrimordiaMethod& Method) { Methods.Add(Method); }
	const TArray<FPrimordiaMethod>& GetMethods() const { return Methods; }
	TArray<FString> GetCompoundTasks() const;
	bool IsKnownTask(const FString& Task) const;

	FPrimordiaPlan Plan(const FPrimordiaGoal& Goal, const TMap<FString, FString>& Facts) const;

	static bool Evaluate(const FString& Expression, const TMap<FString, FString>& Facts, const TMap<FString, FString>& Params);
	static FString Substitute(const FString& Text, const TMap<FString, FString>& Facts, const TMap<FString, FString>& Params);

private:
	bool Decompose(const FString& Task, const TMap<FString, FString>& Params, TMap<FString, FString>& State, int32 Depth, FPrimordiaPlan& Out) const;
	static bool EvaluateAtom(const FString& Atom, const TMap<FString, FString>& Facts, const TMap<FString, FString>& Params);

	TArray<FPrimordiaMethod> Methods;
};
