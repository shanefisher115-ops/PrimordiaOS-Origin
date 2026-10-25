#pragma once

#include "CoreMinimal.h"
#include "SpellwrightTypes.h"

/**
 * Structural validation: a spell that passes can be routed and executed (whether it is *allowed*
 * is Jules' question, not this one's).
 *
 * Checks: a valid name; 1..MaxSteps steps; every op registered; required targets and args present;
 * argument values of the right type and among the allowed choices; unique labels; "after" labels
 * that exist and come earlier (so the graph is acyclic); ${label.key} references that name a step
 * the referencing step depends on, directly or transitively.
 */
class PRIMORDIASPELLWRIGHT_API FSpellwrightValidator
{
public:
	int32 MaxSteps = 64;
	bool bUnknownArgsAreErrors = false;

	TArray<FSpellwrightIssue> Validate(const FSpellwrightSpell& Spell) const;

	static bool HasErrors(const TArray<FSpellwrightIssue>& Issues);

	/** Steps in an order where every step comes after its dependencies. False if there is a cycle. */
	static bool TopologicalOrder(const FSpellwrightSpell& Spell, TArray<int32>& OutOrder);

	/** The ${label.key} references in a value. */
	static TArray<TPair<FName, FString>> FindReferences(const FString& Value);
};
