#include "PrimordiaRealmGenerator.h"
#include "PrimordiaActorFactory.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaTopology.h"
#include "Actors/CosmicWebActor.h"
#include "Actors/RealmRootActor.h"
#include "Actors/SoulGlyphActor.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/CollisionProfile.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialParameterCollection.h"
#include "Materials/MaterialParameterCollectionInstance.h"

namespace
{
	template <typename T>
	T* NewRealmComponent(ARealmRootActor* Root, USceneComponent* Parent, const FString& BaseName)
	{
		T* Component = NewObject<T>(Root, MakeUniqueObjectName(Root, T::StaticClass(), FName(*BaseName)), RF_Transient);
		Component->SetMobility(EComponentMobility::Movable);
		Component->SetupAttachment(Parent);
		Component->RegisterComponent();
		Root->AddInstanceComponent(Component);
		return Component;
	}

	// PRS-1 §4.3: which engine shape each layer kind scatters / uses as its base.
	const TCHAR* ScatterMeshFor(FName Kind)
	{
		if (Kind == TEXT("ground")) return PrimordiaAssets::Cylinder; // terraces + monoliths
		if (Kind == TEXT("ocean")) return PrimordiaAssets::Sphere;    // floating motes
		if (Kind == TEXT("sky")) return PrimordiaAssets::Sphere;      // stars
		if (Kind == TEXT("ring")) return PrimordiaAssets::Cube;       // shards
		if (Kind == TEXT("lattice")) return PrimordiaAssets::Cube;    // lattice nodes
		if (Kind == TEXT("spire_field")) return PrimordiaAssets::Cone;
		return nullptr;
	}

	const TCHAR* BaseMeshFor(FName Kind)
	{
		if (Kind == TEXT("ground") || Kind == TEXT("ocean")) return PrimordiaAssets::Cylinder;
		if (Kind == TEXT("void")) return PrimordiaAssets::Sphere;
		return nullptr;
	}

	FLinearColor PaletteColor(const FPrimordiaRealmLayer& Layer, int32 Index, const FLinearColor& Default)
	{
		return Layer.Palette.IsValidIndex(Index) ? Layer.Palette[Index] : Default;
	}

	bool IsInWorldOf(const AActor* Actor) { return Actor && Actor->GetWorld(); }
}

// ---------------------------------------------------------------------------

void UPrimordiaRealmGenerator::SetFactory(UPrimordiaActorFactory* InFactory)
{
	Factory = InFactory;
}

void UPrimordiaRealmGenerator::GenerateRealmFromManifest(ARealmRootActor* Root, const FPrimordiaRealmManifest& M)
{
	if (!IsInWorldOf(Root))
	{
		return;
	}
	const bool bSameRealm = Root->Manifest.RealmId == M.RealmId && (Root->RealmLayers.Num() > 0 || Root->bHasTopology);
	if (!bSameRealm)
	{
		ClearRealm(Root);
	}
	const int32 PreviousRevision = Root->Manifest.Revision;
	Root->Manifest = M;

	// Layers: diff by id.
	TSet<FString> KeepLayers;
	for (const FPrimordiaRealmLayer& Layer : M.Layers)
	{
		KeepLayers.Add(Layer.Id);
		FPrimordiaLayerRuntime* Runtime = Root->RealmLayers.Find(Layer.Id);
		if (Runtime && Runtime->Signature == Layer.StructuralHash())
		{
			ApplyDensity(*Runtime, Layer.Density);
			if (Runtime->MID)
			{
				Runtime->MID->SetScalarParameterValue(TEXT("Density"), Layer.Density);
			}
		}
		else
		{
			SpawnLayer(Root, Layer, M.Seed);
		}
	}
	for (auto It = Root->RealmLayers.CreateIterator(); It; ++It)
	{
		if (!KeepLayers.Contains(It->Key))
		{
			DestroyLayer(It->Value);
			It.RemoveCurrent();
		}
	}

	// Glyphs: diff by id.
	TSet<FString> KeepGlyphs;
	for (const FPrimordiaGlyphSpec& Glyph : M.Glyphs)
	{
		KeepGlyphs.Add(Glyph.Id);
		SpawnGlyph(Root, Glyph);
	}
	for (auto It = Root->Glyphs.CreateIterator(); It; ++It)
	{
		if (!KeepGlyphs.Contains(It->Key))
		{
			RetireGlyph(Root, It->Value);
			It.RemoveCurrent();
		}
	}

	// Topology: only when its spec changed (or it never existed).
	if (!Root->bHasTopology || !IsValid(Root->Topology) || !(Root->AppliedTopology == M.Topology))
	{
		SpawnTopology(Root, M.Topology, M.Seed);
	}

	Root->SetTargetMetaphysics(M.Metaphysics, bSameRealm ? M.TransitionSeconds : 0.f);

	UE_LOG(LogPrimordia, Log, TEXT("Realm '%s' (%s) %s rev %d: %d layers, %d glyphs, topology %s/%d"),
		*M.RealmName, *M.RealmId, bSameRealm ? TEXT("evolved") : TEXT("generated"), M.Revision,
		M.Layers.Num(), M.Glyphs.Num(), *M.Topology.Kind.ToString(), M.Topology.NodeCount);
	if (!bSameRealm || PreviousRevision != M.Revision)
	{
		Root->OnRealmGenerated(M);
	}
}

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

