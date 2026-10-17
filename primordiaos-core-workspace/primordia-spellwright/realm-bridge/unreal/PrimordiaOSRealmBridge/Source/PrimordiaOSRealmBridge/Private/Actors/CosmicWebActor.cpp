#include "Actors/CosmicWebActor.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaJson.h"
#include "PrimordiaTopology.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInstanceDynamic.h"

namespace
{
	constexpr int32 MaxEdgeSegments = 16;
}

ACosmicWebActor::ACosmicWebActor()
{
	Nodes = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Nodes"));
	Nodes->SetupAttachment(SceneRoot);
	Nodes->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Nodes->SetMobility(EComponentMobility::Movable);
	Nodes->NumCustomDataFloats = 4;
	Nodes->CastShadow = false;

	EdgeInstances = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("EdgeInstances"));
	EdgeInstances->SetupAttachment(SceneRoot);
	EdgeInstances->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	EdgeInstances->SetMobility(EComponentMobility::Movable);
	EdgeInstances->NumCustomDataFloats = 4;
	EdgeInstances->CastShadow = false;
	Smoothing = 0.f; // the actor itself stays at the realm origin; nodes smooth individually
}

void ACosmicWebActor::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	const UPrimordiaBridgeSettings* S = UPrimordiaBridgeSettings::Get();
	if (!Nodes->GetStaticMesh())
	{
		Nodes->SetStaticMesh(UPrimordiaBridgeSettings::LoadOr(S->NodeMesh, PrimordiaAssets::Sphere));
	}
	if (!EdgeInstances->GetStaticMesh())
	{
		EdgeInstances->SetStaticMesh(UPrimordiaBridgeSettings::LoadOr(S->EdgeMesh, PrimordiaAssets::Cylinder));
	}
}

void ACosmicWebActor::EnsureAssets()
{
	const UPrimordiaBridgeSettings* S = UPrimordiaBridgeSettings::Get();
	if (!NodeMID)
	{
		NodeMID = MakeMID(Nodes, UPrimordiaBridgeSettings::LoadOr(S->NodeMaterial, nullptr));
	}
	if (!EdgeMID)
	{
		EdgeMID = MakeMID(EdgeInstances, UPrimordiaBridgeSettings::LoadOr(S->EdgeMaterial, nullptr));
		EdgeMID->SetVectorParameterValue(TEXT("Color"), FLinearColor(0.4f, 0.7f, 1.f));
	}
}

void ACosmicWebActor::ResizeNodes(int32 Count)
{
	if (Nodes->GetInstanceCount() == Count)
	{
		return;
	}
	Nodes->ClearInstances();
	TArray<FTransform> Transforms;
	Transforms.Init(FTransform::Identity, Count);
	Nodes->AddInstances(Transforms, false);
	CurrentPositions.SetNumZeroed(Count);
	bInstancesDirty = true;
}

void ACosmicWebActor::ApplyPayload(const TSharedPtr<FJsonObject>& P)
{
	using namespace PrimordiaJson;
	EnsureAssets();

	const TArray<TSharedPtr<FJsonValue>>* NodeArray = Arr(P, TEXT("nodes"));
	if (!NodeArray)
	{
		return;
	}
	const int32 Count = NodeArray->Num();
	const bool bResized = Nodes->GetInstanceCount() != Count;
	ResizeNodes(Count);
	TargetPositions.SetNum(Count);
	Resonance.SetNum(Count);
	Mass.SetNum(Count);
	Kind.SetNum(Count);

	const float Upm = UnitsPerMeter();
	for (int32 i = 0; i < Count; ++i)
	{
		const TSharedPtr<FJsonObject> N = (*NodeArray)[i]->AsObject();
		TargetPositions[i] = Vec(N, TEXT("p"), FVector::ZeroVector, Upm);
		Resonance[i] = Num(N, TEXT("resonance"), 0.5);
		Mass[i] = Num(N, TEXT("mass"), 1.0);
		const FString K = Str(N, TEXT("kind"));
		Kind[i] = K == TEXT("nexus") ? 2.f : K == TEXT("star") ? 1.f : 0.f;
	}
	if (bResized || !bHasReceivedPacket)
	{
		CurrentPositions = TargetPositions; // no glide from the origin
	}

	const int32 Rev = Int(P, TEXT("rev"), TopologyRevision);
	if (const TArray<TSharedPtr<FJsonValue>>* EdgeArray = Arr(P, TEXT("edges")))
	{
		if (Rev != TopologyRevision || bResized)
		{
			RebuildEdges(*EdgeArray);
			TopologyRevision = Rev;
		}
	}
	bInstancesDirty = true;
}

