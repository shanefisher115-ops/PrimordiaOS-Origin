#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "PrimordiaTypes.h"
#include "RealmRootActor.generated.h"

class UInstancedStaticMeshComponent;
class UStaticMeshComponent;
class UMaterialInstanceDynamic;
class UPrimordiaRealmGenerator;
class ASoulGlyphActor;
class ACosmicWebActor;

/** Runtime state of one generated PRS-1 layer. */
USTRUCT()
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaLayerRuntime
{
	GENERATED_BODY()

	UPROPERTY() TObjectPtr<USceneComponent> Root;
	UPROPERTY() TObjectPtr<UStaticMeshComponent> Base;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Instances;
	UPROPERTY() TObjectPtr<UMaterialInstanceDynamic> MID;

	FName Kind;
	uint32 Signature = 0;
	/** Deterministic candidate transforms; the first FixedCount always show, then density picks a prefix of the rest. */
	TArray<FTransform> Candidates;
	int32 FixedCount = 0;
	int32 ShownCount = -1;
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
};
