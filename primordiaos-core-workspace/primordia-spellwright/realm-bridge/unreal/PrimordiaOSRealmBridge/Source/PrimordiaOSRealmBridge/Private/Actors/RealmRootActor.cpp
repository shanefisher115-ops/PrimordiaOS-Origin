#include "Actors/RealmRootActor.h"
#include "Actors/CosmicWebActor.h"
#include "Actors/SoulGlyphActor.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaRealmAtmosphere.h"
#include "PrimordiaRealmGenerator.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/PostProcessComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/ExponentialHeightFog.h"
#include "EngineUtils.h"

ARealmRootActor::ARealmRootActor()
{
	PrimaryActorTick.bCanEverTick = true;
	RealmRoot = CreateDefaultSubobject<USceneComponent>(TEXT("RealmRoot"));
	RealmRoot->SetMobility(EComponentMobility::Movable);
	RootComponent = RealmRoot;

	// Off until the first ApplyAtmosphere decides (the level may bring its own fog).
	AtmosphereFog = CreateDefaultSubobject<UExponentialHeightFogComponent>(TEXT("AtmosphereFog"));
	AtmosphereFog->SetupAttachment(RealmRoot);
	AtmosphereFog->SetAutoActivate(false);
	AtmosphereFog->SetVisibility(false);

	AtmosphereGrade = CreateDefaultSubobject<UPostProcessComponent>(TEXT("AtmosphereGrade"));
	AtmosphereGrade->SetupAttachment(RealmRoot);
	AtmosphereGrade->bUnbound = true;
	AtmosphereGrade->Priority = -10.f;
	AtmosphereGrade->BlendWeight = 0.f;
}

void ARealmRootActor::ApplyAtmosphere(const FPrimordiaMetaphysics& M)
{
	if (!bDrivesAtmosphere)
	{
		return;
	}
	const UPrimordiaBridgeSettings* Settings = UPrimordiaBridgeSettings::Get();
	if (!bFogChecked && GetWorld())
	{
		// One height fog per scene: a level that already has one keeps it.
		bool bLevelFog = false;
		for (TActorIterator<AExponentialHeightFog> It(GetWorld()); It; ++It)
		{
			bLevelFog = true;
			break;
		}
		const bool bUseFog = Settings->bRealmFog && !bLevelFog;
		AtmosphereFog->SetVisibility(bUseFog);
		AtmosphereFog->SetActive(bUseFog);
		bFogChecked = true;
		if (bLevelFog && Settings->bRealmFog)
		{
			UE_LOG(LogPrimordia, Log, TEXT("%s: the level has its own height fog; realm fog stays off."), *GetName());
		}
	}
	const FPrimordiaAtmosphereLook Look = PrimordiaAtmosphere::Evaluate(M);
	PrimordiaAtmosphere::Apply(Look, AtmosphereFog->IsVisible() ? AtmosphereFog.Get() : nullptr, AtmosphereGrade,
		Settings->bRealmColorGrade ? Settings->RealmColorGradeStrength : 0.f, 5.f * FMath::Max(1000.f, Manifest.BoundsRadius));
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
