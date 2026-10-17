#include "Actors/CosmicWebActor.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaJson.h"
#include "PrimordiaTopology.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/SplineMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInstanceDynamic.h"

ACosmicWebActor::ACosmicWebActor()
{
	Nodes = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Nodes"));
	Nodes->SetupAttachment(SceneRoot);
	Nodes->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Nodes->SetMobility(EComponentMobility::Movable);
	Nodes->NumCustomDataFloats = 4;
	Nodes->CastShadow = false;
	Smoothing = 0.f; // the actor itself stays at the realm origin; nodes smooth individually
}

void ACosmicWebActor::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	if (!Nodes->GetStaticMesh())
	{
		Nodes->SetStaticMesh(UPrimordiaBridgeSettings::LoadOr(UPrimordiaBridgeSettings::Get()->NodeMesh, PrimordiaAssets::Sphere));
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
		UMaterialInterface* EdgeMaterial = UPrimordiaBridgeSettings::LoadOr(S->EdgeMaterial, PrimordiaAssets::BasicMaterial);
		EdgeMID = UMaterialInstanceDynamic::Create(EdgeMaterial, this);
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
	SyncEdgePool();
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
	SyncEdgePool();
}

void ACosmicWebActor::SyncEdgePool()
{
	UStaticMesh* EdgeMesh = UPrimordiaBridgeSettings::LoadOr(UPrimordiaBridgeSettings::Get()->EdgeMesh, PrimordiaAssets::Cylinder);

	while (EdgePool.Num() < Edges.Num())
	{
		USplineMeshComponent* Spline = NewObject<USplineMeshComponent>(this, NAME_None, RF_Transient);
		Spline->SetMobility(EComponentMobility::Movable);
		Spline->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		Spline->CastShadow = false;
		Spline->SetStaticMesh(EdgeMesh);
		// The basic cylinder runs along Z.
		Spline->SetForwardAxis(ESplineMeshAxis::Z, false);
		Spline->SetMaterial(0, EdgeMID);
		Spline->SetupAttachment(SceneRoot);
		Spline->RegisterComponent();
		EdgePool.Add(Spline);
	}
	for (int32 i = 0; i < EdgePool.Num(); ++i)
	{
		const bool bActive = i < Edges.Num();
		EdgePool[i]->SetVisibility(bActive);
		if (bActive)
		{
			const float W = FMath::Max(0.05f, Edges[i].Weight);
			const float Scale = EdgeThickness * W / 100.f;
			EdgePool[i]->SetStartScale(FVector2D(Scale, Scale), false);
			EdgePool[i]->SetEndScale(FVector2D(Scale, Scale), false);
			EdgePool[i]->SetCustomPrimitiveDataFloat(0, W);
		}
	}
}

void ACosmicWebActor::UpdateEdgeSplines()
{
	if (Edges.IsEmpty())
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

	for (int32 i = 0; i < Edges.Num(); ++i)
	{
		const FEdge& E = Edges[i];
		const FVector Start = CurrentPositions[E.A];
		const FVector End = CurrentPositions[E.B];
		const FVector Mid = (Start + End) * 0.5f;
		const FVector Sag = (Centroid - Mid) * EdgeCurvature;
		const FVector Chord = End - Start;
		USplineMeshComponent* Spline = EdgePool[i];
		Spline->SetStartAndEnd(Start, Chord + Sag * 2.f, End, Chord - Sag * 2.f, false);
		Spline->SetCustomPrimitiveDataFloat(1, 0.5f * (Resonance[E.A] + Resonance[E.B]));
		Spline->UpdateMesh();
	}
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
	UpdateEdgeSplines();
	bInstancesDirty = false;
}

void ACosmicWebActor::UpdateRetireFade(float Alpha)
{
	if (NodeMID) NodeMID->SetScalarParameterValue(TEXT("RetireAlpha"), Alpha);
	if (EdgeMID) EdgeMID->SetScalarParameterValue(TEXT("RetireAlpha"), Alpha);
}
