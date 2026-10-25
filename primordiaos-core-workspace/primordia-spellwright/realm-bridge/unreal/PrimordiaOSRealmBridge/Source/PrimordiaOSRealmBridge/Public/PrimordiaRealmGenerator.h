#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "PrimordiaTypes.h"
#include "PrimordiaRealmGenerator.generated.h"

class ARealmRootActor;
class ASoulGlyphActor;
class ACosmicWebActor;
class UPrimordiaActorFactory;
struct FPrimordiaLayerRuntime;

/**
 * Turns PRS-1 manifests into Unreal content (docs/PRS-1.md §4 and §6).
 *
 * Generation is deterministic: every random choice comes from
 * FPrimordiaRandom seeded with SubSeed(realm seed, "<purpose>:<id>"), so the
 * same manifest yields the same realm on every machine. Re-applying a newer
 * revision of the same realm is a diff, not a rebuild:
 *   - each layer is composed into fixed / hero / detail tiers (PrimordiaRealmComposition.h),
 *     one instanced component per tier and mesh variant,
 *   - layers whose structure is unchanged only change their visible instance count,
 *     adding or removing instances at the tail of each tier,
 *   - glyphs are matched by id (updated / spawned / retired),
 *   - the topology web is re-synthesized only if its spec changed and no live
 *     cosmic_web stream is driving it,
 *   - metaphysics ease over transition_seconds.
 */
UCLASS(BlueprintType)
class PRIMORDIAOSREALMBRIDGE_API UPrimordiaRealmGenerator : public UObject
{
	GENERATED_BODY()

public:
	// Defined in the .cpp: TWeakObjectPtr assignment needs the complete factory type.
	void SetFactory(UPrimordiaActorFactory* InFactory);

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm")
	void GenerateRealmFromManifest(ARealmRootActor* Root, const FPrimordiaRealmManifest& Manifest);

	/** Builds one layer under Root (replacing a layer with the same id). Returns the layer's scene root. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm")
	USceneComponent* SpawnLayer(ARealmRootActor* Root, const FPrimordiaRealmLayer& Layer, int64 RealmSeed);

	/** Spawns (or updates) a manifest glyph. Glyphs with bound_to are adopted by the live stream of that id. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm")
	ASoulGlyphActor* SpawnGlyph(ARealmRootActor* Root, const FPrimordiaGlyphSpec& Glyph);

	/** Spawns the realm's cosmic web and seeds it from the offline topology synthesis. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm")
	ACosmicWebActor* SpawnTopology(ARealmRootActor* Root, const FPrimordiaTopologySpec& Topology, int64 RealmSeed);

	/** Pushes metaphysics into the parameter collection, layer materials and realm time dilation. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm")
	void ApplyMetaphysics(ARealmRootActor* Root, const FPrimordiaMetaphysics& Metaphysics);

	/** Removes all generated content from Root (layers, glyphs, topology). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm")
	void ClearRealm(ARealmRootActor* Root);

	/** Upper bound for candidates in any one tier of a layer, before density scaling. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Realm")
	int32 MaxScatterPerLayer = 2000;

	/** A cosmic_web packet newer than this (seconds) means the web is live and offline synthesis is skipped. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Realm")
	float LiveStreamGraceSeconds = 3.f;

private:
	/** Structural signature, plus the ground surface for layers that stand on it. */
	uint32 LayerSignature(const ARealmRootActor* Root, const FPrimordiaRealmLayer& Layer) const;
	void ApplyDensity(FPrimordiaLayerRuntime& Runtime, float Density) const;
	void DestroyLayer(FPrimordiaLayerRuntime& Runtime) const;
	void RetireGlyph(ARealmRootActor* Root, ASoulGlyphActor* Glyph) const;

	TWeakObjectPtr<UPrimordiaActorFactory> Factory;
};
