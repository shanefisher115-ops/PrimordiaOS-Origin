#include "PrimordiaRealmGenerator.h"
#include "PrimordiaActorFactory.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaTopology.h"
#include "Actors/CosmicWebActor.h"
#include "Actors/RealmRootActor.h"
#include "Actors/SoulGlyphActor.h"
#include "Algo/BinarySearch.h"
#include "Components/HierarchicalInstancedStaticMeshComponent.h"
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

	// PRS-1 §4.3: the engine shape each layer kind uses as its base (scatter shapes are per tier,
	// see PrimordiaRealmComposition.cpp).
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

	/** Palette, density and every numeric param, exposed by name (MATERIALS_AND_NIAGARA.md §7). */
	UMaterialInstanceDynamic* MakeLayerMID(ARealmRootActor* Root, UMaterialInterface* Material, const FPrimordiaRealmLayer& Layer)
	{
		UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(Material, Root);
		MID->SetVectorParameterValue(TEXT("Color"), PaletteColor(Layer, 0, FLinearColor::Gray));
		MID->SetVectorParameterValue(TEXT("SecondaryColor"), PaletteColor(Layer, 1, FLinearColor::Black));
		MID->SetScalarParameterValue(TEXT("Density"), Layer.Density);
		MID->SetScalarParameterValue(TEXT("Radius"), Layer.Radius);
		for (const TPair<FString, float>& Param : Layer.Params)
		{
			MID->SetScalarParameterValue(FName(*Param.Key), Param.Value);
		}
		return MID;
	}

	/** Maps Mesh into the 100 cm box centred on the origin (the engine shapes' box). */
	FMatrix FitMatrix(const UStaticMesh* Mesh, EPrimordiaMeshFit Fit, int32 QuarterTurns)
	{
		if (!Mesh || Fit == EPrimordiaMeshFit::None)
		{
			return FMatrix::Identity;
		}
		const FMatrix Turn = FRotationMatrix(FRotator(0.f, 90.f * (QuarterTurns & 3), 0.f));
		const FBox Box = Mesh->GetBoundingBox().TransformBy(Turn);
		const FVector Size = Box.GetSize().ComponentMax(FVector(KINDA_SMALL_NUMBER));
		const FVector Scale = Fit == EPrimordiaMeshFit::Stretch ? FVector(100.0) / Size : FVector(100.0 / Size.GetMax());
		return Turn * FScaleMatrix(Scale) * FTranslationMatrix(-Box.GetCenter() * Scale);
	}

	template <typename F>
	void ForEachMID(FPrimordiaLayerRuntime& Runtime, F&& Fn)
	{
		if (Runtime.MID)
		{
			Fn(Runtime.MID.Get());
		}
		for (FPrimordiaTierRuntime& Tier : Runtime.Tiers)
		{
			if (Tier.MID)
			{
				Fn(Tier.MID.Get());
			}
		}
	}

	const FPrimordiaTierArt* TierArtFor(const FPrimordiaLayerArt* Art, EPrimordiaTier Tier)
	{
		if (!Art) return nullptr;
		switch (Tier)
		{
		case EPrimordiaTier::Fixed: return &Art->Fixed;
		case EPrimordiaTier::Hero: return &Art->Hero;
		default: return &Art->Detail;
		}
	}

	/** The ground this layer stands on, if any. Several candidates: the lowest layer id wins (deterministic). */
	const FPrimordiaGroundSurface* FindGround(const ARealmRootActor* Root, const FPrimordiaRealmLayer& Layer)
	{
		const FPrimordiaGroundSurface* Best = nullptr;
		const FString* BestId = nullptr;
		for (const TPair<FString, FPrimordiaLayerRuntime>& Pair : Root->RealmLayers)
		{
			if (Pair.Key != Layer.Id && PrimordiaComposition::StandsOnGround(Layer, Pair.Value.Surface) && (!BestId || Pair.Key < *BestId))
			{
				Best = &Pair.Value.Surface;
				BestId = &Pair.Key;
			}
		}
		return Best;
	}

	/**
	 * Makes each variant component hold exactly the candidates of the first Shown, in order.
	 * Shown only ever moves the tail, so this adds or removes instances at the end and never
	 * touches the rest (PRS-1 §4.3).
	 */
	void ShowPrefix(FPrimordiaTierRuntime& Tier, int32 Shown)
	{
		if (Shown == Tier.ShownCount)
		{
			return;
		}
		const FPrimordiaTierCandidates& C = Tier.Candidates;
		for (int32 v = 0; v < Tier.Variants.Num(); ++v)
		{
			UInstancedStaticMeshComponent* ISM = Tier.Variants[v];
			if (!ISM)
			{
				continue;
			}
			const TArray<int32>& Indices = Tier.VariantCandidates[v];
			const int32 Target = Algo::LowerBound(Indices, Shown);
			const int32 Current = ISM->GetInstanceCount();
			if (Target > Current)
			{
				TArray<FTransform> Added;
				Added.Reserve(Target - Current);
				const FMatrix* Fit = Tier.VariantFit.IsValidIndex(v) && !Tier.VariantFit[v].Equals(FMatrix::Identity) ? &Tier.VariantFit[v] : nullptr;
				for (int32 k = Current; k < Target; ++k)
				{
					const FTransform& T = C.Transforms[Indices[k]];
					// Fitted meshes: the fit is axis-aligned (90 degree turns), so the product has no shear.
					Added.Add(Fit ? FTransform(*Fit * T.ToMatrixWithScale()) : T);
				}
				ISM->AddInstances(Added, false, false, C.bCollide);
				for (int32 k = Current; k < Target; ++k)
				{
					const FVector4f& D = C.Data[Indices[k]];
					ISM->SetCustomData(k, MakeArrayView(&D.X, 4), false);
				}
				ISM->MarkRenderStateDirty();
			}
			else if (Target < Current)
			{
				TArray<int32> Removed;
				Removed.Reserve(Current - Target);
				for (int32 k = Current - 1; k >= Target; --k)
				{
					Removed.Add(k);
				}
				ISM->RemoveInstances(Removed, true);
			}
		}
		Tier.ShownCount = Shown;
	}
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

	// Layers: diff by id. Stale layers go first and grounds are settled before the layers
	// that stand on them, so every signature below sees the final ground surface.
	TSet<FString> KeepLayers;
	for (const FPrimordiaRealmLayer& Layer : M.Layers)
	{
		KeepLayers.Add(Layer.Id);
	}
	for (auto It = Root->RealmLayers.CreateIterator(); It; ++It)
	{
		if (!KeepLayers.Contains(It->Key))
		{
			DestroyLayer(It->Value);
			It.RemoveCurrent();
		}
	}
	for (const bool bGroundPass : { true, false })
	{
		for (const FPrimordiaRealmLayer& Layer : M.Layers)
		{
			if ((Layer.Kind == TEXT("ground")) != bGroundPass)
			{
				continue;
			}
			FPrimordiaLayerRuntime* Runtime = Root->RealmLayers.Find(Layer.Id);
			if (Runtime && Runtime->Signature == LayerSignature(Root, Layer))
			{
				ApplyDensity(*Runtime, Layer.Density);
				ForEachMID(*Runtime, [&Layer](UMaterialInstanceDynamic* MID) { MID->SetScalarParameterValue(TEXT("Density"), Layer.Density); });
			}
			else
			{
				SpawnLayer(Root, Layer, M.Seed);
			}
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
	const FPrimordiaLayerArt* Art = Settings->LayerArt.Find(Layer.Kind);
	FPrimordiaLayerRuntime Runtime;
	Runtime.Kind = Layer.Kind;
	Runtime.Signature = LayerSignature(Root, Layer);

	Runtime.Root = NewRealmComponent<USceneComponent>(Root, Root->RealmRoot, TEXT("Layer_") + Layer.Id);
	Runtime.Root->SetRelativeLocation(FVector(0, 0, Layer.Altitude));
	if (Layer.Kind == TEXT("ring"))
	{
		Runtime.Root->SetRelativeRotation(FRotator(0.f, 0.f, Layer.Param(TEXT("tilt_deg"), 0.f)));
	}

	// One MID per layer (tiers with their own material get their own, with the same parameters).
	UMaterialInterface* Material = nullptr;
	if (const TSoftObjectPtr<UMaterialInterface>* Override = Settings->LayerMaterials.Find(Layer.Kind))
	{
		Material = Override->LoadSynchronous();
	}
	if (!Material)
	{
		Material = LoadObject<UMaterialInterface>(nullptr, PrimordiaAssets::BasicMaterial);
	}
	Runtime.MID = MakeLayerMID(Root, Material, Layer);

	if (const TCHAR* BasePath = BaseMeshFor(Layer.Kind))
	{
		UStaticMesh* BaseMesh = Art ? Art->BaseMesh.LoadSynchronous() : nullptr;
		Runtime.Base = NewRealmComponent<UStaticMeshComponent>(Root, Runtime.Root, TEXT("Base_") + Layer.Id);
		Runtime.Base->SetStaticMesh(BaseMesh ? BaseMesh : LoadObject<UStaticMesh>(nullptr, BasePath));
		for (int32 Slot = 0; Slot < FMath::Max(1, Runtime.Base->GetNumMaterials()); ++Slot)
		{
			Runtime.Base->SetMaterial(Slot, Runtime.MID);
		}
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

	// Tiers (PRS-1 §4.3): one instanced component per tier and mesh variant.
	UStaticMesh* LegacyMesh = nullptr;
	if (const TSoftObjectPtr<UStaticMesh>* Override = Settings->LayerMeshes.Find(Layer.Kind))
	{
		LegacyMesh = Override->LoadSynchronous();
	}
	FPrimordiaLayerComposition Composition = PrimordiaComposition::Compose(Layer, static_cast<uint32>(RealmSeed), MaxScatterPerLayer, FindGround(Root, Layer));
	Runtime.Surface = MoveTemp(Composition.Surface);
	for (FPrimordiaTierCandidates& Candidates : Composition.Tiers)
	{
		if (Candidates.Tier == EPrimordiaTier::Detail && !Settings->bEnableDetailTiers)
		{
			continue;
		}
		const FPrimordiaTierArt* TierArt = TierArtFor(Art, Candidates.Tier);
		TArray<UStaticMesh*> Meshes;
		if (TierArt)
		{
			for (const TSoftObjectPtr<UStaticMesh>& Soft : TierArt->Meshes)
			{
				UStaticMesh* Mesh = Meshes.Num() < 3 ? Soft.LoadSynchronous() : nullptr;
				if (Mesh)
				{
					Meshes.Add(Mesh);
				}
			}
		}
		if (Meshes.IsEmpty() && Candidates.bPrimary && LegacyMesh)
		{
			Meshes.Add(LegacyMesh);
		}
		if (Meshes.IsEmpty())
		{
			if (UStaticMesh* Fallback = LoadObject<UStaticMesh>(nullptr, Candidates.FallbackMesh))
			{
				Meshes.Add(Fallback);
			}
		}
		if (Meshes.IsEmpty())
		{
			continue;
		}

		FPrimordiaTierRuntime& Tier = Runtime.Tiers.AddDefaulted_GetRef();
		UMaterialInstanceDynamic* TierMID = Runtime.MID;
		if (UMaterialInterface* TierMaterial = TierArt ? TierArt->Material.LoadSynchronous() : nullptr)
		{
			Tier.MID = MakeLayerMID(Root, TierMaterial, Layer);
			TierMID = Tier.MID;
		}
		bool bShadow = Candidates.bCastShadow;
		float Cull = Candidates.CullDistance;
		if (TierArt)
		{
			if (TierArt->Shadow != EPrimordiaTierShadow::Default)
			{
				bShadow = TierArt->Shadow == EPrimordiaTierShadow::On;
			}
			if (TierArt->CullDistance != 0.f)
			{
				Cull = FMath::Max(0.f, TierArt->CullDistance);
			}
		}
		const bool bHierarchical = Candidates.Tier == EPrimordiaTier::Detail && Settings->bHierarchicalDetailTiers;

		// Variants are dealt by the candidate's stable random, so they never depend on order or density.
		Tier.VariantCandidates.SetNum(Meshes.Num());
		for (int32 i = 0; i < Candidates.Num(); ++i)
		{
			const int32 V = FMath::Min(FMath::FloorToInt(Candidates.Data[i].X * Meshes.Num()), Meshes.Num() - 1);
			Tier.VariantCandidates[V].Add(i);
		}
		const bool bOwnMaterials = TierArt && TierArt->bUseMeshMaterials && TierArt->Meshes.Num() > 0;
		for (int32 v = 0; v < Meshes.Num(); ++v)
		{
			const FString Name = FString::Printf(TEXT("%s_%s_%d"), Candidates.Name, *Layer.Id, v);
			UInstancedStaticMeshComponent* ISM = bHierarchical
				? NewRealmComponent<UHierarchicalInstancedStaticMeshComponent>(Root, Runtime.Root, Name)
				: NewRealmComponent<UInstancedStaticMeshComponent>(Root, Runtime.Root, Name);
			ISM->SetStaticMesh(Meshes[v]);
			Tier.VariantFit.Add(TierArt ? FitMatrix(Meshes[v], TierArt->Fit, TierArt->QuarterTurns) : FMatrix::Identity);
			for (int32 Slot = 0; !bOwnMaterials && Slot < FMath::Max(1, ISM->GetNumMaterials()); ++Slot)
			{
				ISM->SetMaterial(Slot, TierMID);
			}
			ISM->SetNumCustomDataFloats(4);
			ISM->SetCastShadow(bShadow);
			if (Candidates.bCollide)
			{
				ISM->SetCollisionProfileName(UCollisionProfile::BlockAll_ProfileName);
			}
			else
			{
				ISM->SetCollisionEnabled(ECollisionEnabled::NoCollision);
			}
			if (Cull > 0.f)
			{
				ISM->SetCullDistances(FMath::RoundToInt(0.7f * Cull), FMath::RoundToInt(Cull));
			}
			Tier.Variants.Add(ISM);
		}
		Tier.Candidates = MoveTemp(Candidates);
	}
	ApplyDensity(Runtime, Layer.Density);

	USceneComponent* LayerRoot = Runtime.Root;
	Root->RealmLayers.Add(Layer.Id, MoveTemp(Runtime));
	return LayerRoot;
}

uint32 UPrimordiaRealmGenerator::LayerSignature(const ARealmRootActor* Root, const FPrimordiaRealmLayer& Layer) const
{
	const uint32 Hash = Layer.StructuralHash();
	const FPrimordiaGroundSurface* Ground = Root ? FindGround(Root, Layer) : nullptr;
	return Ground ? HashCombine(Hash, Ground->Hash) : Hash;
}

void UPrimordiaRealmGenerator::ApplyDensity(FPrimordiaLayerRuntime& Runtime, float Density) const
{
	const UPrimordiaBridgeSettings* Settings = UPrimordiaBridgeSettings::Get();
	const float LayerDensity = FMath::Clamp(Density, 0.f, 1.f);
	const float DetailScale = Settings->bEnableDetailTiers ? FMath::Clamp(Settings->DetailDensityScale, 0.f, 1.f) : 0.f;
	int32 HeroShown = 0;
	for (FPrimordiaTierRuntime& Tier : Runtime.Tiers)
	{
		const FPrimordiaTierCandidates& C = Tier.Candidates;
		int32 Shown = C.Num();
		if (C.IsGated())
		{
			// Follows the hero prefix (rubble with its monolith, a strut with both its nodes).
			Shown = Algo::LowerBound(C.Requires, HeroShown);
			if (C.Tier == EPrimordiaTier::Detail)
			{
				Shown = FMath::Min(Shown, FMath::RoundToInt(DetailScale * C.Num()));
			}
		}
		else if (C.Tier != EPrimordiaTier::Fixed)
		{
			const float Fraction = C.Tier == EPrimordiaTier::Detail ? LayerDensity * DetailScale : LayerDensity;
			Shown = FMath::RoundToInt(Fraction * C.Num());
		}
		if (C.Tier == EPrimordiaTier::Hero)
		{
			HeroShown = Shown;
		}
		ShowPrefix(Tier, Shown);
	}
}

void UPrimordiaRealmGenerator::DestroyLayer(FPrimordiaLayerRuntime& Runtime) const
{
	for (FPrimordiaTierRuntime& Tier : Runtime.Tiers)
	{
		for (UInstancedStaticMeshComponent* ISM : Tier.Variants)
		{
			if (ISM) ISM->DestroyComponent();
		}
	}
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
		ForEachMID(Pair.Value, [&M](UMaterialInstanceDynamic* MID)
		{
			MID->SetScalarParameterValue(TEXT("Entropy"), M.Entropy);
			MID->SetScalarParameterValue(TEXT("Luminosity"), M.Luminosity);
			MID->SetScalarParameterValue(TEXT("Coherence"), M.Coherence);
			MID->SetScalarParameterValue(TEXT("Inversion"), M.Inversion);
			MID->SetVectorParameterValue(TEXT("Essence"), M.Essence);
		});
	}

	// 2b. Atmosphere: the realm's fog and colour grade show what its state means.
	Root->ApplyAtmosphere(M);

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
