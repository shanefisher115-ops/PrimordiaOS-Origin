#include "MCPCrowdVisualizer.h"

#include "Components/InstancedStaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "MCPComputeSubsystem.h"
#include "UObject/ConstructorHelpers.h"

namespace
{
// Same palette as the standalone renderer (shaders/render/RealmCommon.hlsli ActionColor).
const FLinearColor ActionColors[] = {
	FLinearColor(0.70f, 0.70f, 0.70f), // idle
	FLinearColor(0.95f, 0.85f, 0.55f), // wander
	FLinearColor(0.45f, 0.80f, 1.00f), // seek sigil
	FLinearColor(1.00f, 0.20f, 0.12f), // flee
	FLinearColor(0.35f, 0.35f, 0.45f), // rest
	FLinearColor(1.00f, 0.55f, 0.95f), // commune
};
} // namespace

AMCPCrowdVisualizer::AMCPCrowdVisualizer()
{
	PrimaryActorTick.bCanEverTick = true;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cone(TEXT("/Engine/BasicShapes/Cone.Cone"));
	for (int32 A = 0; A < UE_ARRAY_COUNT(ActionColors); ++A)
	{
		UInstancedStaticMeshComponent* Ism = CreateDefaultSubobject<UInstancedStaticMeshComponent>(*FString::Printf(TEXT("Action%d"), A));
		Ism->SetupAttachment(RootComponent);
		Ism->SetMobility(EComponentMobility::Movable);
		Ism->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		Ism->SetCastShadow(true);
		if (Cone.Succeeded())
		{
			Ism->SetStaticMesh(Cone.Object);
		}
		ByAction.Add(Ism);
	}
}

void AMCPCrowdVisualizer::BeginPlay()
{
	Super::BeginPlay();
	for (int32 A = 0; A < ByAction.Num(); ++A)
	{
		// BasicShapeMaterial exposes a "Color" vector parameter.
		if (UMaterialInstanceDynamic* Mid = ByAction[A]->CreateDynamicMaterialInstance(0))
		{
			Mid->SetVectorParameterValue(TEXT("Color"), ActionColors[A]);
		}
	}
}

void AMCPCrowdVisualizer::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	const UMCPComputeSubsystem* MCP = UMCPComputeSubsystem::Get(this);
	if (MCP && MCP->LatestResults().Tick != DrawnTick)
	{
		Refresh(MCP->LatestResults(), *MCP);
	}
}

void AMCPCrowdVisualizer::Refresh(const FMCPResults& Results, const UMCPComputeSubsystem& MCP)
{
	DrawnTick = Results.Tick;
	TArray<TArray<FTransform>> Instances;
	Instances.SetNum(ByAction.Num());
	const float Scale = ActorHeightMeters; // the engine cone is 1 m tall
	const int32 Count = FMath::Min(Results.Actors.Num(), MaxDrawn);
	for (int32 I = 0; I < Count; ++I)
	{
		const FMCPActorResult& A = Results.Actors[I];
		const int32 Slot = FMath::Clamp(static_cast<int32>(A.Action), 0, ByAction.Num() - 1);
		const FVector World = MCP.RealmToWorld(A.PositionMeters);
		Instances[Slot].Add(FTransform(FQuat::Identity, World, FVector(Scale * 0.4f, Scale * 0.4f, Scale)));
	}
	for (int32 S = 0; S < ByAction.Num(); ++S)
	{
		ByAction[S]->ClearInstances();
		if (Instances[S].Num() > 0)
		{
			ByAction[S]->AddInstances(Instances[S], false, true);
		}
	}
}