USceneComponent* UPrimordiaRealmGenerator::SpawnLayer(ARealmRootActor* Root, const FPrimordiaRealmLayer& Layer, int64 RealmSeed)
{
	if (!IsInWorldOf(Root))
	{
		return nullptr;
	}
	if (FPrimordiaLayerRuntime* Existing = Root->RealmLayers.Find(Layer.Id))
	{
		DestroyLayer(*Existing);
		Root->RealmLayers.Remove(Layer.Id);
	}

	const UPrimordiaBridgeSettings* Settings = UPrimordiaBridgeSettings::Get();
	FPrimordiaLayerRuntime Runtime;
	Runtime.Kind = Layer.Kind;
	Runtime.Signature = Layer.StructuralHash();

	Runtime.Root = NewRealmComponent<USceneComponent>(Root, Root->RealmRoot, TEXT("Layer_") + Layer.Id);
	Runtime.Root->SetRelativeLocation(FVector(0, 0, Layer.Altitude));
	if (Layer.Kind == TEXT("ring"))
	{
		Runtime.Root->SetRelativeRotation(FRotator(0.f, 0.f, Layer.Param(TEXT("tilt_deg"), 0.f)));
	}

	// One MID per layer: palette, density and every numeric param are exposed by name.
	UMaterialInterface* Material = nullptr;
	if (const TSoftObjectPtr<UMaterialInterface>* Override = Settings->LayerMaterials.Find(Layer.Kind))
	{
		Material = Override->LoadSynchronous();
	}
	if (!Material)
	{
		Material = LoadObject<UMaterialInterface>(nullptr, PrimordiaAssets::BasicMaterial);
	}
	Runtime.MID = UMaterialInstanceDynamic::Create(Material, Root);
	Runtime.MID->SetVectorParameterValue(TEXT("Color"), PaletteColor(Layer, 0, FLinearColor::Gray));
	Runtime.MID->SetVectorParameterValue(TEXT("SecondaryColor"), PaletteColor(Layer, 1, FLinearColor::Black));
	Runtime.MID->SetScalarParameterValue(TEXT("Density"), Layer.Density);
	Runtime.MID->SetScalarParameterValue(TEXT("Radius"), Layer.Radius);
	for (const TPair<FString, float>& Param : Layer.Params)
	{
		Runtime.MID->SetScalarParameterValue(FName(*Param.Key), Param.Value);
	}

	UStaticMesh* MeshOverride = nullptr;
	if (const TSoftObjectPtr<UStaticMesh>* Override = Settings->LayerMeshes.Find(Layer.Kind))
	{
		MeshOverride = Override->LoadSynchronous();
	}

	if (const TCHAR* BasePath = BaseMeshFor(Layer.Kind))
	{
		Runtime.Base = NewRealmComponent<UStaticMeshComponent>(Root, Runtime.Root, TEXT("Base_") + Layer.Id);
		Runtime.Base->SetStaticMesh(LoadObject<UStaticMesh>(nullptr, BasePath));
		Runtime.Base->SetMaterial(0, Runtime.MID);
		if (Layer.Kind == TEXT("void"))
		{
			const float Diameter = 2.f * Layer.Radius * Layer.Param(TEXT("aperture"), 0.5f);
			Runtime.Base->SetRelativeScale3D(FVector(Diameter / 100.f));
			Runtime.Base->SetReverseCulling(true); // seen from inside: a hollow
			Runtime.Base->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		}
		else
		{
			// Disc 50 cm thick, top surface at the layer altitude.
			Runtime.Base->SetRelativeScale3D(FVector(2.f * Layer.Radius / 100.f, 2.f * Layer.Radius / 100.f, 0.5f));
			Runtime.Base->SetRelativeLocation(FVector(0, 0, -25.f));
			if (Layer.Kind == TEXT("ground"))
			{
				Runtime.Base->SetCollisionProfileName(UCollisionProfile::BlockAll_ProfileName);
			}
			else
			{
				Runtime.Base->SetCollisionEnabled(ECollisionEnabled::NoCollision);
			}
		}
	}

	if (const TCHAR* ScatterPath = ScatterMeshFor(Layer.Kind))
	{
		Runtime.Instances = NewRealmComponent<UInstancedStaticMeshComponent>(Root, Runtime.Root, TEXT("Scatter_") + Layer.Id);
		Runtime.Instances->SetStaticMesh(MeshOverride ? MeshOverride : LoadObject<UStaticMesh>(nullptr, ScatterPath));
		Runtime.Instances->SetMaterial(0, Runtime.MID);
		Runtime.Instances->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		Runtime.Instances->CastShadow = Layer.Kind == TEXT("ground") || Layer.Kind == TEXT("spire_field");
		BuildCandidates(Layer, FPrimordiaRandom::SubSeed(static_cast<uint32>(RealmSeed), TEXT("layer:") + Layer.Id), Runtime);
		ApplyDensity(Runtime, Layer.Density);
	}

	USceneComponent* LayerRoot = Runtime.Root;
	Root->RealmLayers.Add(Layer.Id, MoveTemp(Runtime));
	return LayerRoot;
}

