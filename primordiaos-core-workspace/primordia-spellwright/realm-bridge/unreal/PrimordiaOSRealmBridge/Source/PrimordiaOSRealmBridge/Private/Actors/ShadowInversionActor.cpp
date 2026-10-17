#include "Actors/ShadowInversionActor.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaJson.h"
#include "Components/PostProcessComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "HAL/IConsoleManager.h"
#include "Materials/MaterialInstanceDynamic.h"

namespace
{
	// One inversion post-process per world: applying it twice would cancel out.
	TMap<TWeakObjectPtr<UWorld>, TWeakObjectPtr<AShadowInversionActor>> GPostProcessOwners;
}

AShadowInversionActor::AShadowInversionActor()
{
	Hull = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Hull"));
	Hull->SetupAttachment(SceneRoot);
	Hull->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Hull->CastShadow = false;
	// Inverted normals: cull front faces so the inside of the sphere is what renders.
	Hull->SetReverseCulling(true);

	StencilCore = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("StencilCore"));
	StencilCore->SetupAttachment(SceneRoot);
	StencilCore->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	StencilCore->CastShadow = false;
	StencilCore->SetRenderInMainPass(false);
	StencilCore->SetRenderCustomDepth(true);

	PostProcess = CreateDefaultSubobject<UPostProcessComponent>(TEXT("PostProcess"));
	PostProcess->SetupAttachment(SceneRoot);
	PostProcess->bUnbound = true;
	PostProcess->bEnabled = false;
	PostProcess->Priority = 10.f;
}

void AShadowInversionActor::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	const UPrimordiaBridgeSettings* S = UPrimordiaBridgeSettings::Get();
	UStaticMesh* Mesh = UPrimordiaBridgeSettings::LoadOr(S->ShadowMesh, PrimordiaAssets::Sphere);
	if (!Hull->GetStaticMesh()) Hull->SetStaticMesh(Mesh);
	if (!StencilCore->GetStaticMesh()) StencilCore->SetStaticMesh(Mesh);
	StencilCore->SetCustomDepthStencilValue(S->ShadowStencilValue);
}

void AShadowInversionActor::BeginPlay()
{
	Super::BeginPlay();
	// Stencil masking needs "Custom Depth-Stencil Pass = Enabled with Stencil".
	if (IConsoleVariable* CustomDepth = IConsoleManager::Get().FindConsoleVariable(TEXT("r.CustomDepth")))
	{
		if (CustomDepth->GetInt() < 3)
		{
			CustomDepth->Set(3, ECVF_SetByGameSetting);
		}
	}
}

void AShadowInversionActor::EndPlay(const EEndPlayReason::Type Reason)
{
	if (const TWeakObjectPtr<AShadowInversionActor>* PostOwner = GPostProcessOwners.Find(GetWorld()); PostOwner && PostOwner->Get() == this)
	{
		GPostProcessOwners.Remove(GetWorld());
	}
	Super::EndPlay(Reason);
}

bool AShadowInversionActor::ClaimPostProcess()
{
	TWeakObjectPtr<AShadowInversionActor>& PostOwner = GPostProcessOwners.FindOrAdd(GetWorld());
	if (!PostOwner.IsValid() || PostOwner->IsRetiring())
	{
		PostOwner = this;
	}
	return PostOwner.Get() == this;
}

void AShadowInversionActor::EnsureMaterials()
{
	const UPrimordiaBridgeSettings* S = UPrimordiaBridgeSettings::Get();
	if (!HullMID)
	{
		HullMID = MakeMID(Hull, UPrimordiaBridgeSettings::LoadOr(S->ShadowMaterial, nullptr));
		HullMID->SetVectorParameterValue(TEXT("Color"), FLinearColor(0.01f, 0.f, 0.02f));
	}
	if (!PostMID)
	{
		if (UMaterialInterface* PostMaterial = UPrimordiaBridgeSettings::LoadOr(S->ShadowPostProcessMaterial, nullptr))
		{
			PostMID = UMaterialInstanceDynamic::Create(PostMaterial, this);
			PostMID->SetScalarParameterValue(TEXT("StencilValue"), static_cast<float>(S->ShadowStencilValue));
			PostProcess->Settings.WeightedBlendables.Array.Add(FWeightedBlendable(1.f, PostMID));
		}
	}
}

void AShadowInversionActor::ApplyPayload(const TSharedPtr<FJsonObject>& P)
{
	using namespace PrimordiaJson;
	const float Upm = UnitsPerMeter();
	Inversion = Num(P, TEXT("inversion"), Inversion);
	Depth = Num(P, TEXT("depth"), Depth);
	Threshold = Num(P, TEXT("threshold"), Threshold);
	Pulse = Num(P, TEXT("pulse"), Pulse);
	MirrorOf = Str(P, TEXT("mirror_of"), MirrorOf);
	ExtentUnits = Vec(P, TEXT("extent"), ExtentUnits / Upm, Upm);
	SetTargetLocation(Vec(P, TEXT("position"), FVector::ZeroVector, Upm));
	if (!bHasReceivedPacket)
	{
		SmoothedInversion = Inversion;
	}
}

void AShadowInversionActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	EnsureMaterials();

	SmoothedInversion = FMath::Lerp(SmoothedInversion, Inversion, ExpAlpha(4.f, DeltaSeconds));
	const float Strength = SmoothedInversion * FadeAlpha;

	// The cavity breathes against the heart: it swells on the anti-beat.
	const FVector Scale = ExtentUnits / 100.f * (1.f + PulseSwell * Pulse);
	Hull->SetRelativeScale3D(Scale);
	StencilCore->SetRelativeScale3D(Scale * 0.98f);

	if (HullMID)
	{
		HullMID->SetScalarParameterValue(TEXT("Inversion"), Strength);
		HullMID->SetScalarParameterValue(TEXT("Depth"), Depth);
		HullMID->SetScalarParameterValue(TEXT("Threshold"), Threshold);
		HullMID->SetScalarParameterValue(TEXT("Pulse"), Pulse);
	}

	const bool bOwnsPost = PostMID && ClaimPostProcess();
	PostProcess->bEnabled = bOwnsPost && Strength > 0.001f;
	if (bOwnsPost)
	{
		PostProcess->BlendWeight = 1.f;
		PostMID->SetScalarParameterValue(TEXT("Inversion"), Strength);
		PostMID->SetScalarParameterValue(TEXT("Threshold"), Threshold);
		PostMID->SetScalarParameterValue(TEXT("Pulse"), Pulse);
	}
}

void AShadowInversionActor::UpdateRetireFade(float Alpha)
{
	FadeAlpha = Alpha;
	if (HullMID)
	{
		HullMID->SetScalarParameterValue(TEXT("RetireAlpha"), Alpha);
	}
}
