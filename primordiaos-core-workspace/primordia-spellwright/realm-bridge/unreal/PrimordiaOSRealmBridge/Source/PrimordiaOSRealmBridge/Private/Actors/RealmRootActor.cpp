#include "Actors/RealmRootActor.h"
#include "Actors/CosmicWebActor.h"
#include "Actors/SoulGlyphActor.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaRealmGenerator.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/StaticMeshComponent.h"

ARealmRootActor::ARealmRootActor()
{
	PrimaryActorTick.bCanEverTick = true;
	RealmRoot = CreateDefaultSubobject<USceneComponent>(TEXT("RealmRoot"));
	RealmRoot->SetMobility(EComponentMobility::Movable);
	RootComponent = RealmRoot;
}

UPrimordiaRealmGenerator* ARealmRootActor::GetOrCreateGenerator()
{
	if (!Generator)
	{
		// Standalone realms (no bridge subsystem) get a private generator with no factory.
		Generator = NewObject<UPrimordiaRealmGenerator>(this);
	}
	return Generator;
}

void ARealmRootActor::BeginPlay()
{
	Super::BeginPlay();
	// A realm placed in a level (or saved from the editor) rebuilds from its stored manifest.
	if (RealmLayers.Num() == 0 && !Manifest.SourceJson.IsEmpty())
	{
		Regenerate();
	}
}

void ARealmRootActor::ApplyManifest(const FPrimordiaRealmManifest& InManifest)
{
	GetOrCreateGenerator()->GenerateRealmFromManifest(this, InManifest);
}

void ARealmRootActor::Regenerate()
{
	FPrimordiaRealmManifest Parsed;
	FString Error;
	if (!FPrimordiaRealmManifest::FromJsonString(Manifest.SourceJson, UPrimordiaBridgeSettings::Get()->UnitsPerMeter, Parsed, Error))
	{
		UE_LOG(LogPrimordia, Warning, TEXT("%s: cannot regenerate, stored manifest is invalid: %s"), *GetName(), *Error);
		return;
	}
	UPrimordiaRealmGenerator* Gen = GetOrCreateGenerator();
	Gen->ClearRealm(this);
	Gen->GenerateRealmFromManifest(this, Parsed);
}

void ARealmRootActor::DestroyRealm()
{
	if (!bTearingDown)
	{
		Destroy(); // Destroyed() clears the generated content
	}
}

void ARealmRootActor::Destroyed()
{
	bTearingDown = true;
	if (RealmLayers.Num() || Glyphs.Num() || Topology)
	{
		GetOrCreateGenerator()->ClearRealm(this);
	}
	Super::Destroyed();
}

void ARealmRootActor::SetTargetMetaphysics(const FPrimordiaMetaphysics& Target, float Seconds)
{
	TargetMetaphysics = Target;
	if (Seconds <= 0.f)
	{
		CurrentMetaphysics = Target;
		bTransitioning = false;
		GetOrCreateGenerator()->ApplyMetaphysics(this, CurrentMetaphysics);
		OnMetaphysicsSettled(CurrentMetaphysics);
		return;
	}
	FromMetaphysics = CurrentMetaphysics;
	TransitionElapsed = 0.f;
	TransitionDuration = Seconds;
	bTransitioning = true;
}

void ARealmRootActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (!bTransitioning)
	{
		return;
	}
	TransitionElapsed += DeltaSeconds;
	const float Alpha = FMath::Clamp(TransitionElapsed / TransitionDuration, 0.f, 1.f);
	CurrentMetaphysics = FPrimordiaMetaphysics::Lerp(FromMetaphysics, TargetMetaphysics, FMath::SmoothStep(0.f, 1.f, Alpha));
	GetOrCreateGenerator()->ApplyMetaphysics(this, CurrentMetaphysics);
	if (Alpha >= 1.f)
	{
		bTransitioning = false;
		OnMetaphysicsSettled(CurrentMetaphysics);
	}
}
