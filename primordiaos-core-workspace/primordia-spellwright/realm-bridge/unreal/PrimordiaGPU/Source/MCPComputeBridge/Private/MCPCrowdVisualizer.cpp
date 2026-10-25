#include "MCPCrowdVisualizer.h"

#include "Components/InstancedStaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "MCPComputeSubsystem.h"
#include "UObject/ConstructorHelpers.h"

namespace
{
// The standalone renderer's palette, saturated: unlit wisps over a bright daylight realm only
// read as colour (not as white bloom) when the colour is strong.
const FLinearColor ActionColors[] = {
	FLinearColor(0.55f, 0.62f, 0.85f), // idle
	FLinearColor(1.00f, 0.55f, 0.12f), // wander
	FLinearColor(0.15f, 0.70f, 1.00f), // seek sigil
	FLinearColor(1.00f, 0.10f, 0.04f), // flee
	FLinearColor(0.25f, 0.18f, 0.65f), // rest
	FLinearColor(1.00f, 0.25f, 0.90f), // commune
};
constexpr int32 ActionCount = UE_ARRAY_COUNT(ActionColors);
const TCHAR* const GlowMaterial = TEXT("/PrimordiaOSRealmBridge/Materials/M_PrimordiaThreadGlow.M_PrimordiaThreadGlow");
} // namespace

AMCPCrowdVisualizer::AMCPCrowdVisualizer()
{
	PrimaryActorTick.bCanEverTick = true;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	// The engine's 528-triangle sphere: at wisp size it looks the same as BasicShapes/Sphere (960),
	// and thousands of wisps make the difference in the depth and base passes on an integrated GPU.
	static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/EngineMeshes/Sphere.Sphere"));
	Wisps = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Wisps"));
	Wisps->SetupAttachment(RootComponent);
	Wisps->SetMobility(EComponentMobility::Movable);
	Wisps->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Wisps->SetCastShadow(false); // light sources, not solids
	Wisps->SetNumCustomDataFloats(4);
	if (Sphere.Succeeded())
	{
		Wisps->SetStaticMesh(Sphere.Object);
	}
}

void AMCPCrowdVisualizer::BeginPlay()
{
	Super::BeginPlay();
	if (UMaterialInterface* Glow = LoadObject<UMaterialInterface>(nullptr, GlowMaterial))
	{
		Wisps->SetMaterial(0, Glow);
		bGlowMaterial = true;
	}
	else if (UMaterialInstanceDynamic* Mid = Wisps->CreateDynamicMaterialInstance(0))
	{
		Mid->SetVectorParameterValue(TEXT("Color"), ActionColors[1]); // BasicShapeMaterial's parameter
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

double AMCPCrowdVisualizer::GroundZ(int32 Index, const FVector& World)
{
	while (TracedZ.Num() <= Index)
	{
		TracedAt.Add(FVector2D::ZeroVector);
		TracedZ.Add(TNumericLimits<double>::Lowest()); // not traced yet
	}
	const FVector2D XY(World.X, World.Y);
	if (TracedZ[Index] != TNumericLimits<double>::Lowest() && FVector2D::DistSquared(XY, TracedAt[Index]) < 100.0 * 100.0)
	{
		return TracedZ[Index]; // moved less than a meter since the last trace
	}
	FHitResult Hit;
	FCollisionQueryParams Params(SCENE_QUERY_STAT(MCPCrowdGround), false, this);
	const FVector From(World.X, World.Y, World.Z + 50000.0);
	const FVector To(World.X, World.Y, World.Z - 50000.0);
	TracedAt[Index] = XY;
	TracedZ[Index] = GetWorld()->LineTraceSingleByChannel(Hit, From, To, ECC_Visibility, Params) ? Hit.ImpactPoint.Z : World.Z;
	return TracedZ[Index];
}

void AMCPCrowdVisualizer::Refresh(const FMCPResults& Results, const UMCPComputeSubsystem& MCP)
{
	DrawnTick = Results.Tick;
	const int32 Count = FMath::Min(Results.Actors.Num(), MaxDrawn);
	const double UnitsPerMeter = FVector::Distance(MCP.RealmToWorld(FVector::ZeroVector), MCP.RealmToWorld(FVector(1, 0, 0)));
	const double Height = WispHeightMeters * UnitsPerMeter;
	// Size from the mesh's real bounds (EngineMeshes/Sphere is 2 m across, BasicShapes/Sphere 1 m).
	const double MeshSize = Wisps->GetStaticMesh() ? FMath::Max(1.0, Wisps->GetStaticMesh()->GetBoundingBox().GetSize().GetMax()) : 100.0;
	const FVector Scale(Height * 0.45 / MeshSize, Height * 0.45 / MeshSize, Height / MeshSize);

	TArray<FTransform> Transforms;
	Transforms.Reserve(Count);
	for (int32 I = 0; I < Count; ++I)
	{
		const FMCPActorResult& A = Results.Actors[I];
		FVector World = MCP.RealmToWorld(A.PositionMeters);
		if (bSnapToGround)
		{
			World.Z = GroundZ(I, World);
		}
		World.Z += HoverMeters * UnitsPerMeter + Height * 0.5;
		Transforms.Emplace(FQuat::Identity, World, Scale);
	}

	if (Wisps->GetInstanceCount() != Count)
	{
		Wisps->ClearInstances();
		Wisps->AddInstances(Transforms, false, true);
	}
	else if (Count > 0)
	{
		Wisps->BatchUpdateInstancesTransforms(0, Transforms, true, false, true);
	}
	if (bGlowMaterial)
	{
		for (int32 I = 0; I < Count; ++I)
		{
			const FMCPActorResult& A = Results.Actors[I];
			const int32 Action = FMath::Clamp(static_cast<int32>(A.Action), 0, ActionCount - 1);
			// Fear pulls any colour toward red; rest dims; a remembered fright flickers brighter.
			const FLinearColor Base = FMath::Lerp(ActionColors[Action], ActionColors[3], FMath::Clamp(A.Fear * 0.8f, 0.f, 1.f));
			const float Gain = GlowIntensity * (A.Action == EMCPAction::Rest ? 0.35f : 1.f) * (1.f + 0.6f * A.RecalledFear);
			const float Data[4] = { Base.R * Gain, Base.G * Gain, Base.B * Gain, 0.f };
			Wisps->SetCustomData(I, TArrayView<const float>(Data, 4), false);
		}
	}
	Wisps->MarkRenderStateDirty();
}
