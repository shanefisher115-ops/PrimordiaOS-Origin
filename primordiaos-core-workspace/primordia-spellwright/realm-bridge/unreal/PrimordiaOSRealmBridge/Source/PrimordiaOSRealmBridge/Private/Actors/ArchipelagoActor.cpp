#include "Actors/ArchipelagoActor.h"
#include "Actors/RealmRootActor.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaJson.h"
#include "Camera/PlayerCameraManager.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Engine/CollisionProfile.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Materials/MaterialInterface.h"

namespace
{
	const TCHAR* const RockMaterial = TEXT("/Game/ThirdParty/LumenneScans/M_PrimordiaGroundScan.M_PrimordiaGroundScan");
	const TCHAR* const GlowMaterial = TEXT("/PrimordiaOSRealmBridge/Materials/M_PrimordiaThreadGlow.M_PrimordiaThreadGlow");
	const TCHAR* const LowSphere = TEXT("/Engine/EngineMeshes/Sphere.Sphere");

	FLinearColor HueColor(float Hue, float Gain)
	{
		return FLinearColor::MakeFromHSV8(static_cast<uint8>(FMath::Frac(Hue) * 255.f), 170, 255) * Gain;
	}

	uint32 Hash(const FString& S, uint32 Salt) { return HashCombine(GetTypeHash(S), Salt); }
	float Rand01(uint32 H) { return (H % 10007) / 10007.f; }
}

AArchipelagoActor::AArchipelagoActor()
{
	PrimaryActorTick.bCanEverTick = true;
	Smoothing = 0.f;
	RetireFadeSeconds = 0.f;
}

UInstancedStaticMeshComponent* AArchipelagoActor::MakeISM(const TCHAR* Name, const TCHAR* Mesh, UMaterialInterface* Material, bool bCollide, bool bShadow)
{
	UInstancedStaticMeshComponent* ISM = NewObject<UInstancedStaticMeshComponent>(this, Name);
	ISM->SetupAttachment(SceneRoot);
	ISM->SetMobility(EComponentMobility::Movable);
	ISM->SetStaticMesh(LoadObject<UStaticMesh>(nullptr, Mesh));
	if (Material)
	{
		ISM->SetMaterial(0, Material);
	}
	ISM->SetNumCustomDataFloats(4);
	ISM->SetCastShadow(bShadow);
	if (bCollide)
	{
		ISM->SetCollisionProfileName(UCollisionProfile::BlockAll_ProfileName);
	}
	else
	{
		ISM->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	}
	ISM->RegisterComponent();
	AddInstanceComponent(ISM);
	return ISM;
}

void AArchipelagoActor::ApplyPayload(const TSharedPtr<FJsonObject>& P)
{
	using namespace PrimordiaJson;
	const FString NewId = Str(P, TEXT("world_id"));
	if (bBuilt && NewId == WorldId)
	{
		return; // the same world: nothing to rebuild
	}
	for (FIsland& Isle : Islands)
	{
		Unload(Isle);
	}
	Islands.Reset();
	Bridges.Reset();
	WorldId = NewId;
	const double U = UnitsPerMeter();
	if (const TArray<TSharedPtr<FJsonValue>>* List = Arr(P, TEXT("islands")))
	{
		for (const TSharedPtr<FJsonValue>& V : *List)
		{
			const TSharedPtr<FJsonObject> O = V->AsObject();
			if (!O)
			{
				continue;
			}
			FIsland Isle;
			Isle.Id = Str(O, TEXT("id"));
			Isle.Name = Str(O, TEXT("name"));
			Isle.bHome = Bool(O, TEXT("home"));
			Isle.Position = Vec(O, TEXT("position"), FVector::ZeroVector, U);
			Isle.Radius = Num(O, TEXT("radius"), 120.0) * U;
			Isle.Hue = static_cast<float>(Num(O, TEXT("hue"), 0.0));
			const TSharedPtr<FJsonObject>* Manifest = nullptr;
			if (O->TryGetObjectField(TEXT("manifest"), Manifest) && Manifest)
			{
				FString Error;
				Isle.bHasManifest = FPrimordiaRealmManifest::FromJson(*Manifest, U, Isle.Manifest, Error);
				if (!Isle.bHasManifest)
				{
					UE_LOG(LogPrimordia, Warning, TEXT("Archipelago: island %s has an invalid realm: %s"), *Isle.Name, *Error);
				}
			}
			Islands.Add(MoveTemp(Isle));
		}
	}
	if (const TArray<TSharedPtr<FJsonValue>>* List = Arr(P, TEXT("bridges")))
	{
		for (const TSharedPtr<FJsonValue>& V : *List)
		{
			if (const TSharedPtr<FJsonObject> O = V->AsObject())
			{
				Bridges.Emplace(Str(O, TEXT("a")), Str(O, TEXT("b")));
			}
		}
	}
	Build();
	UE_LOG(LogPrimordia, Log, TEXT("Archipelago %s: %d islands, %d sky-bridges"), *WorldId, Islands.Num(), Bridges.Num());
}