void UPrimordiaRealmGenerator::BuildCandidates(const FPrimordiaRealmLayer& Layer, uint32 Seed, FPrimordiaLayerRuntime& Runtime) const
{
	FPrimordiaRandom Rng(Seed);
	TArray<FTransform>& Out = Runtime.Candidates;
	Out.Reset();
	Runtime.FixedCount = 0;
	const float R = Layer.Radius;
	const FName Kind = Layer.Kind;
	auto Uniform = [&Rng]() { return static_cast<float>(Rng.Next()); };

	if (Kind == TEXT("ground"))
	{
		// Terraces (always shown): concentric discs stepping upward.
		const float Roughness = Layer.Param(TEXT("roughness"), 0.5f);
		const int32 Terraces = FMath::Clamp(FMath::RoundToInt(Layer.Param(TEXT("terrace_count"), 1.f)), 1, 12);
		const float Step = 150.f * (0.5f + Roughness);
		for (int32 t = 1; t < Terraces; ++t)
		{
			const float Radius = R * (1.f - static_cast<float>(t) / (Terraces + 1));
			Out.Emplace(FQuat::Identity, FVector(0, 0, t * Step - 25.f), FVector(2.f * Radius / 100.f, 2.f * Radius / 100.f, 0.5f));
		}
		Runtime.FixedCount = Out.Num();
		// Monoliths.
		const int32 Max = FMath::Min(MaxScatterPerLayer, 400);
		for (int32 i = 0; i < Max; ++i)
		{
			const float Rr = R * 0.95f * FMath::Sqrt(Uniform());
			const float A = Uniform() * 2.f * PI;
			const float H = 200.f + Uniform() * 800.f * (0.5f + Roughness);
			const float W = 30.f + Uniform() * 120.f;
			Out.Emplace(FQuat::Identity, FVector(FMath::Cos(A) * Rr, FMath::Sin(A) * Rr, H * 0.5f), FVector(W / 100.f, W / 100.f, H / 100.f));
		}
	}
	else if (Kind == TEXT("ocean"))
	{
		const int32 Max = FMath::Min(MaxScatterPerLayer, 200);
		for (int32 i = 0; i < Max; ++i)
		{
			const float Rr = R * FMath::Sqrt(Uniform());
			const float A = Uniform() * 2.f * PI;
			const float S = (20.f + Uniform() * 60.f) / 100.f;
			Out.Emplace(FQuat::Identity, FVector(FMath::Cos(A) * Rr, FMath::Sin(A) * Rr, 100.f + Uniform() * 600.f), FVector(S));
		}
	}
	else if (Kind == TEXT("sky"))
	{
		const int32 Max = FMath::Min(MaxScatterPerLayer, FMath::RoundToInt(Layer.Param(TEXT("star_count"), 800.f)));
		for (int32 i = 0; i < Max; ++i)
		{
			const float Z = Uniform();
			const float Phi = Uniform() * 2.f * PI;
			const float Ring = FMath::Sqrt(1.f - Z * Z);
			const float S = (30.f + Uniform() * 150.f) / 100.f;
			Out.Emplace(FQuat::Identity, FVector(Ring * FMath::Cos(Phi), Ring * FMath::Sin(Phi), Z) * R, FVector(S));
		}
	}
	else if (Kind == TEXT("ring"))
	{
		const int32 Max = FMath::Min(MaxScatterPerLayer, 600);
		const float Thickness = Layer.Param(TEXT("thickness"), 300.f);
		for (int32 i = 0; i < Max; ++i)
		{
			const float A = static_cast<float>(i) / Max * 2.f * PI + Uniform() * 0.02f;
			const float Rad = R + (Uniform() - 0.5f) * Thickness;
			const float Z = (Uniform() - 0.5f) * Thickness * 0.3f;
			const FRotator Rot(Uniform() * 360.f, Uniform() * 360.f, Uniform() * 360.f);
			const float S = (30.f + Uniform() * 150.f) / 100.f;
			Out.Emplace(Rot.Quaternion(), FVector(FMath::Cos(A) * Rad, FMath::Sin(A) * Rad, Z), FVector(S));
		}
	}
	else if (Kind == TEXT("lattice"))
	{
		const float Cell = FMath::Max(50.f, Layer.Param(TEXT("cell_size"), 800.f));
		const int32 N = FMath::Clamp(FMath::FloorToInt(R / Cell), 1, 20);
		for (int32 X = -N; X <= N; ++X)
		for (int32 Y = -N; Y <= N; ++Y)
		for (int32 Z = -N; Z <= N; ++Z)
		{
			const FVector P(X * Cell, Y * Cell, Z * Cell);
			if (P.Size() <= R)
			{
				Out.Emplace(FQuat::Identity, P, FVector(Cell * 0.08f / 100.f));
			}
		}
		// Deterministic shuffle so a density prefix samples the whole lattice evenly.
		for (int32 i = Out.Num() - 1; i > 0; --i)
		{
			Out.Swap(i, FMath::Min(i, static_cast<int32>(Uniform() * (i + 1))));
		}
		if (Out.Num() > MaxScatterPerLayer)
		{
			Out.SetNum(MaxScatterPerLayer);
		}
	}
	else if (Kind == TEXT("spire_field"))
	{
		const int32 Max = FMath::Min(MaxScatterPerLayer, 300);
		const float MaxHeight = Layer.Param(TEXT("max_height"), 2500.f);
		for (int32 i = 0; i < Max; ++i)
		{
			const float Rr = R * FMath::Sqrt(Uniform());
			const float A = Uniform() * 2.f * PI;
			const float U = Uniform();
			const float H = MaxHeight * (0.2f + 0.8f * U * U);
			const float W = H * 0.08f + 50.f;
			// Engine cone pivot is its centre: lift by half the height.
			Out.Emplace(FQuat::Identity, FVector(FMath::Cos(A) * Rr, FMath::Sin(A) * Rr, H * 0.5f), FVector(W / 100.f, W / 100.f, H / 100.f));
		}
	}
}