void ACosmicWebActor::BuildFromGraph(const FPrimordiaTopologyGraph& Graph, const FVector& CenterMeters)
{
	EnsureAssets();
	const float Upm = UnitsPerMeter();
	const int32 Count = Graph.Nodes.Num();
	ResizeNodes(Count);
	TargetPositions.SetNum(Count);
	Resonance.Init(0.5f, Count);
	Mass.Init(1.f, Count);
	Kind.SetNum(Count);
	for (int32 i = 0; i < Count; ++i)
	{
		TargetPositions[i] = (CenterMeters + Graph.Nodes[i]) * Upm;
		// Same kind assignment as node-bridge/src/modules/cosmicWeb.js.
		Kind[i] = (i % 11 == 0) ? 2.f : (i % 4 == 0) ? 1.f : 0.f;
		Mass[i] = Kind[i] == 2.f ? 3.f : Kind[i] == 1.f ? 1.6f : 1.f;
	}
	CurrentPositions = TargetPositions;

	Edges.Reset();
	for (const TTuple<int32, int32, float>& E : Graph.Edges)
	{
		Edges.Add({ E.Get<0>(), E.Get<1>(), E.Get<2>() });
	}
	SyncEdgeInstances();
	TopologyRevision = -1; // any live revision replaces the offline graph
	bInstancesDirty = true;
}

void ACosmicWebActor::RebuildEdges(const TArray<TSharedPtr<FJsonValue>>& EdgeArray)
{
	Edges.Reset(EdgeArray.Num());
	const int32 Count = TargetPositions.Num();
	for (const TSharedPtr<FJsonValue>& V : EdgeArray)
	{
		const TArray<TSharedPtr<FJsonValue>>* Triple = nullptr;
		if (!V->TryGetArray(Triple) || Triple->Num() < 3)
		{
			continue;
		}
		const int32 A = static_cast<int32>((*Triple)[0]->AsNumber());
		const int32 B = static_cast<int32>((*Triple)[1]->AsNumber());
		if (A >= 0 && B >= 0 && A < Count && B < Count && A != B)
		{
			Edges.Add({ A, B, static_cast<float>((*Triple)[2]->AsNumber()) });
		}
	}
	SyncEdgeInstances();
}

void ACosmicWebActor::SyncEdgeInstances()
{
	UStaticMesh* EdgeMesh = EdgeInstances->GetStaticMesh();
	if (!EdgeMesh)
	{
		EdgeMesh = UPrimordiaBridgeSettings::LoadOr(UPrimordiaBridgeSettings::Get()->EdgeMesh, PrimordiaAssets::Cylinder);
		EdgeInstances->SetStaticMesh(EdgeMesh);
	}
	if (EdgeMesh)
	{
		// Segments are fitted to the mesh's own bounds, so a custom EdgeMesh only has to run along Z.
		const FBox Box = EdgeMesh->GetBoundingBox();
		if (Box.IsValid)
		{
			EdgeMeshCenter = Box.GetCenter();
			EdgeMeshExtent = Box.GetExtent().ComponentMax(FVector(0.01));
		}
	}

	SegmentsPerEdge = FMath::Clamp(EdgeSegments, 1, MaxEdgeSegments);
	const int32 Count = Edges.Num() * SegmentsPerEdge;
	if (EdgeInstances->GetInstanceCount() != Count)
	{
		EdgeInstances->ClearInstances();
		TArray<FTransform> Transforms;
		Transforms.Init(FTransform::Identity, Count);
		EdgeInstances->AddInstances(Transforms, false);
	}
}

