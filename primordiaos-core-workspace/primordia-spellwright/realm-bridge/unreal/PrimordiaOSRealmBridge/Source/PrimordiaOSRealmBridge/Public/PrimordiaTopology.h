#pragma once

#include "CoreMinimal.h"
#include "PrimordiaTypes.h"

/**
 * mulberry32 + FNV-1a, bit-identical to node-bridge/src/prng.js so realms
 * synthesized offline match the ones PrimordiaOS streams (PRS-1 §4.1).
 */
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaRandom
{
	explicit FPrimordiaRandom(uint32 Seed) : State(Seed) {}

	/** Uniform double in [0, 1). */
	double Next();
	float Range(float Min, float Max) { return Min + static_cast<float>(Next()) * (Max - Min); }

	static uint32 HashString(const FString& Str);
	static uint32 SubSeed(uint32 Seed, const FString& Label) { return Seed ^ HashString(Label); }

private:
	uint32 State;
};

struct FPrimordiaTopologyGraph
{
	/** Node positions in meters, relative to the topology center. */
	TArray<FVector> Nodes;
	/** (a, b) node indices + weight. */
	TArray<TTuple<int32, int32, float>> Edges;
};

namespace PrimordiaTopology
{
	/** Port of node-bridge/src/realm/topology.js:synthesizeTopology. */
	PRIMORDIAOSREALMBRIDGE_API FPrimordiaTopologyGraph Synthesize(const FPrimordiaTopologySpec& Spec, uint32 Seed);
}