void UPrimordiaRealmGenerator::ApplyDensity(FPrimordiaLayerRuntime& Runtime, float Density) const
{
	if (!Runtime.Instances)
	{
		return;
	}
	const int32 Scatter = Runtime.Candidates.Num() - Runtime.FixedCount;
	const int32 Shown = Runtime.FixedCount + FMath::RoundToInt(FMath::Clamp(Density, 0.f, 1.f) * Scatter);
	if (Shown == Runtime.ShownCount)
	{
		return;
	}
	// Candidates are deterministic, so the visible set is always a stable prefix:
	// density changes add or remove instances at the tail without reshuffling.
	Runtime.Instances->ClearInstances();
	Runtime.Instances->AddInstances(TArray<FTransform>(Runtime.Candidates.GetData(), Shown), false);
	Runtime.ShownCount = Shown;
}

void UPrimordiaRealmGenerator::DestroyLayer(FPrimordiaLayerRuntime& Runtime) const
{
	if (Runtime.Instances) Runtime.Instances->DestroyComponent();
	if (Runtime.Base) Runtime.Base->DestroyComponent();
	if (Runtime.Root) Runtime.Root->DestroyComponent();
	Runtime = FPrimordiaLayerRuntime();
}

// ---------------------------------------------------------------------------
// Glyphs and topology
// ---------------------------------------------------------------------------

