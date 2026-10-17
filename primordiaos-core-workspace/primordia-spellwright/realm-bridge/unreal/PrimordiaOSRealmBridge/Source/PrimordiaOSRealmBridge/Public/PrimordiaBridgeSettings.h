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
	/** Mesh per layer kind (ground, ocean, sky, ring, lattice, void, spire_field). */
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Realm") TMap<FName, TSoftObjectPtr<UStaticMesh>> LayerMeshes;
	UPROPERTY(Config, EditAnywhere, Category = "Assets|Realm") TMap<FName, TSoftObjectPtr<UMaterialInterface>> LayerMaterials;
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
