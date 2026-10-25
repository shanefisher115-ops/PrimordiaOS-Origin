#pragma once

#include "CoreMinimal.h"
#include "Engine/DeveloperSettings.h"
#include "PrimordiaTypes.h"
#include "PrimordiaBridgeSettings.generated.h"

class UStaticMesh;
class UMaterialInterface;
class UNiagaraSystem;
class UMaterialParameterCollection;
class ARealmRootActor;

UENUM()
enum class EPrimordiaTierShadow : uint8
{
	/** Per-tier default (docs/MATERIALS_AND_NIAGARA.md §7). */
	Default,
	On,
	Off,
};

/** How a tier mesh is fitted to the tier's 100 cm box (the box the engine shape fills). */
UENUM()
enum class EPrimordiaMeshFit : uint8
{
	/** Use the mesh as authored (it should already fill a 100 cm box with its pivot at the centre). */
	None,
	/** Stretch each axis so the mesh's bounds fill the box: the tier's own sizes then shape it (slabs, spires). */
	Stretch,
	/** Scale uniformly so the longest side fills the box and centre it: keeps the mesh's proportions (rubble, props). */
	Uniform,
};

/** Art for one scatter tier of a layer kind (PRS-1 §4.3, MATERIALS_AND_NIAGARA.md §7). */
USTRUCT()
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaTierArt
{
	GENERATED_BODY()

	/**
	 * Mesh variants (up to 3). Instances are dealt to variants by their stable random, so a
	 * realm looks the same everywhere. Each variant is its own component: one more draw call.
	 * Empty = the engine basic shape for the tier.
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Tier")
	TArray<TSoftObjectPtr<UStaticMesh>> Meshes;

	/** Empty = the layer material (LayerMaterials, then BasicShapeMaterial). */
	UPROPERTY(Config, EditAnywhere, Category = "Tier")
	TSoftObjectPtr<UMaterialInterface> Material;

	/** Instances beyond this distance are culled (fade starts at 70 %). 0 = tier default; negative = never cull. */
	UPROPERTY(Config, EditAnywhere, Category = "Tier", meta = (Units = "cm"))
	float CullDistance = 0.f;

	UPROPERTY(Config, EditAnywhere, Category = "Tier")
	EPrimordiaTierShadow Shadow = EPrimordiaTierShadow::Default;

	/**
	 * Fit real-size meshes (scans, Fab assets) to the tier's box from their bounds, so they need no
	 * re-authoring. None = the mesh is already authored to the box.
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Tier")
	EPrimordiaMeshFit Fit = EPrimordiaMeshFit::None;

	/** Turns the mesh about Z before fitting, in 90 degree steps (e.g. so a cliff's thin side is the slab's X). */
	UPROPERTY(Config, EditAnywhere, Category = "Tier", meta = (ClampMin = 0, ClampMax = 3))
	int32 QuarterTurns = 0;

	/** Keep each mesh's own materials (scanned textures) instead of the layer / tier material. */
	UPROPERTY(Config, EditAnywhere, Category = "Tier")
	bool bUseMeshMaterials = false;
};

/** Art for one layer kind: its base mesh and its three scatter tiers. */
USTRUCT()
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaLayerArt
{
	GENERATED_BODY()

	/** Ground/ocean disc or void shell. Empty = engine cylinder / sphere. */
	UPROPERTY(Config, EditAnywhere, Category = "Layer")
	TSoftObjectPtr<UStaticMesh> BaseMesh;

	/** Always shown: ground terraces, the void's core. */
	UPROPERTY(Config, EditAnywhere, Category = "Layer")
	FPrimordiaTierArt Fixed;

	/** Few, large, shown as a density prefix: monoliths, sea stacks, beacons, keystones, lattice nodes, spires. */
	UPROPERTY(Config, EditAnywhere, Category = "Layer")
	FPrimordiaTierArt Hero;

	/** Many, small: rubble, motes, stars, shards, struts, spire skirts, void debris. */
	UPROPERTY(Config, EditAnywhere, Category = "Layer")
	FPrimordiaTierArt Detail;
};

/**
 * Project Settings > Plugins > PrimordiaOS Realm Bridge.
 * Stored in Config/DefaultGame.ini under [/Script/PrimordiaOSRealmBridge.PrimordiaBridgeSettings].
 * Every asset slot is optional: empty slots fall back to engine basic shapes so the
 * bridge renders something recognisable before any art exists.
 */