void ACosmicWebActor::UpdateEdgeInstances()
{
	const int32 Segments = SegmentsPerEdge;
	if (Edges.IsEmpty() || EdgeInstances->GetInstanceCount() != Edges.Num() * Segments)
	{
		return;
	}
	// Edges bow toward the web's centroid, which reads as a woven sphere rather than a wire frame.
	FVector Centroid = FVector::ZeroVector;
	for (const FVector& P : CurrentPositions)
	{
		Centroid += P;
	}
	Centroid /= FMath::Max(1, CurrentPositions.Num());

	const float Span = 1.f / Segments;
	const double MeshRadius = FMath::Max(EdgeMeshExtent.X, EdgeMeshExtent.Y);
	const double MeshLength = 2.0 * EdgeMeshExtent.Z;

	TArray<FTransform> Transforms;
	Transforms.SetNum(Edges.Num() * Segments);
	for (int32 i = 0; i < Edges.Num(); ++i)
	{
		const FEdge& E = Edges[i];
		const FVector Start = CurrentPositions[E.A];
		const FVector End = CurrentPositions[E.B];
		const FVector Mid = (Start + End) * 0.5f;
		const FVector Sag = (Centroid - Mid) * EdgeCurvature;
		// Quadratic Bezier with its control point at Mid + Sag (end tangents Chord ± 2 Sag).
		const FVector Control = Mid + Sag;

		const float W = FMath::Max(0.05f, E.Weight);
		const double Thickness = 0.5 * EdgeThickness * W / MeshRadius;
		float Data[4] = { W, 0.5f * (Resonance[E.A] + Resonance[E.B]), 0.f, Span };

		FVector Prev = Start;
		for (int32 s = 0; s < Segments; ++s)
		{
			const double T = (s + 1) * static_cast<double>(Span);
			const FVector Next = (1.0 - T) * (1.0 - T) * Start + 2.0 * T * (1.0 - T) * Control + T * T * End;
			const FVector Axis = Next - Prev;
			const double Length = Axis.Size();
			const FQuat Rotation = Length > UE_KINDA_SMALL_NUMBER ? FQuat::FindBetweenNormals(FVector::UpVector, Axis / Length) : FQuat::Identity;
			const FVector Scale(Thickness, Thickness, Length / MeshLength);
			// Center the mesh's bounds on the segment midpoint.
			const FVector Location = (Prev + Next) * 0.5 - Rotation.RotateVector(Scale * EdgeMeshCenter);

			const int32 Index = i * Segments + s;
			Transforms[Index] = FTransform(Rotation, Location, Scale);
			Data[2] = s * Span;
			EdgeInstances->SetCustomData(Index, MakeArrayView(Data), false);
			Prev = Next;
		}
	}
	EdgeInstances->BatchUpdateInstancesTransforms(0, Transforms, false, true, false);
}

void ACosmicWebActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	const int32 Count = CurrentPositions.Num();
	if (Count == 0 || TargetPositions.Num() != Count)
	{
		return;
	}

	const float Alpha = ExpAlpha(NodeSmoothing, DeltaSeconds);
	bool bMoved = bInstancesDirty;
	for (int32 i = 0; i < Count; ++i)
	{
		const FVector Next = FMath::Lerp(CurrentPositions[i], TargetPositions[i], Alpha);
		bMoved |= !Next.Equals(CurrentPositions[i], 0.01);
		CurrentPositions[i] = Next;
	}
	if (FMath::Clamp(EdgeSegments, 1, MaxEdgeSegments) != SegmentsPerEdge)
	{
		SyncEdgeInstances(); // live-tunable, so 1 vs N segments can be compared in one session
		bMoved = true;
	}
	if (!bMoved)
	{
		return;
	}

	TArray<FTransform> Transforms;
	Transforms.SetNum(Count);
	for (int32 i = 0; i < Count; ++i)
	{
		const float Size = NodeBaseSize * FMath::Sqrt(Mass[i]) * (0.8f + 0.4f * Resonance[i]) / 100.f;
		Transforms[i] = FTransform(FQuat::Identity, CurrentPositions[i], FVector(Size));
		Nodes->SetCustomDataValue(i, 0, Resonance[i], false);
		Nodes->SetCustomDataValue(i, 1, Mass[i], false);
		Nodes->SetCustomDataValue(i, 2, Kind[i], false);
	}
	Nodes->BatchUpdateInstancesTransforms(0, Transforms, false, true, false);
	UpdateEdgeInstances();
	bInstancesDirty = false;
}

void ACosmicWebActor::UpdateRetireFade(float Alpha)
{
	if (NodeMID) NodeMID->SetScalarParameterValue(TEXT("RetireAlpha"), Alpha);
	if (EdgeMID) EdgeMID->SetScalarParameterValue(TEXT("RetireAlpha"), Alpha);
}