void AArchipelagoActor::Build()
{
	UMaterialInterface* Rock = LoadObject<UMaterialInterface>(nullptr, RockMaterial);
	UMaterialInterface* Glow = LoadObject<UMaterialInterface>(nullptr, GlowMaterial);
	if (!Undersides)
	{
		Undersides = MakeISM(TEXT("Undersides"), PrimordiaAssets::Cone, Rock, false, true);
		Discs = MakeISM(TEXT("SilhouetteDiscs"), PrimordiaAssets::Cylinder, Rock, false, false);
		Spires = MakeISM(TEXT("SilhouetteSpires"), PrimordiaAssets::Cone, Glow, false, false);
		Planks = MakeISM(TEXT("BridgePlanks"), PrimordiaAssets::Cube, Rock, true, true);
		Posts = MakeISM(TEXT("BridgePosts"), PrimordiaAssets::Cylinder, Rock, false, false);
		Lamps = MakeISM(TEXT("BridgeLamps"), LowSphere, Glow, false, false);
	}
	for (UInstancedStaticMeshComponent* ISM : { Undersides.Get(), Discs.Get(), Spires.Get(), Planks.Get(), Posts.Get(), Lamps.Get() })
	{
		ISM->ClearInstances();
	}
	const double U = UnitsPerMeter();
	const float Amber[4] = { 1.f * 5.f, 0.62f * 5.f, 0.3f * 5.f, 0.f };

	for (FIsland& Isle : Islands)
	{
		// Every island floats on an inverted rock cone (the realm's base disc is 50 cm thick).
		const double H = Isle.Radius * 0.85;
		Undersides->AddInstance(FTransform(FRotator(180.f, 0.f, 0.f), Isle.Position + FVector(0, 0, -50.0 - H * 0.5),
			FVector(2.0 * Isle.Radius / 100.0, 2.0 * Isle.Radius / 100.0, H / 100.0)), true);
		if (Isle.bHome)
		{
			continue; // the live realm is always fully there
		}
		// Silhouette: a disc and a few glowing spires in the island's hue, seen from afar.
		Isle.SilhouetteDiscs.Reset();
		Isle.SilhouetteSpires.Reset();
		Isle.DiscShapes.Reset();
		Isle.SpireShapes.Reset();
		const FTransform DiscT(FRotator::ZeroRotator, Isle.Position + FVector(0, 0, -25.0), FVector(2.0 * Isle.Radius / 100.0, 2.0 * Isle.Radius / 100.0, 0.5));
		Isle.SilhouetteDiscs.Add(Discs->AddInstance(DiscT, true));
		Isle.DiscShapes.Add(DiscT);
		const FLinearColor C = HueColor(Isle.Hue, 3.f);
		const float Data[4] = { C.R, C.G, C.B, 0.f };
		for (int32 k = 0; k < 6; ++k)
		{
			const float A = Rand01(Hash(Isle.Id, 17 + k)) * 2.f * PI;
			const double R = Isle.Radius * 0.45 * FMath::Sqrt(Rand01(Hash(Isle.Id, 91 + k)));
			const double SpireH = (15.0 + 30.0 * Rand01(Hash(Isle.Id, 53 + k))) * U;
			const FTransform SpireT(FRotator::ZeroRotator, Isle.Position + FVector(R * FMath::Cos(A), R * FMath::Sin(A), SpireH * 0.5),
				FVector(SpireH * 0.12 / 100.0, SpireH * 0.12 / 100.0, SpireH / 100.0));
			const int32 Idx = Spires->AddInstance(SpireT, true);
			Spires->SetCustomData(Idx, TArrayView<const float>(Data, 4), false);
			Isle.SilhouetteSpires.Add(Idx);
			Isle.SpireShapes.Add(SpireT);
		}
	}

	// Sky-bridges: an arched plank deck from rim to rim, posts and lamps every 12 m on both sides.
	auto Find = [this](const FString& Id) { return Islands.FindByPredicate([&Id](const FIsland& I) { return I.Id == Id; }); };
	for (const TPair<FString, FString>& B : Bridges)
	{
		const FIsland* A = Find(B.Key);
		const FIsland* Z = Find(B.Value);
		if (!A || !Z)
		{
			continue;
		}
		const FVector Dir = (Z->Position - A->Position).GetSafeNormal2D();
		const FVector Start = A->Position + Dir * (A->Radius * 0.97) + FVector(0, 0, 5.0);
		const FVector End = Z->Position - Dir * (Z->Radius * 0.97) + FVector(0, 0, 5.0);
		const double Len = FVector::Dist2D(Start, End);
		const double Arch = 0.04 * Len; // rises 4 % of its span at the middle
		const FVector Side = FVector::CrossProduct(FVector::UpVector, Dir);
		const double Step = 2.0 * U;
		const int32 N = FMath::Max(2, FMath::CeilToInt(Len / Step));
		auto At = [&](double T) { return FMath::Lerp(Start, End, T) + FVector(0, 0, 4.0 * Arch * T * (1.0 - T)); };
		for (int32 i = 0; i < N; ++i)
		{
			const double T0 = static_cast<double>(i) / N, T1 = static_cast<double>(i + 1) / N;
			const FVector P0 = At(T0), P1 = At(T1);
			const FVector Along = P1 - P0;
			const FRotator Rot = Along.Rotation();
			Planks->AddInstance(FTransform(Rot, (P0 + P1) * 0.5 - FVector(0, 0, 15.0),
				FVector(Along.Size() * 1.04 / 100.0, 4.0 * U / 100.0, 0.3 * U / 100.0)), true);
			if (i % 6 == 0)
			{
				for (const double S : { -1.0, 1.0 })
				{
					const FVector Base = P0 + Side * (S * 1.9 * U);
					Posts->AddInstance(FTransform(FRotator::ZeroRotator, Base + FVector(0, 0, 0.6 * U), FVector(0.12 * U / 100.0, 0.12 * U / 100.0, 1.2 * U / 100.0)), true);
					const int32 L = Lamps->AddInstance(FTransform(FRotator::ZeroRotator, Base + FVector(0, 0, 1.35 * U), FVector(0.35 * U / 200.0)), true);
					Lamps->SetCustomData(L, TArrayView<const float>(Amber, 4), false);
				}
			}
		}
	}
	for (UInstancedStaticMeshComponent* ISM : { Undersides.Get(), Discs.Get(), Spires.Get(), Planks.Get(), Posts.Get(), Lamps.Get() })
	{
		ISM->MarkRenderStateDirty();
	}
	bBuilt = true;
}

