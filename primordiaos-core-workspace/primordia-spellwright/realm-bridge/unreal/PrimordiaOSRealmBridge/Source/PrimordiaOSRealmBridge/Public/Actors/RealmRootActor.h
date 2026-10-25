#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "PrimordiaTypes.h"
#include "PrimordiaRealmComposition.h"
#include "RealmRootActor.generated.h"

class UInstancedStaticMeshComponent;
class UStaticMeshComponent;
class UExponentialHeightFogComponent;
class UPostProcessComponent;
class UMaterialInstanceDynamic;
class UPrimordiaRealmGenerator;
class ASoulGlyphActor;
class ACosmicWebActor;

/** Runtime state of one scatter tier of a layer: one (H)ISM per mesh variant. */
USTRUCT()
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaTierRuntime
{
	GENERATED_BODY()

	UPROPERTY() TArray<TObjectPtr<UInstancedStaticMeshComponent>> Variants;
	/** Only when the tier has its own material; otherwise it shares the layer MID. */
	UPROPERTY() TObjectPtr<UMaterialInstanceDynamic> MID;

	/** Deterministic candidates; density shows a prefix of them (PRS-1 §4.3). */
	FPrimordiaTierCandidates Candidates;
	/** Candidate indices dealt to each variant, ascending. */
	TArray<TArray<int32>> VariantCandidates;
	/** Per variant: maps the mesh into the tier's 100 cm box (identity unless the tier art fits its meshes). */
	TArray<FMatrix> VariantFit;
	int32 ShownCount = -1;
};

/** Runtime state of one generated PRS-1 layer. */
USTRUCT()
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaLayerRuntime
{
	GENERATED_BODY()

	UPROPERTY() TObjectPtr<USceneComponent> Root;
	UPROPERTY() TObjectPtr<UStaticMeshComponent> Base;
	UPROPERTY() TObjectPtr<UMaterialInstanceDynamic> MID;
	/** Fixed, hero and detail tiers that have candidates, in that order. */
	UPROPERTY() TArray<FPrimordiaTierRuntime> Tiers;

	FName Kind;
	uint32 Signature = 0;
	/** Ground layers only: the terrace height field other layers stand on. */
	FPrimordiaGroundSurface Surface;
};

/**
 * Procedural realm container (PRS-1 §6). Holds generated layers, manifest
 * glyphs and the topology web; every live PrimordiaOS entity attaches here,
 * so moving/rotating/scaling this actor moves the whole realm.
 *
 * Metaphysics changes are eased over the manifest's transition_seconds.
 */
UCLASS(Blueprintable)
class PRIMORDIAOSREALMBRIDGE_API ARealmRootActor : public AActor
{
	GENERATED_BODY()

public:
	ARealmRootActor();

	/** Generates the realm, or diffs it against the current one when RealmId matches. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm")
	void ApplyManifest(const FPrimordiaRealmManifest& InManifest);

	/** Tears everything down and rebuilds from Manifest.SourceJson. */
	UFUNCTION(BlueprintCallable, CallInEditor, Category = "PrimordiaOS|Realm")
	void Regenerate();

	/** Destroys generated layers, glyphs, topology and this actor. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm")
	void DestroyRealm();

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Realm")
	FString GetRealmId() const { return Manifest.RealmId; }

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Realm")
	FPrimordiaMetaphysics GetCurrentMetaphysics() const { return CurrentMetaphysics; }

	void SetGenerator(UPrimordiaRealmGenerator* InGenerator) { Generator = InGenerator; }
	UPrimordiaRealmGenerator* GetOrCreateGenerator();

	/** Starts easing toward Target; Seconds <= 0 applies immediately. */
	void SetTargetMetaphysics(const FPrimordiaMetaphysics& Target, float Seconds);

	/**
	 * Shows what the metaphysics mean through the realm's own fog and colour grade
	 * (PrimordiaRealmAtmosphere.h). The fog stands down when the level already has one.
	 */
	void ApplyAtmosphere(const FPrimordiaMetaphysics& Metaphysics);

	/** Raised after each (re)generation. */
	UFUNCTION(BlueprintImplementableEvent, Category = "PrimordiaOS|Realm")
	void OnRealmGenerated(const FPrimordiaRealmManifest& GeneratedManifest);

	/** Raised when a metaphysics transition completes. */
	UFUNCTION(BlueprintImplementableEvent, Category = "PrimordiaOS|Realm")
	void OnMetaphysicsSettled(const FPrimordiaMetaphysics& Metaphysics);

	virtual void Tick(float DeltaSeconds) override;
	virtual bool ShouldTickIfViewportsOnly() const override { return true; }
	virtual void Destroyed() override;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Realm")
	FPrimordiaRealmManifest Manifest;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Realm")
	TObjectPtr<USceneComponent> RealmRoot;

	/** Realm haze driven by metaphysics (inactive when the level has its own height fog). */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Realm")
	TObjectPtr<UExponentialHeightFogComponent> AtmosphereFog;

	/** Unbound colour grade driven by metaphysics; priority -10, so the level's own volumes win where they set a value. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Realm")
	TObjectPtr<UPostProcessComponent> AtmosphereGrade;

	// Populated by UPrimordiaRealmGenerator. (Not "Layers": that would shadow AActor::Layers.)
	UPROPERTY(Transient) TMap<FString, FPrimordiaLayerRuntime> RealmLayers;
	UPROPERTY(Transient) TMap<FString, TObjectPtr<ASoulGlyphActor>> Glyphs;
	UPROPERTY(Transient) TObjectPtr<ACosmicWebActor> Topology;
	UPROPERTY(Transient) FPrimordiaTopologySpec AppliedTopology;
	bool bHasTopology = false;

protected:
	virtual void BeginPlay() override;

private:
	UPROPERTY(Transient) TObjectPtr<UPrimordiaRealmGenerator> Generator;
	UPROPERTY(Transient) FPrimordiaMetaphysics CurrentMetaphysics;

	FPrimordiaMetaphysics FromMetaphysics;
	FPrimordiaMetaphysics TargetMetaphysics;
	float TransitionElapsed = 0.f;
	float TransitionDuration = 0.f;
	bool bTransitioning = false;
	bool bTearingDown = false;
	/** Set once the fog has checked the level for a height fog of its own. */
	bool bFogChecked = false;
};
