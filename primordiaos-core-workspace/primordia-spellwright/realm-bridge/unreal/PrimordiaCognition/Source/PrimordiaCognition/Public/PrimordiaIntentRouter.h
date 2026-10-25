#pragma once

#include "CoreMinimal.h"
#include "SpellwrightTypes.h"

class FSpellwrightCompiler;

/** Runs one step; returns the immediate result, and calls the callback later if it returned Pending. */
using FPrimordiaStepHandler = TFunction<FSpellwrightStepResult(const FSpellwrightStep&, FSpellwrightStepCallback)>;

/**
 * Intent routing layer.
 *
 * Intents are routed to compilation when a Spellwright template exists for their verb (otherwise
 * they are refused with a reason). Steps are routed by op domain ("cadcam", "blender", "world"...)
 * to the engine registered for it; a handler registered for a full op name ("world.spawn") wins
 * over its domain's handler.
 */
class PRIMORDIACOGNITION_API FPrimordiaIntentRouter
{
public:
	void RegisterDomain(FName Domain, FPrimordiaStepHandler Handler) { Domains.Add(Domain, MoveTemp(Handler)); }
	void RegisterOp(FName Op, FPrimordiaStepHandler Handler) { Ops.Add(Op, MoveTemp(Handler)); }
	void Unregister(FName DomainOrOp) { Domains.Remove(DomainOrOp); Ops.Remove(DomainOrOp); }

	bool CanRouteStep(const FSpellwrightStep& Step) const;
	bool CanRouteIntent(const FSpellwrightIntent& Intent, const FSpellwrightCompiler& Compiler, FString& OutReason) const;

	/** Calls the handler; a step nobody handles fails immediately. */
	FSpellwrightStepResult RouteStep(const FSpellwrightStep& Step, FSpellwrightStepCallback OnComplete) const;

	TArray<FName> GetDomains() const;

private:
	const FPrimordiaStepHandler* FindHandler(const FSpellwrightStep& Step) const;

	TMap<FName, FPrimordiaStepHandler> Domains;
	TMap<FName, FPrimordiaStepHandler> Ops;
};
