#pragma once

#include "CoreMinimal.h"
#include "LoreTypes.h"

class FLoreCodex;

/** What one evolution pass changed. */
struct PRIMORDIALOREENGINE_API FLoreEvolution
{
	int32 FromEra = 0;
	int32 ToEra = 0;
	TArray<FLoreEvent> Events;
};

/**
 * Dynamic lore evolution. Deterministic: the same codex, seed and era always produce the same
 * history, so two machines evolving the same realm agree.
 *
 * Per era:
 *  - rival factions sharing a realm contest it: the stronger gains influence, the realm loses stability
 *    in proportion to how evenly matched they are;
 *  - allied factions sharing a realm reinforce its coherence;
 *  - every realm's entropy pulls its stability down and its coherence pulls it back up;
 *  - a realm whose stability falls below the fracture threshold suffers a Fracture (a recorded event
 *    that raises inversion and entropy); one above the ascension threshold with high coherence
 *    suffers an Ascension (luminosity and resonance rise).
 */
class PRIMORDIALOREENGINE_API FLoreEvolver
{
public:
	float FractureThreshold = 0.25f;
	float AscensionThreshold = 0.92f;
	float RivalryPressure = 0.06f;
	float AllianceBond = 0.02f;
	float EntropyDrag = 0.04f;
	float CoherenceLift = 0.035f;

	/** Applies an event to the codex: shifts metaphysics, stability and influence, records it in history. */
	static void ApplyEvent(FLoreCodex& Codex, FLoreEvent Event);

	/** Advances the codex by Eras eras. */
	FLoreEvolution Evolve(FLoreCodex& Codex, int32 Eras, int32 Seed) const;

	/** Renormalizes faction influence to sum to 1 (or leaves it alone if the sum is zero). */
	static void NormalizeInfluence(FLoreCodex& Codex);

private:
	void EvolveOneEra(FLoreCodex& Codex, int32 Seed, FLoreEvolution& Out) const;
};
