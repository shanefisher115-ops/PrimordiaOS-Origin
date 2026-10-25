#pragma once

#include "CoreMinimal.h"
#include "CognitionTypes.h"
#include "PrimordiaPlanner.h"

/** Everything a model sees when asked what to do next. */
struct PRIMORDIACOGNITION_API FPrimordiaModelRequest
{
	FPrimordiaWorldSnapshot World;
	FString WorldSummary;
	TArray<FPrimordiaMemoryRecord> Memories;
	/** Lore lines relevant to the moment ("title: text"). */
	TArray<FString> Lore;
	TArray<FPrimordiaGoal> ActiveGoals;
	/** Compound tasks the planner knows, plus "intent:<verb>" for every spell verb. */
	TArray<FString> KnownTasks;
	double Now = 0.0;
};

struct PRIMORDIACOGNITION_API FPrimordiaModelResponse
{
	bool bOk = false;
	TArray<FPrimordiaGoal> Goals;
	FString Thought;
	FString Error;
};

using FPrimordiaModelCallback = TFunction<void(const FPrimordiaModelResponse&)>;

/** Pluggable model interface: something that proposes goals. Implementations may answer asynchronously. */
class PRIMORDIACOGNITION_API IPrimordiaModelBridge
{
public:
	virtual ~IPrimordiaModelBridge() = default;
	virtual FName GetName() const = 0;
	virtual bool IsBusy() const = 0;
	/** Must call Callback exactly once, on the game thread. */
	virtual void Propose(const FPrimordiaModelRequest& Request, FPrimordiaModelCallback Callback) = 0;
};

/** Deterministic: proposes a trigger's goal when its condition holds and its cooldown has passed. */
class PRIMORDIACOGNITION_API FPrimordiaRuleModel : public IPrimordiaModelBridge
{
public:
	TArray<FPrimordiaTrigger> Triggers;

	virtual FName GetName() const override { return TEXT("rules"); }
	virtual bool IsBusy() const override { return false; }
	virtual void Propose(const FPrimordiaModelRequest& Request, FPrimordiaModelCallback Callback) override;

private:
	TMap<FName, double> LastFired;
};

/**
 * A local Ollama model (POST /api/chat, format=json). The system prompt lists the tasks it may
 * propose; replies are parsed and every goal naming an unknown task is dropped, so the model can
 * only ask for things the planner knows how to do (and Jules still judges every spell).
 */
class PRIMORDIACOGNITION_API FPrimordiaOllamaModel : public IPrimordiaModelBridge, public TSharedFromThis<FPrimordiaOllamaModel>
{
public:
	FString Url = TEXT("http://127.0.0.1:11434");
	FString Model = TEXT("llama3.2:3b");
	float TimeoutSeconds = 90.f;
	int32 MaxGoals = 3;

	virtual FName GetName() const override { return TEXT("ollama"); }
	virtual bool IsBusy() const override { return bBusy; }
	virtual void Propose(const FPrimordiaModelRequest& Request, FPrimordiaModelCallback Callback) override;

	static FString BuildSystemPrompt(const TArray<FString>& KnownTasks);
	static FString BuildUserPrompt(const FPrimordiaModelRequest& Request);
	/** Parses {"thought": "...", "goals": [{"task", "params", "priority", "description", "satisfiedWhen"}]}. */
	static FPrimordiaModelResponse ParseReply(const FString& Content, const TArray<FString>& KnownTasks, int32 MaxGoals);

private:
	bool bBusy = false;
};