ASoulGlyphActor* UPrimordiaRealmGenerator::SpawnGlyph(ARealmRootActor* Root, const FPrimordiaGlyphSpec& Glyph)
{
	if (!IsInWorldOf(Root))
	{
		return nullptr;
	}
	UPrimordiaActorFactory* F = Factory.Get();
	ASoulGlyphActor* Actor = Root->Glyphs.FindRef(Glyph.Id);

	// A bound glyph whose live stream already spawned an actor reuses it.
	if (!IsValid(Actor) && F && !Glyph.BoundTo.IsEmpty())
	{
		Actor = Cast<ASoulGlyphActor>(F->FindEntity(EPrimordiaPacketType::SoulUnification, Glyph.BoundTo));
	}
	if (!IsValid(Actor))
	{
		FActorSpawnParameters Params;
		Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		Params.Owner = Root;
		if (Root->GetWorld()->WorldType == EWorldType::Editor)
		{
			Params.ObjectFlags |= RF_Transient;
		}
		Actor = Root->GetWorld()->SpawnActor<ASoulGlyphActor>(ASoulGlyphActor::StaticClass(), FTransform::Identity, Params);
		if (!Actor)
		{
			return nullptr;
		}
		Actor->EntityId = TEXT("glyph:") + Glyph.Id;
#if WITH_EDITOR
		Actor->SetActorLabel(FString::Printf(TEXT("Primordia_Glyph_%s"), *Glyph.Id));
#endif
	}
	if (Actor->GetAttachParentActor() != Root)
	{
		Actor->AttachToActor(Root, FAttachmentTransformRules::KeepRelativeTransform);
	}
	Root->Glyphs.Add(Glyph.Id, Actor);
	Actor->ApplyGlyphSpec(Glyph);

	if (F && !Glyph.BoundTo.IsEmpty())
	{
		F->Adopt(EPrimordiaPacketType::SoulUnification, Glyph.BoundTo, Actor);
	}
	return Actor;
}

void UPrimordiaRealmGenerator::RetireGlyph(ARealmRootActor* Root, ASoulGlyphActor* Glyph) const
{
	if (!IsValid(Glyph))
	{
		return;
	}
	if (UPrimordiaActorFactory* F = Factory.Get())
	{
		F->Release(Glyph);
	}
	Glyph->BeginRetire();
}

ACosmicWebActor* UPrimordiaRealmGenerator::SpawnTopology(ARealmRootActor* Root, const FPrimordiaTopologySpec& Topology, int64 RealmSeed)
{
	if (!IsInWorldOf(Root))
	{
		return nullptr;
	}
	UPrimordiaActorFactory* F = Factory.Get();
	const FString WebId = TEXT("web:") + Root->Manifest.RealmId;
	const double LastLive = F ? F->GetLastUpdate(EPrimordiaPacketType::CosmicWeb, WebId) : 0.0;
	const bool bLive = LastLive > 0.0 && FPlatformTime::Seconds() - LastLive < LiveStreamGraceSeconds;

	ACosmicWebActor* Web = Root->Topology;
	if (!IsValid(Web) && F)
	{
		Web = Cast<ACosmicWebActor>(F->FindEntity(EPrimordiaPacketType::CosmicWeb, WebId));
	}
	if (!IsValid(Web))
	{
		FActorSpawnParameters Params;
		Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		Params.Owner = Root;
		if (Root->GetWorld()->WorldType == EWorldType::Editor)
		{
			Params.ObjectFlags |= RF_Transient;
		}
		Web = Root->GetWorld()->SpawnActor<ACosmicWebActor>(ACosmicWebActor::StaticClass(), FTransform::Identity, Params);
		if (!Web)
		{
			return nullptr;
		}
#if WITH_EDITOR
		Web->SetActorLabel(TEXT("Primordia_CosmicWeb"));
#endif
	}
	if (Web->GetAttachParentActor() != Root)
	{
		Web->AttachToActor(Root, FAttachmentTransformRules::KeepRelativeTransform);
	}
	Root->Topology = Web;
	Root->AppliedTopology = Topology;
	Root->bHasTopology = true;
	if (F)
	{
		F->Adopt(EPrimordiaPacketType::CosmicWeb, WebId, Web);
	}

	// PRS-1 §4.4: the live stream is authoritative; offline synthesis only seeds or stands in for it.
	if (!bLive)
	{
		const uint32 TopologySeed = FPrimordiaRandom::SubSeed(static_cast<uint32>(RealmSeed), TEXT("topology"));
		Web->BuildFromGraph(PrimordiaTopology::Synthesize(Topology, TopologySeed), Topology.CenterMeters);
	}
	return Web;
}

