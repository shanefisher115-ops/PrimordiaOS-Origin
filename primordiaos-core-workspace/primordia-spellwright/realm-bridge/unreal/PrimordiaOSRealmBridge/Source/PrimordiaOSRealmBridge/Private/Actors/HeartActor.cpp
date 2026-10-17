#include "Actors/HeartActor.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaJson.h"
#include "Components/PointLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInstanceDynamic.h"

AHeartActor::AHeartActor()
{
	Core = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Core"));
	Core->SetupAttachment(SceneRoot);
	Core->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Core->CastShadow = false;

	Glow = CreateDefaultSubobject<UPointLightComponent>(TEXT("Glow"));
	Glow->SetupAttachment(SceneRoot);
	Glow->SetIntensityUnits(ELightUnits::Unitless);
	Glow->SetAttenuationRadius(4000.f);
	Glow->SetCastShadows(false);
}

void AHeartActor::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	const UPrimordiaBridgeSettings* S = UPrimordiaBridgeSettings::Get();
	if (!Core->GetStaticMesh())
	{
		Core->SetStaticMesh(UPrimordiaBridgeSettings::LoadOr(S->HeartMesh, PrimordiaAssets::Sphere));
	}
}

void AHeartActor::BeginPlay()
{
	Super::BeginPlay();
	EnsureMaterials();
}

void AHeartActor::EnsureMaterials()
{
	if (!CoreMID)
	{
		CoreMID = MakeMID(Core, UPrimordiaBridgeSettings::LoadOr(UPrimordiaBridgeSettings::Get()->HeartMaterial, nullptr));
	}
}

float AHeartActor::PulseEnvelope(float InPhase)
{
	const float Lub = FMath::Exp(-FMath::Square((InPhase - 0.08f) / 0.05f));
	const float Dub = 0.6f * FMath::Exp(-FMath::Square((InPhase - 0.30f) / 0.06f));
	return FMath::Clamp(Lub + Dub, 0.f, 1.f);
}

void AHeartActor::ApplyPayload(const TSharedPtr<FJsonObject>& P)
{
	using namespace PrimordiaJson;
	Bpm = FMath::Clamp<float>(Num(P, TEXT("bpm"), Bpm), 1.f, 400.f);
	ServerPhase = FMath::Frac(Num(P, TEXT("phase"), ServerPhase));
	Amplitude = Num(P, TEXT("amplitude"), Amplitude);
	Coherence = Num(P, TEXT("coherence"), Coherence);
	Essence = Color(P, TEXT("essence"), Essence);
	BaseDiameterUnits = Num(P, TEXT("scale"), 2.5) * UnitsPerMeter();

	if (!bHasReceivedPacket)
	{
		Phase = ServerPhase;
	}
	SetTargetLocation(Vec(P, TEXT("position"), FVector::ZeroVector, UnitsPerMeter()));
}

void AHeartActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	EnsureMaterials();

	// Dead-reckon, then pull toward the server phase along the shortest wrap.
	ServerPhase = FMath::Frac(ServerPhase + DeltaSeconds * Bpm / 60.f);
	Phase = FMath::Frac(Phase + DeltaSeconds * Bpm / 60.f);
	float Error = ServerPhase - Phase;
	Error -= FMath::RoundToFloat(Error);
	Phase = FMath::Abs(Error) > 0.25f ? ServerPhase : FMath::Frac(Phase + Error * ExpAlpha(PhaseCorrection, DeltaSeconds) + 1.f);

	Pulse = PulseEnvelope(Phase);
	const float Drive = Pulse * Amplitude;

	// Basic shapes are 100 units across: scale = diameter / 100.
	Core->SetRelativeScale3D(FVector(BaseDiameterUnits / 100.f * (1.f + SwellAmount * Drive)));
	Glow->SetIntensity((LightIntensityBase + LightIntensityPulse * Drive) * RetireAlpha);
	Glow->SetLightColor(Essence);

	if (CoreMID)
	{
		CoreMID->SetScalarParameterValue(TEXT("Pulse"), Pulse);
		CoreMID->SetScalarParameterValue(TEXT("Intensity"), EmissiveBase + EmissivePulseGain * Drive);
		CoreMID->SetScalarParameterValue(TEXT("Coherence"), Coherence);
		CoreMID->SetVectorParameterValue(TEXT("EssenceColor"), Essence);
		CoreMID->SetVectorParameterValue(TEXT("Color"), Essence * (1.f + 4.f * Drive));
	}
}

void AHeartActor::UpdateRetireFade(float Alpha)
{
	if (CoreMID)
	{
		CoreMID->SetScalarParameterValue(TEXT("RetireAlpha"), Alpha);
	}
}