void AArchipelagoActor::SetSilhouette(FIsland& Isle, bool bVisible)
{
	// Hidden = squashed to nothing, so instance indices stay stable; shown = the stored transform.
	auto Apply = [bVisible](UInstancedStaticMeshComponent* ISM, const TArray<int32>& Indices, const TArray<FTransform>& Shapes)
	{
		for (int32 k = 0; k < Indices.Num(); ++k)
		{
			FTransform T = Shapes[k];
			if (!bVisible)
			{
				T.SetScale3D(FVector(1e-4));
			}
			ISM->UpdateInstanceTransform(Indices[k], T, true, false, true);
		}
		ISM->MarkRenderStateDirty();
	};
	Apply(Discs, Isle.SilhouetteDiscs, Isle.DiscShapes);
	Apply(Spires, Isle.SilhouetteSpires, Isle.SpireShapes);
}

void AArchipelagoActor::Load(FIsland& Isle)
{
	if (Isle.Realm.IsValid() || !Isle.bHasManifest || !GetWorld())
	{
		return;
	}
	FActorSpawnParameters Params;
	Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	Params.Owner = this;
	Params.bDeferConstruction = true;
	ARealmRootActor* Realm = GetWorld()->SpawnActor<ARealmRootActor>(ARealmRootActor::StaticClass(), FTransform(Isle.Position), Params);
	if (!Realm)
	{
		return;
	}
	Realm->bDrivesAtmosphere = false;
	Realm->FinishSpawning(FTransform(Isle.Position));
#if WITH_EDITOR
	Realm->SetActorLabel(FString::Printf(TEXT("Primordia_Island_%s"), *Isle.Name.Replace(TEXT(" "), TEXT("_"))));
#endif
	Realm->ApplyManifest(Isle.Manifest);
	Isle.Realm = Realm;
	SetSilhouette(Isle, false);
	++LoadedIslands;
	UE_LOG(LogPrimordia, Log, TEXT("Archipelago: streamed in %s"), *Isle.Name);
}

void AArchipelagoActor::Unload(FIsland& Isle)
{
	if (ARealmRootActor* Realm = Isle.Realm.Get())
	{
		Realm->DestroyRealm();
		--LoadedIslands;
		UE_LOG(LogPrimordia, Log, TEXT("Archipelago: released %s"), *Isle.Name);
	}
	Isle.Realm = nullptr;
}

void AArchipelagoActor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	StreamClock += DeltaSeconds;
	if (!bBuilt || StreamClock < 0.5f || !GetWorld())
	{
		return;
	}
	StreamClock = 0.f;
	const APlayerController* PC = GetWorld()->GetFirstPlayerController();
	if (!PC || !PC->PlayerCameraManager)
	{
		return;
	}
	const FVector Eye = PC->PlayerCameraManager->GetCameraLocation();
	const double U = UnitsPerMeter();
	// At most one island changes per half second, so streaming never hitches a frame twice.
	for (FIsland& Isle : Islands)
	{
		if (Isle.bHome)
		{
			continue;
		}
		const double D = FVector::Dist2D(Eye, Isle.Position);
		if (!Isle.Realm.IsValid() && D < LoadMeters * U)
		{
			Load(Isle);
			return;
		}
		if (Isle.Realm.IsValid() && D > UnloadMeters * U)
		{
			Unload(Isle);
			SetSilhouette(Isle, true);
			return;
		}
	}
}

void AArchipelagoActor::Destroyed()
{
	for (FIsland& Isle : Islands)
	{
		Unload(Isle);
	}
	Super::Destroyed();
}
