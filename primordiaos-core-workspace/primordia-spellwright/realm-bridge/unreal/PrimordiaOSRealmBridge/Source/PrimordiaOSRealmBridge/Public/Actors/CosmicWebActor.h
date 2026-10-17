#pragma once

#include "CoreMinimal.h"
#include "Actors/PrimordiaVisualActor.h"
#include "CosmicWebActor.generated.h"

class UInstancedStaticMeshComponent;
class USplineMeshComponent;
class UMaterialInstanceDynamic;
struct FPrimordiaTopologyGraph;

/**
 * cosmic_web -> resonance graph.
 *  Nodes: one instanced static mesh; per-instance custom data
 *         [0]=resonance [1]=mass [2]=kind (0 mote, 1 star, 2 nexus) [3]=selection.
 *  Edges: pooled USplineMeshComponents, rebuilt only when `rev` changes;
 *         endpoints follow the smoothed nodes every frame. Custom primitive
 *         data [0]=weight [1]=mean resonance of the two endpoints.
 *
 * Node material (M_PrimordiaCosmicNode) reads PerInstanceCustomData 0..2.
 * Edge material (M_PrimordiaCosmicEdge) reads CustomPrimitiveData 0..1.
 */
UCLASS(Blueprintable)
class PRIMORDIAOSREALMBRIDGE_API ACosmicWebActor : public APrimordiaVisualActor
{
	GENERATED_BODY()

public:
	ACosmicWebActor();

	virtual void ApplyPayload(const TSharedPtr<FJsonObject>& Payload) override;
	virtual void Tick(float DeltaSeconds) override;

	/** Seeds the web from an offline-synthesized topology (realm generator). Live packets replace it. */
	void BuildFromGraph(const FPrimordiaTopologyGraph& Graph, const FVector& CenterMeters);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|CosmicWeb")
	int32 GetNodeCount() const { return CurrentPositions.Num(); }

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|CosmicWeb")
	int32 GetEdgeCount() const { return Edges.Num(); }

	/** Node diameter in cm at mass 1. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|CosmicWeb")
	float NodeBaseSize = 60.f;

	/** Edge thickness in cm at weight 1. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|CosmicWeb")
	float EdgeThickness = 6.f;

	/** How far edges sag toward the web center, as a fraction of their length. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|CosmicWeb")
	float EdgeCurvature = 0.15f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|CosmicWeb")
	float NodeSmoothing = 10.f;

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|CosmicWeb")
	int32 TopologyRevision = -1;

protected:
	virtual void OnConstruction(const FTransform& Transform) override;
	virtual void UpdateRetireFade(float Alpha) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|CosmicWeb")
	TObjectPtr<UInstancedStaticMeshComponent> Nodes;

	UPROPERTY(Transient)
	TArray<TObjectPtr<USplineMeshComponent>> EdgePool;

	UPROPERTY(Transient) TObjectPtr<UMaterialInstanceDynamic> NodeMID;
	UPROPERTY(Transient) TObjectPtr<UMaterialInstanceDynamic> EdgeMID;

private:
	void EnsureAssets();
	void ResizeNodes(int32 Count);
	void RebuildEdges(const TArray<TSharedPtr<FJsonValue>>& EdgeArray);
	void SyncEdgePool();
	void UpdateEdgeSplines();

	struct FEdge { int32 A; int32 B; float Weight; };
	TArray<FEdge> Edges;
	TArray<FVector> TargetPositions;
	TArray<FVector> CurrentPositions;
	TArray<float> Resonance;
	TArray<float> Mass;
	TArray<float> Kind;
	bool bInstancesDirty = false;
};
