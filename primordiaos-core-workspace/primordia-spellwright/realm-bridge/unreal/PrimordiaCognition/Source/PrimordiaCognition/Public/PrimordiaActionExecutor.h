#pragma once

#include "CoreMinimal.h"
#include "CognitionTypes.h"
#include "SpellwrightTypes.h"

class FPrimordiaIntentRouter;

/** A spell being executed. */
struct PRIMORDIACOGNITION_API FPrimordiaSpellRun
{
	FSpellwrightSpell Spell;
	TArray<EPrimordiaStepState> States;
	TArray<FSpellwrightStepResult> Results;
	TArray<double> StepStartedAt;
	/** "<label>.<key>" -> value, from finished steps' outputs. */
	TMap<FString, FString> Context;
	double StartedAt = 0.0;
	bool bFinished = false;
	bool bSucceeded = false;

	FPrimordiaRunStatus ToStatus() const;
};

/**
 * Action execution layer. Each approved spell runs as a dependency graph: a step starts once every
 * step in its "after" list has succeeded, with ${label.key} references replaced by those steps'
 * outputs. Steps that return Pending (pipeline jobs) finish through their callback, or fail after
 * StepTimeoutSeconds. A failed step skips everything that depends on it; independent steps go on.
 */
class PRIMORDIACOGNITION_API FPrimordiaActionExecutor : public TSharedFromThis<FPrimordiaActionExecutor>
{
public:
	double StepTimeoutSeconds = 3600.0;
	int32 FinishedRunsKept = 32;

	TFunction<void(const FPrimordiaSpellRun&)> OnRunFinished;
	TFunction<void(const FPrimordiaSpellRun&, int32 /*StepIndex*/)> OnStepFinished;

	void Begin(const FSpellwrightSpell& Spell, double Now);

	/** Starts every step that is ready and times out stuck ones. Returns how many steps started. */
	int32 Advance(const FPrimordiaIntentRouter& Router, double Now);

	bool Cancel(const FGuid& SpellId);
	int32 NumActive() const;
	TArray<FPrimordiaRunStatus> GetStatus() const;
	const FPrimordiaSpellRun* FindRun(const FGuid& SpellId) const;

	/** Replaces ${label.key} in the step's target and args. False (with the missing reference) if one is unknown. */
	static bool ResolveStep(const FSpellwrightStep& In, const TMap<FString, FString>& Context, FSpellwrightStep& Out, FString& OutMissing);

private:
	void CompleteStep(const FGuid& SpellId, int32 Step, const FSpellwrightStepResult& Result);
	void SkipDependents(FPrimordiaSpellRun& Run, int32 Failed);
	void CheckFinished(const FGuid& SpellId);

	TMap<FGuid, TSharedPtr<FPrimordiaSpellRun>> Runs;
	TArray<FGuid> FinishedOrder;
};
