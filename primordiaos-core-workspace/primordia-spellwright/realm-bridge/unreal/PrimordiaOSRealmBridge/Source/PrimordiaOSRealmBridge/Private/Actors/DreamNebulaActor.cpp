#include "Actors/DreamNebulaActor.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaJson.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "NiagaraComponent.h"
#include "NiagaraSystem.h"

ADreamNebulaActor::ADreamNebulaActor()
{
	Volume = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Volume"));
	Volume->SetupAttachment(SceneRoot);
	Volume->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Volume->CastShadow = false;
	Volume->bAffectDistanceFieldLighting = false;

	Motes = CreateDefaultSubobject<UNiagaraComponent>(TEXT("Motes"));
	Motes->SetupAttachment(SceneRoot);
	Motes->bAutoActivate = true;

	Smoothing = 1.5f;
	RetireFadeSeconds = 3.f;
}

void ADreamNebulaActor::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	const UPrimordiaBridgeSettings* S = UPrimordiaBridgeSettings::Get();
	if (!Volume->GetStaticMesh())
	{
		Volume->SetStaticMesh(UPrimordiaBridgeSettings::LoadOr(S->NebulaMesh, PrimordiaAssets::Cube));
	}
	if (!Motes->GetAsset())
	{
		if (UNiagaraSystem* System = S->NebulaParticleSystem.LoadSynchronous())
		{
			Motes->SetAsset(System);
		}
	}
}

void ADreamNebulaActor::EnsureMaterials()
{
	if (!VolumeMID)
	{
		UMaterialInterface* Material = UPrimordiaBridgeSettings::LoadOr(UPrimordiaBridgeSettings::Get()->NebulaMaterial, nullptr);
		VolumeMID = MakeMID(Volume, Material);
		// Without a nebula material the opaque fallback cube would hide the scene; rely on the motes.
		Volume->SetVisibility(Material != nullptr);
	}
}

void ADreamNebulaActor::ApplyPayload(const TSharedPtr<FJsonObject>& P)
{
	using namespace PrimordiaJson;
	const float Upm = UnitsPerMeter();
	TargetDensity = Num(P, TEXT("density"), TargetDensity);
	Turbulence = Num(P, TEXT("turbulence"), Turbulence);
	NoiseScale = Num(P, TEXT("noise_scale"), NoiseScale);
	Lucidity = Num(P, TEXT("lucidity"), Lucidity);
	Drift = Vec(P, TEXT("drift"), Drift);
	ExtentUnits = Vec(P, TEXT("extent"), ExtentUnits / Upm, Upm);

	if (const TArray<TSharedPtr<FJsonValue>>* Palette = Arr(P, TEXT("palette")))
	{
		if (Palette->Num() > 0) TargetColorA = ColorFromValue((*Palette)[0], TargetColorA);
		if (Palette->Num() > 1) TargetColorB = ColorFromValue((*Palette)[1], TargetColorB);
	}
	if (!bHasReceivedPacket)
	{
		ColorA = TargetColorA;
		ColorB = TargetColorB;
	}
	SetTargetLocation(Vec(P, TEXT("position"), FVector::ZeroVector, Upm));
	if (!bHasReceivedPacket)
	{
		Volume->SetRelativeScale3D(ExtentUnits / 100.f);
	}
}

void ADreamNebulaActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	EnsureMaterials();

	const float A = ExpAlpha(FieldSmoothing, DeltaSeconds);
	Density = FMath::Lerp(Density, TargetDensity, A);
	ColorA = FMath::Lerp(ColorA, TargetColorA, A);
	ColorB = FMath::Lerp(ColorB, TargetColorB, A);
	DriftOffset += Drift * UnitsPerMeter() * DeltaSeconds;
	// Only the raymarch shell is scaled (cube = 100 uu); the motes stay unscaled.
	Volume->SetRelativeScale3D(FMath::Lerp(Volume->GetRelativeScale3D(), ExtentUnits / 100.f, A));

	const float EffectiveDensity = Density * RetireAlpha;
	if (VolumeMID)
	{
		VolumeMID->SetScalarParameterValue(TEXT("Density"), EffectiveDensity);
		VolumeMID->SetScalarParameterValue(TEXT("Turbulence"), Turbulence);
		VolumeMID->SetScalarParameterValue(TEXT("NoiseScale"), NoiseScale);
		VolumeMID->SetScalarParameterValue(TEXT("Lucidity"), Lucidity);
		VolumeMID->SetVectorParameterValue(TEXT("DriftOffset"), FLinearColor(DriftOffset.X, DriftOffset.Y, DriftOffset.Z));
		VolumeMID->SetVectorParameterValue(TEXT("ExtentUnits"), FLinearColor(ExtentUnits.X, ExtentUnits.Y, ExtentUnits.Z));
		VolumeMID->SetVectorParameterValue(TEXT("ColorA"), ColorA);
		VolumeMID->SetVectorParameterValue(TEXT("ColorB"), ColorB);
	}
	if (Motes->GetAsset())
	{
		Motes->SetVariableFloat(TEXT("Density"), EffectiveDensity);
		Motes->SetVariableFloat(TEXT("Turbulence"), Turbulence);
		// Motes live in the unscaled component, so pass the extent explicitly.
		Motes->SetVariableVec3(TEXT("Extent"), ExtentUnits);
		Motes->SetVariableLinearColor(TEXT("ColorA"), ColorA);
		Motes->SetVariableLinearColor(TEXT("ColorB"), ColorB);
	}
}

void ADreamNebulaActor::UpdateRetireFade(float Alpha)
{
	if (VolumeMID)
	{
		VolumeMID->SetScalarParameterValue(TEXT("RetireAlpha"), Alpha);
	}
}