UCLASS(Config = Game, DefaultConfig, meta = (DisplayName = "PrimordiaOS Realm Bridge"))
class PRIMORDIAOSREALMBRIDGE_API UPrimordiaBridgeSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	static const UPrimordiaBridgeSettings* Get() { return GetDefault<UPrimordiaBridgeSettings>(); }

	virtual FName GetCategoryName() const override { return TEXT("Plugins"); }

	/** Loads a soft reference, or the engine fallback asset at FallbackPath. */
	template <typename T>
	static T* LoadOr(const TSoftObjectPtr<T>& Ptr, const TCHAR* FallbackPath)
	{
		if (T* Loaded = Ptr.LoadSynchronous())
		{
			return Loaded;
		}
		return FallbackPath ? LoadObject<T>(nullptr, FallbackPath) : nullptr;
	}

	// --- Connection -------------------------------------------------------

	UPROPERTY(Config, EditAnywhere, Category = "Connection")
	// 127.0.0.1, not "localhost": the bridge binds IPv4 loopback only, and on Windows
	// "localhost" can resolve to ::1 first, which the bridge never answers.
	FString ServerUrl = TEXT("ws://127.0.0.1:7777");

	/** Connect automatically when a game / PIE world begins play. */
	UPROPERTY(Config, EditAnywhere, Category = "Connection")
	bool bAutoConnect = true;

	/** Create the bridge subsystem in editor (non-PIE) worlds so realms can be previewed live in the viewport. */
	UPROPERTY(Config, EditAnywhere, Category = "Connection")
	bool bRunInEditorWorld = false;

	UPROPERTY(Config, EditAnywhere, Category = "Connection", meta = (ClampMin = 0.1, Units = "s"))
	float ReconnectInitialDelay = 1.f;

	UPROPERTY(Config, EditAnywhere, Category = "Connection", meta = (ClampMin = 1, Units = "s"))
	float ReconnectMaxDelay = 15.f;

	/** Rate requested from the bridge via set_rate (the bridge clamps to 30-60 for its master loop). */
	UPROPERTY(Config, EditAnywhere, Category = "Connection", meta = (ClampMin = 1, ClampMax = 60))
	int32 RequestedRateHz = 60;

	/** Streams to subscribe to (empty = all). e.g. heart_beat, cosmic_web. */
	UPROPERTY(Config, EditAnywhere, Category = "Connection")
	TArray<FString> SubscribedStreams;

	// --- Runtime ------------------------------------------------------------

	/** Upper bound on inbound messages drained per frame; the remainder waits. */
	UPROPERTY(Config, EditAnywhere, Category = "Runtime", meta = (ClampMin = 16))
	int32 MaxMessagesPerFrame = 1024;

	/** Keep only the newest continuous packet per entity per frame. */
	UPROPERTY(Config, EditAnywhere, Category = "Runtime")
	bool bCoalesceContinuousStreams = true;

	/** Visual entities not refreshed for this long (while connected) are retired. 0 disables. */
	UPROPERTY(Config, EditAnywhere, Category = "Runtime", meta = (ClampMin = 0, Units = "s"))
	float EntityTimeoutSeconds = 5.f;

	/** PRS-1 lengths are meters; Unreal is centimeters. */
	UPROPERTY(Config, EditAnywhere, Category = "Runtime", meta = (ClampMin = 0.001))
	float UnitsPerMeter = 100.f;

	/** Spawn / update an ARealmRootActor whenever a realm_manifest packet arrives. */
	UPROPERTY(Config, EditAnywhere, Category = "Runtime")
	bool bAutoSpawnRealmFromManifest = true;

	/** Where the auto-spawned realm root is placed. */
	UPROPERTY(Config, EditAnywhere, Category = "Runtime")
	FTransform RealmSpawnTransform;

	UPROPERTY(Config, EditAnywhere, Category = "Runtime")
	bool bLogPackets = false;

	// --- Classes ------------------------------------------------------------

	/** Replace the native visualizer for a stream with a Blueprint subclass (or any actor implementing PrimordiaVisualizer). */
	UPROPERTY(Config, EditAnywhere, Category = "Classes")
	TMap<EPrimordiaPacketType, TSoftClassPtr<AActor>> ActorClassOverrides;

	UPROPERTY(Config, EditAnywhere, Category = "Classes")
	TSoftClassPtr<ARealmRootActor> RealmRootClass;

	// --- Assets (see docs/MATERIALS_AND_NIAGARA.md for the parameter contracts) ---

	UPROPERTY(Config, EditAnywhere, Category = "Assets|Heart") TSoftObjectPtr<UStaticMesh> HeartMesh;
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Heart") TSoftObjectPtr<UMaterialInterface> HeartMaterial;

	UPROPERTY(Config, EditAnywhere, Category = "Assets|CosmicWeb") TSoftObjectPtr<UStaticMesh> NodeMesh;
	UPROPERTY(Config, EditAnywhere, Category = "Assets|CosmicWeb") TSoftObjectPtr<UMaterialInterface> NodeMaterial;
	UPROPERTY(Config, EditAnywhere, Category = "Assets|CosmicWeb") TSoftObjectPtr<UStaticMesh> EdgeMesh;
	UPROPERTY(Config, EditAnywhere, Category = "Assets|CosmicWeb") TSoftObjectPtr<UMaterialInterface> EdgeMaterial;

	UPROPERTY(Config, EditAnywhere, Category = "Assets|FateWeave") TSoftObjectPtr<UNiagaraSystem> FateRibbonSystem;

	/**
	 * Render glyphs as raymarched volumes inside a cube (M_PrimordiaSigilVolume, shipped with the plugin)
	 * instead of a camera-facing plane. Turn off to use a flat GlyphMaterial on GlyphMesh.
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Soul") bool bVolumetricGlyphs = true;
	/** Plane mode only (bVolumetricGlyphs off). Volume mode always uses a cube. */
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Soul") TSoftObjectPtr<UStaticMesh> GlyphMesh;
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Soul") TSoftObjectPtr<UMaterialInterface> GlyphMaterial =
		TSoftObjectPtr<UMaterialInterface>(FSoftObjectPath(TEXT("/PrimordiaOSRealmBridge/Materials/M_PrimordiaSigilVolume.M_PrimordiaSigilVolume")));
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Soul") TSoftObjectPtr<UMaterialInterface> FragmentMaterial;

	UPROPERTY(Config, EditAnywhere, Category = "Assets|Dream") TSoftObjectPtr<UStaticMesh> NebulaMesh;
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Dream") TSoftObjectPtr<UMaterialInterface> NebulaMaterial;
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Dream") TSoftObjectPtr<UNiagaraSystem> NebulaParticleSystem;

	UPROPERTY(Config, EditAnywhere, Category = "Assets|Shadow") TSoftObjectPtr<UStaticMesh> ShadowMesh;
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Shadow") TSoftObjectPtr<UMaterialInterface> ShadowMaterial;
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Shadow") TSoftObjectPtr<UMaterialInterface> ShadowPostProcessMaterial;
	/** Custom-depth stencil value the inversion post-process masks on. */
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Shadow", meta = (ClampMin = 1, ClampMax = 255)) int32 ShadowStencilValue = 200;

	UPROPERTY(Config, EditAnywhere, Category = "Assets|Realm") TSoftObjectPtr<UMaterialParameterCollection> MetaphysicsCollection;
	/**
	 * Base mesh and per-tier art per layer kind (ground, ocean, sky, ring, lattice, void, spire_field).
	 * Empty slots fall back to LayerMeshes (primary tier only), then to engine basic shapes.
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Realm") TMap<FName, FPrimordiaLayerArt> LayerArt;
	/** Legacy: mesh for the primary scatter tier of a layer kind. LayerArt wins when it sets one. */
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Realm") TMap<FName, TSoftObjectPtr<UStaticMesh>> LayerMeshes;
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Realm") TMap<FName, TSoftObjectPtr<UMaterialInterface>> LayerMaterials;

	// --- Realm detail (cost knobs; applied on the next density change or Regenerate) ---

	/** Build the detail tier (rubble, motes, stars, shards, struts, skirts, debris). Off = about one draw call less per layer. */
	UPROPERTY(Config, EditAnywhere, Category = "Realm Detail")
	bool bEnableDetailTiers = true;

	/** Multiplies the detail tier's visible instance count (a prefix, so it never reshuffles). */
	UPROPERTY(Config, EditAnywhere, Category = "Realm Detail", meta = (ClampMin = 0, ClampMax = 1))
	float DetailDensityScale = 1.f;

	/** Detail tiers use HISM (per-cluster culling and LOD, needs mesh LODs to pay off) instead of ISM. */
	UPROPERTY(Config, EditAnywhere, Category = "Realm Detail")
	bool bHierarchicalDetailTiers = true;

	// --- Realm atmosphere (PRS-1 §6.3 channel 4; PrimordiaRealmAtmosphere.h) --------------------

	/** Realm haze from metaphysics. Stays off in levels that already have an Exponential Height Fog. */
	UPROPERTY(Config, EditAnywhere, Category = "Realm Atmosphere")
	bool bRealmFog = true;

	/** Colour grade from metaphysics (exposure, bloom, saturation, contrast, tint, vignette, grain, fringe). */
	UPROPERTY(Config, EditAnywhere, Category = "Realm Atmosphere")
	bool bRealmColorGrade = true;

	/** Blend weight of that grade. The level's own post-process volumes still win where they set a value. */
	UPROPERTY(Config, EditAnywhere, Category = "Realm Atmosphere", meta = (ClampMin = 0, ClampMax = 1))
	float RealmColorGradeStrength = 1.f;
};

namespace PrimordiaAssets
{
	inline const TCHAR* Sphere = TEXT("/Engine/BasicShapes/Sphere.Sphere");
	inline const TCHAR* Cube = TEXT("/Engine/BasicShapes/Cube.Cube");
	inline const TCHAR* Plane = TEXT("/Engine/BasicShapes/Plane.Plane");
	inline const TCHAR* Cylinder = TEXT("/Engine/BasicShapes/Cylinder.Cylinder");
	inline const TCHAR* Cone = TEXT("/Engine/BasicShapes/Cone.Cone");
	/** Has a "Color" vector parameter; every visualizer also sets it so fallbacks are tinted. */
	inline const TCHAR* BasicMaterial = TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial");
}
