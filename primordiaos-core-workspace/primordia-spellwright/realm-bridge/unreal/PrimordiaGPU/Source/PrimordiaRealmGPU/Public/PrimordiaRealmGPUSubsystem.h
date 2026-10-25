// The PrimordiaOS realm-bridge binding of the GPU loop, inside Unreal:
//   1. PrimordiaOS generates the next realm      -> realm_manifest over PRS-1 (realm bridge)
//   2. MCP runs cognition + topology on the GPU  <- HandleManifest submits realm, glyphs, quality
//   3. Unreal renders it (crowd, aura extension)
//   4. Onyx captures GPU and realm metrics
//   5. PrimordiaOS adjusts the realm              <- Tick sends {"type":"telemetry"} to the bridge,
//                                                    whose tuner answers with thinner manifests
// Console: primordia.gpu.TelemetryHz (default 4), primordia.gpu.Crowd 0|1 (spawn the visualizer),
// primordia.Shot <png> [camera] (screenshot of the live realm).
//
// Live-realm look-dev renders: -PrimordiaShot=<png> waits until the bridge has delivered a realm,
// lets it settle for -PrimordiaShotDelay=<s> (default 20), views it through the camera actor
// named -PrimordiaShotCamera=<name> if one exists, writes the PNG, and with -PrimordiaShotQuit
// exits. Same loop as the static-scene renders (realm-lookdev skill), for runtime realms.
#pragma once

#include "CoreMinimal.h"
#include "PrimordiaTypes.h"
#include "Subsystems/WorldSubsystem.h"
#include "PrimordiaRealmGPUSubsystem.generated.h"

class ARealmRootActor;
class AMCPCrowdVisualizer;
class UMCPComputeSubsystem;
class UPrimordiaBridgeSubsystem;
struct FMCPRealmTick;
struct FMCPSigil;

UCLASS()
class PRIMORDIAREALMGPU_API UPrimordiaRealmGPUSubsystem : public UTickableWorldSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;
	virtual bool DoesSupportWorldType(const EWorldType::Type WorldType) const override;
	virtual void Tick(float DeltaTime) override;
	virtual TStatId GetStatId() const override;
	virtual bool IsTickableInEditor() const override { return true; }

	/** PRS-1 manifest (Unreal units) -> MCP realm tick (meters). */
	static FMCPRealmTick ToRealmTick(const FPrimordiaRealmManifest& Manifest, float UnitsPerMeter);
	/** PRS-1 glyphs (Unreal units, realm space) -> MCP sigils (meters). */
	static TArray<FMCPSigil> ToSigils(const FPrimordiaRealmManifest& Manifest, float UnitsPerMeter);
	/** The tuner's gpu_quality, carried in the manifest's source JSON (1 when absent). */
	static float GpuQuality(const FPrimordiaRealmManifest& Manifest);

	/** Writes a screenshot of the game viewport (optionally through a named camera actor). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|GPU")
	void TakeShot(const FString& Path, const FString& CameraName = TEXT(""));

	/** Sends the latest Onyx frame to PrimordiaOS now. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|GPU")
	bool SendTelemetry();

private:
	UFUNCTION()
	void HandleManifest(const FPrimordiaRealmManifest& Manifest, ARealmRootActor* Realm);

	TWeakObjectPtr<UPrimordiaBridgeSubsystem> Bridge;
	TWeakObjectPtr<UMCPComputeSubsystem> MCP;
	TWeakObjectPtr<AMCPCrowdVisualizer> Crowd;
	TWeakObjectPtr<ARealmRootActor> RealmRoot;
	void TickShot(float DeltaTime);
	bool ViewThroughCamera(const FString& CameraName);

	double SinceTelemetry = 0.0;
	bool bBound = false;

	// -PrimordiaShot automation
	FString ShotPath;
	FString ShotCamera;
	float ShotDelay = 20.f;
	float ShotWaited = 0.f;
	float ShotSinceRequest = -1.f;
	bool bShotQuit = false;
};
