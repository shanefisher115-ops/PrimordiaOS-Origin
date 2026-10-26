#pragma once

#include "CoreMinimal.h"
#include "Actors/PrimordiaVisualActor.h"
#include "SpeciesActor.generated.h"

class UInstancedStaticMeshComponent;
class UStaticMesh;
class UMaterialInstanceDynamic;

/** How a species lives in the realm (the bridge picks it from the archetype; docs/SOVEREIGN.md). */
UENUM(BlueprintType)
enum class EPrimordiaManifestation : uint8
{
	Rooted,     // Photosynthetic, Fungal: clusters that stay put and breathe
	Individual, // Predatory, Synthetic: bodies that roam the ground
	Swarm,      // Collective: a flock that drifts over the terraces
	Floating,   // Elemental, Spectral: shards that hover and turn
	Abyssal,    // Abyssal: great shapes circling in the cloud sea below the realm
};

/**
 * One living species of the Primordia Sovereign ("species:<slug>"). The bridge decides what
 * it is (manifestation, body count, home, range, colour, size, speed); this actor draws the
 * bodies as two instanced meshes (a body and a glowing accent) and moves them every frame.
 * Bodies stand on the world's real ground, found by downward traces cached per body.
 */
UCLASS()
class PRIMORDIAOSREALMBRIDGE_API ASpeciesActor : public APrimordiaVisualActor
{
	GENERATED_BODY()

public:
	ASpeciesActor();

	virtual void ApplyPayload(const TSharedPtr<FJsonObject>& Payload) override;
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS|Species") FString SpeciesName;
	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS|Species") FString Archetype;
	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS|Species") EPrimordiaManifestation Manifestation = EPrimordiaManifestation::Individual;
	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS|Species") int32 Population = 0;
	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS|Species") int32 Bodies = 0;
	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS|Species") FString Look;
	/** Beyond this distance from the camera (m) the species is hidden and not simulated (far islands). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Species") float FarCullMeters = 900.f;

protected:
	virtual void UpdateRetireFade(float Alpha) override { FadeAlpha = Alpha; }

private:
	struct FBody
	{
		FVector Pos = FVector::ZeroVector;   // world
		FVector Offset = FVector::ZeroVector; // from home, unit-range space (rooted, floating, swarm)
		float Heading = 0.f;                  // radians
		float Phase = 0.f;
		float Rate = 1.f;                     // per-body speed / orbit multiplier
		float Scale = 1.f;
		FVector2D TracedAt = FVector2D::ZeroVector;
		double GroundZ = 0.0;
		bool bTraced = false;
	};

	void BuildForm();
	void ResizeBodies(int32 Count);
	double Ground(FBody& B, const FVector& At);
	void Simulate(float Dt);
	void Draw();

	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> BodyMesh;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> AccentMesh;
	UPROPERTY() TObjectPtr<UMaterialInstanceDynamic> BodyMID;

	TArray<FBody> Swarm;
	FLinearColor SpeciesColor = FLinearColor::White;
	float Glow = 2.f;
	float SizeMeters = 1.f;
	float SpeedMps = 1.f;
	float RangeMeters = 10.f;
	int32 Seed = 0;
	bool bFormBuilt = false;
	/** A real creature mesh from the bridge ("mesh": an asset path); empty = the manifestation's engine shapes. */
	FString MeshPath;
	UPROPERTY() TObjectPtr<UStaticMesh> CustomMesh;
	EPrimordiaManifestation BuiltFor = EPrimordiaManifestation::Individual;
	float Time = 0.f;
	float FadeAlpha = 1.f;
	FVector FlockCentre = FVector::ZeroVector;
	bool bFlockPlaced = false;
	double FlockGroundZ = 0.0;
	FVector2D FlockTracedAt = FVector2D::ZeroVector;
};
