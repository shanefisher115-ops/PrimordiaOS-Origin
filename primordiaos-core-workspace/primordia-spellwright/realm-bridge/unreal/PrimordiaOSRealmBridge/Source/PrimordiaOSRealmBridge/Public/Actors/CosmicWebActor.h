#pragma once

#include "CoreMinimal.h"
#include "Actors/PrimordiaVisualActor.h"
#include "CosmicWebActor.generated.h"

class UInstancedStaticMeshComponent;
class UMaterialInstanceDynamic;
struct FPrimordiaTopologyGraph;

/**
 * cosmic_web -> resonance graph. Two draw paths in total, whatever the graph size.
 *  Nodes: one instanced static mesh; per-instance custom data
 *         [0]=resonance [1]=mass [2]=kind (0 mote, 1 star, 2 nexus) [3]=selection.
 *  Edges: one instanced static mesh of straight cylinder segments, EdgeSegments per
 *         edge, laid along each edge's sag curve. The edge list is rebuilt only when
 *         `rev` changes; segment transforms follow the smoothed nodes every frame.
 *         Per-instance custom data [0]=weight [1]=mean resonance of the two endpoints
 *         [2]=segment start along the edge (0..1) [3]=segment span (1 / EdgeSegments).
 *
 * Node material (M_PrimordiaCosmicNode) reads PerInstanceCustomData 0..2.
 * Edge material (M_PrimordiaCosmicEdge) reads PerInstanceCustomData 0..3.
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

	/** Straight segments per edge that approximate the sag curve; 1 draws straight edges. Still one draw call either way. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|CosmicWeb", meta = (ClampMin = "1", ClampMax = "16"))
	int32 EdgeSegments = 4;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|CosmicWeb")
	float NodeSmoothing = 10.f;

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|CosmicWeb")
	int32 TopologyRevision = -1;

protected:
	virtual void OnConstruction(const FTransform& Transform) override;
	virtual void UpdateRetireFade(float Alpha) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|CosmicWeb")
	TObjectPtr<UInstancedStaticMeshComponent> Nodes;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|CosmicWeb")
	TObjectPtr<UInstancedStaticMeshComponent> EdgeInstances;

	UPROPERTY(Transient) TObjectPtr<UMaterialInstanceDynamic> NodeMID;
	UPROPERTY(Transient) TObjectPtr<UMaterialInstanceDynamic> EdgeMID;

private:
	void EnsureAssets();
	void ResizeNodes(int32 Count);
	void RebuildEdges(const TArray<TSharedPtr<FJsonValue>>& EdgeArray);
	void SyncEdgeInstances();
	void UpdateEdgeInstances();

	struct FEdge { int32 A; int32 B; float Weight; };
	TArray<FEdge> Edges;
	/** Segments per edge for the current instance layout (EdgeSegments, clamped, at the last sync). */
	int32 SegmentsPerEdge = 1;
	/** Edge mesh bounds in its local space: the segment runs along Z, its radius is in X/Y. */
	FVector EdgeMeshCenter = FVector::ZeroVector;
	FVector EdgeMeshExtent = FVector(50.f);
	TArray<FVector> TargetPositions;
	TArray<FVector> CurrentPositions;
	TArray<float> Resonance;
	TArray<float> Mass;
	TArray<float> Kind;
	bool bInstancesDirty = false;
};
