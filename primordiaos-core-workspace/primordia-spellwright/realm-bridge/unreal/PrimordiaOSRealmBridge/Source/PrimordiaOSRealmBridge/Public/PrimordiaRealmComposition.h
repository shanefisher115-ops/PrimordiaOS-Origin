#pragma once

#include "CoreMinimal.h"
#include "PrimordiaTypes.h"

/**
 * Layer composition (docs/PRS-1.md §4.3): turns one manifest layer into ordered
 * candidate lists for up to three tiers. Pure and deterministic: no engine
 * objects, every random choice comes from the layer's tier streams
 * (the primary tier uses "layer:<id>", the others "layer:<id>:<tier>").
 *
 * Every candidate carries 4 floats of PerInstanceCustomData
 * (docs/MATERIALS_AND_NIAGARA.md §7):
 *   [0] stable random 0..1   [1] size within its tier 0..1
 *   [2] radial position 0..1 [3] kind-specific (terrace step, cluster weight, orbit phase, band weight...)
 */
enum class EPrimordiaTier : uint8
{
	/** Always shown, ignores density (ground terraces, the void's core). */
	Fixed,
	/** Few large pieces, shown as a density prefix. */
	Hero,
	/** Many small pieces; a density prefix, or gated by the hero prefix (see Requires). */
	Detail,
};

/** Terraced ground height field, shared with layers that stand on the ground (spire_field). */
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaGroundSurface
{
	/** Altitude of the ground layer's root, cm. */
	float Altitude = 0.f;
	/** Index 0 is the base disc (top at 0); terrace t sits inside terrace t-1. */
	TArray<FVector2f> Centers;
	TArray<float> Radii;
	TArray<float> Tops;
	/** Changes whenever the surface does: layers standing on it fold it into their signature. */
	uint32 Hash = 0;

	bool IsValid() const { return Radii.Num() > 0; }
	/** Index of the highest terrace containing (X, Y), or INDEX_NONE outside the ground. */
	int32 TerraceAt(float X, float Y) const;
	/** Height of the walkable top at (X, Y), relative to the ground root; 0 outside the ground. */
	float HeightAt(float X, float Y) const;
};

struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaTierCandidates
{
	EPrimordiaTier Tier = EPrimordiaTier::Hero;
	/** Component name prefix ("Terraces", "Monoliths", ...). */
	const TCHAR* Name = TEXT("Scatter");
	/** Engine basic shape used when no art is assigned. */
	const TCHAR* FallbackMesh = nullptr;
	/** The tier that held the layer's single scatter before tiers existed: legacy LayerMeshes apply here. */
	bool bPrimary = false;
	bool bCastShadow = false;
	bool bCollide = false;
	/** Default cull distance, cm; 0 = never culled. */
	float CullDistance = 0.f;

	TArray<FTransform> Transforms;
	TArray<FVector4f> Data;
	/**
	 * Optional gating, ascending: candidate i shows only while the hero prefix covers
	 * hero candidate Requires[i] (-1 = always). Gated tiers ignore the layer density
	 * themselves and follow their hero tier instead (rubble follows its monolith).
	 */
	TArray<int32> Requires;

	bool IsGated() const { return Requires.Num() > 0; }
	int32 Num() const { return Transforms.Num(); }
	void Add(const FTransform& T, const FVector4f& D) { Transforms.Add(T); Data.Add(D); }
	void AddGated(const FTransform& T, const FVector4f& D, int32 Hero) { Add(T, D); Requires.Add(Hero); }
};

struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaLayerComposition
{
	/** At most one entry per tier, in tier order (Fixed, Hero, Detail). */
	TArray<FPrimordiaTierCandidates> Tiers;
	/** Filled for ground layers. */
	FPrimordiaGroundSurface Surface;
};

namespace PrimordiaComposition
{
	/**
	 * @param MaxPerTier  upper bound on candidates in any tier (UPrimordiaRealmGenerator::MaxScatterPerLayer).
	 * @param Ground      the realm's ground surface, if any; used by kinds that stand on it.
	 */
	PRIMORDIAOSREALMBRIDGE_API FPrimordiaLayerComposition Compose(const FPrimordiaRealmLayer& Layer, uint32 RealmSeed, int32 MaxPerTier, const FPrimordiaGroundSurface* Ground);

	/** True for kinds whose pieces stand on a ground layer at (nearly) the same altitude. */
	PRIMORDIAOSREALMBRIDGE_API bool StandsOnGround(const FPrimordiaRealmLayer& Layer, const FPrimordiaGroundSurface& Ground);
}
