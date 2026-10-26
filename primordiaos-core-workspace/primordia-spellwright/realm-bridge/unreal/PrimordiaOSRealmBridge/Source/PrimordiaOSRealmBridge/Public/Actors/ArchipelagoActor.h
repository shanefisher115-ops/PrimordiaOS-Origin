#pragma once

#include "CoreMinimal.h"
#include "Actors/PrimordiaVisualActor.h"
#include "PrimordiaTypes.h"
#include "ArchipelagoActor.generated.h"

class ARealmRootActor;
class UInstancedStaticMeshComponent;

/**
 * The archipelago ("world_manifest", docs/ARCHIPELAGO.md): many realms across the cloud sea around
 * the live one. Every island gets a floating rock underside; distant islands show a disc and glowing
 * spire silhouettes; islands near the camera are generated as full realms (ARealmRootActor, which
 * leaves the scene's atmosphere to the live realm) and released again when you leave. Sky-bridges
 * between islands are walkable plank decks with lamp posts. Everything repeated is instanced.
 */
UCLASS()
class PRIMORDIAOSREALMBRIDGE_API AArchipelagoActor : public APrimordiaVisualActor
{
	GENERATED_BODY()

public:
	AArchipelagoActor();

	virtual void ApplyPayload(const TSharedPtr<FJsonObject>& Payload) override;
	virtual void Tick(float DeltaSeconds) override;
	/** The world never times out: it changes only when the bridge sends a new one. */
	virtual bool IsBusy() const override { return true; }

	/** An island closer than this (m, centre to camera) is generated as a full realm. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|World") float LoadMeters = 650.f;
	/** A generated island farther than this (m) is released back to its silhouette. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|World") float UnloadMeters = 800.f;

	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS|World") FString WorldId;
	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS|World") int32 LoadedIslands = 0;

protected:
	virtual void Destroyed() override;

private:
	struct FIsland
	{
		FString Id;
		FString Name;
		bool bHome = false;
		FVector Position = FVector::ZeroVector; // cm, world
		double Radius = 12000.0;               // cm
		float Hue = 0.f;
		bool bHasManifest = false;
		FPrimordiaRealmManifest Manifest;
		TWeakObjectPtr<ARealmRootActor> Realm;
		TArray<int32> SilhouetteDiscs, SilhouetteSpires; // instance indices to hide while loaded
		TArray<FTransform> DiscShapes, SpireShapes;      // their transforms, to show them again
	};

	void Build();
	void SetSilhouette(FIsland& Isle, bool bVisible);
	void Load(FIsland& Isle);
	void Unload(FIsland& Isle);
	UInstancedStaticMeshComponent* MakeISM(const TCHAR* Name, const TCHAR* Mesh, UMaterialInterface* Material, bool bCollide, bool bShadow);

	TArray<FIsland> Islands;
	TArray<TPair<FString, FString>> Bridges;
	bool bBuilt = false;
	float StreamClock = 0.f;

	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Undersides;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Discs;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Spires;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Planks;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Posts;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Lamps;
};
