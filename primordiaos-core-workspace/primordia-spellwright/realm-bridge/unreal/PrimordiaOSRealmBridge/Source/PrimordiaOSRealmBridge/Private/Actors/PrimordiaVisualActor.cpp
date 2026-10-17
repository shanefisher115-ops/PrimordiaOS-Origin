#include "Actors/PrimordiaVisualActor.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaPayload.h"
#include "Components/MeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"

APrimordiaVisualActor::APrimordiaVisualActor()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.bStartWithTickEnabled = true;
	SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot"));
	SceneRoot->SetMobility(EComponentMobility::Movable);
	RootComponent = SceneRoot;
}

float APrimordiaVisualActor::UnitsPerMeter() const
{
	return UPrimordiaBridgeSettings::Get()->UnitsPerMeter;
}

void APrimordiaVisualActor::ApplyPacket(const FPrimordiaPacket& Packet)
{
	// Drop stale/out-of-order packets; a large backwards jump means the bridge restarted.
	if (bHasReceivedPacket && Packet.Seq <= LastSeq && LastSeq - Packet.Seq < 100000)
	{
		return;
	}
	if (bRetiring)
	{
		// Revived (same id re-upserted while fading out).
		bRetiring = false;
		RetireElapsed = 0.f;
		RetireAlpha = 1.f;
		SetLifeSpan(0.f);
	}

	const bool bFirst = !bHasReceivedPacket;
	bHasReceivedPacket = true;
	LastSeq = Packet.Seq;
	LastSimTime = Packet.SimTime;
	ApplyPayload(Packet.Payload);

	if (bFirst)
	{
		// The first packet places the actor; later ones glide.
		if (bHasTargetLocation) SceneRoot->SetRelativeLocation(TargetLocation);
		if (bHasTargetScale) SceneRoot->SetRelativeScale3D(TargetScale);
	}
	if (bExposePayloadToBlueprint)
	{
		OnPrimordiaPayload(FPrimordiaPacketInfo::From(Packet), UPrimordiaPayload::Wrap(this, Packet.Payload));
	}
}

void APrimordiaVisualActor::BeginRetire()
{
	if (bRetiring)
	{
		return;
	}
	bRetiring = true;
	RetireElapsed = 0.f;
	OnPrimordiaRetire();
	if (RetireFadeSeconds <= 0.f)
	{
		Destroy();
		return;
	}
	SetLifeSpan(RetireFadeSeconds + 0.1f);
}

void APrimordiaVisualActor::SetTargetLocation(const FVector& RelativeLocation, bool bSnap)
{
	TargetLocation = RelativeLocation;
	bHasTargetLocation = true;
	if (bSnap)
	{
		SceneRoot->SetRelativeLocation(RelativeLocation);
	}
}

void APrimordiaVisualActor::SetTargetScale(const FVector& Scale, bool bSnap)
{
	TargetScale = Scale;
	bHasTargetScale = true;
	if (bSnap)
	{
		SceneRoot->SetRelativeScale3D(Scale);
	}
}

UMaterialInstanceDynamic* APrimordiaVisualActor::MakeMID(UMeshComponent* Mesh, UMaterialInterface* Material)
{
	if (!Mesh)
	{
		return nullptr;
	}
	if (!Material)
	{
		Material = LoadObject<UMaterialInterface>(nullptr, PrimordiaAssets::BasicMaterial);
	}
	UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(Material, this);
	Mesh->SetMaterial(0, MID);
	return MID;
}

void APrimordiaVisualActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	const float Alpha = ExpAlpha(Smoothing, DeltaSeconds);
	if (bHasTargetLocation)
	{
		SceneRoot->SetRelativeLocation(FMath::Lerp(SceneRoot->GetRelativeLocation(), TargetLocation, Alpha));
	}
	if (bHasTargetScale)
	{
		SceneRoot->SetRelativeScale3D(FMath::Lerp(SceneRoot->GetRelativeScale3D(), TargetScale, Alpha));
	}

	if (bRetiring)
	{
		RetireElapsed += DeltaSeconds;
		RetireAlpha = FMath::Clamp(1.f - RetireElapsed / FMath::Max(RetireFadeSeconds, KINDA_SMALL_NUMBER), 0.f, 1.f);
	}
	UpdateRetireFade(RetireAlpha);
}