// ---------------------------------------------------------------------------
// Metaphysics and teardown
// ---------------------------------------------------------------------------

void UPrimordiaRealmGenerator::ApplyMetaphysics(ARealmRootActor* Root, const FPrimordiaMetaphysics& M)
{
	if (!IsInWorldOf(Root))
	{
		return;
	}
	UWorld* World = Root->GetWorld();

	// 1. Global: Material Parameter Collection read by every Primordia material.
	if (UMaterialParameterCollection* Collection = UPrimordiaBridgeSettings::Get()->MetaphysicsCollection.LoadSynchronous())
	{
		if (UMaterialParameterCollectionInstance* Instance = World->GetParameterCollectionInstance(Collection))
		{
			Instance->SetScalarParameterValue(TEXT("Entropy"), M.Entropy);
			Instance->SetScalarParameterValue(TEXT("Luminosity"), M.Luminosity);
			Instance->SetScalarParameterValue(TEXT("Coherence"), M.Coherence);
			Instance->SetScalarParameterValue(TEXT("Resonance"), M.Resonance);
			Instance->SetScalarParameterValue(TEXT("Inversion"), M.Inversion);
			Instance->SetScalarParameterValue(TEXT("Lucidity"), M.Lucidity);
			Instance->SetScalarParameterValue(TEXT("TimeDilation"), M.TimeDilation);
			Instance->SetVectorParameterValue(TEXT("Essence"), M.Essence);
		}
	}

	// 2. Per-layer: the same scalars on each layer MID (works without an MPC).
	for (TPair<FString, FPrimordiaLayerRuntime>& Pair : Root->RealmLayers)
	{
		if (UMaterialInstanceDynamic* MID = Pair.Value.MID)
		{
			MID->SetScalarParameterValue(TEXT("Entropy"), M.Entropy);
			MID->SetScalarParameterValue(TEXT("Luminosity"), M.Luminosity);
			MID->SetScalarParameterValue(TEXT("Coherence"), M.Coherence);
			MID->SetScalarParameterValue(TEXT("Inversion"), M.Inversion);
			MID->SetVectorParameterValue(TEXT("Essence"), M.Essence);
		}
	}

	// Glyphs: volumetric sigils take their light and motion from the realm's state.
	for (TPair<FString, TObjectPtr<ASoulGlyphActor>>& Pair : Root->Glyphs)
	{
		if (IsValid(Pair.Value))
		{
			Pair.Value->SetMetaphysics(M);
		}
	}

	// 3. Time: every realm entity runs at the realm's dilation.
	TArray<AActor*> Attached;
	Root->GetAttachedActors(Attached, true, true);
	for (AActor* Actor : Attached)
	{
		Actor->CustomTimeDilation = M.TimeDilation;
	}
}

void UPrimordiaRealmGenerator::ClearRealm(ARealmRootActor* Root)
{
	if (!Root)
	{
		return;
	}
	UPrimordiaActorFactory* F = Factory.Get();
	for (TPair<FString, FPrimordiaLayerRuntime>& Pair : Root->RealmLayers)
	{
		DestroyLayer(Pair.Value);
	}
	Root->RealmLayers.Reset();

	for (TPair<FString, TObjectPtr<ASoulGlyphActor>>& Pair : Root->Glyphs)
	{
		if (IsValid(Pair.Value))
		{
			if (F) F->Release(Pair.Value);
			Pair.Value->Destroy();
		}
	}
	Root->Glyphs.Reset();

	if (IsValid(Root->Topology))
	{
		if (F) F->Release(Root->Topology);
		Root->Topology->Destroy();
	}
	Root->Topology = nullptr;
	Root->bHasTopology = false;
}
