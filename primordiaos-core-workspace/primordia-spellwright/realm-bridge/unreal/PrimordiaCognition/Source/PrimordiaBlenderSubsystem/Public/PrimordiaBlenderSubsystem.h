#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleInterface.h"
#include "Subsystems/EngineSubsystem.h"
#include "BlenderTypes.h"
#include "SpellwrightTypes.h"
#include "PrimordiaBlenderSubsystem.generated.h"

PRIMORDIABLENDERSUBSYSTEM_API DECLARE_LOG_CATEGORY_EXTERN(LogPrimordiaBlender, Log, All);

class AActor;
class FBlenderRpcClient;
class FJsonObject;
class UWorld;

class FPrimordiaBlenderSubsystemModule : public IModuleInterface
{
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(FOnBlenderJobFinished, const FString&, TrackingId, const FBlenderJob&, Job, bool, bSucceeded, const FString&, ResultJson);

/** Completion of a Blender job: success, the worker's result object, an error message. */
using FBlenderJobCallback = TFunction<void(bool, TSharedPtr<FJsonObject>, const FString&)>;

/**
 * Drives Blender: render, animate, import/export geometry, and send Unreal meshes across.
 *
 * Jobs go through the Bolt pipeline (kind "blender.<task>") or straight to the JSON-RPC server that
 * pipeline/workers/blender_rpc_server.py runs inside Blender (settings: bUseBoltPipeline). Both reach
 * the same Blender session, so an animate job followed by a render job renders the animation.
 */
UCLASS()
class PRIMORDIABLENDERSUBSYSTEM_API UPrimordiaBlenderSubsystem : public UEngineSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	static UPrimordiaBlenderSubsystem* Get();

	/** Runs a job. Returns a tracking id (the Bolt job id, or "rpc-<guid>" for direct calls). */
	FString RunJob(const FBlenderJob& Job, FBlenderJobCallback OnDone = nullptr);

	UFUNCTION(BlueprintCallable, Category = "Primordia|Blender", meta = (DisplayName = "Run Blender Job"))
	FString RunJobBP(const FBlenderJob& Job) { return RunJob(Job); }

	/** Asks the Blender RPC server (directly) whether it is up. */
	void Ping(TFunction<void(bool, const FString&)> Callback);

	/** Runs a blender.* spell step. World is needed for blender.mesh (it reads tagged actors). */
	FSpellwrightStepResult ExecuteStep(const FSpellwrightStep& Step, UWorld* World, FSpellwrightStepCallback OnComplete);

	/**
	 * Merges the static meshes of the given actors (LOD 0, world transforms) into one mesh in Blender
	 * space: metres, Y mirrored (Unreal is left-handed), triangle winding flipped to match.
	 */
	static bool CollectMesh(const TArray<AActor*>& Actors, const FString& Name, FBlenderMeshData& OutMesh, FString& OutError);

	/** Writes the mesh as Wavefront OBJ (Blender axes, so import it with forward -Y, up Z). */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Blender")
	static bool WriteObj(const FBlenderMeshData& Mesh, const FString& Path);

	/** Editor only: imports a file Blender wrote (glb/fbx/obj) under ImportContentPath. Returns asset paths. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Blender")
	TArray<FString> ImportIntoProject(const FString& FilePath);

	/** Fills an "auto" or empty output path for a job. */
	FString ResolveOutput(const FBlenderJob& Job) const;

	/** The RPC method and params a job becomes (also the Bolt payload). */
	static void JobToRpc(const FBlenderJob& Job, FString& OutMethod, TSharedRef<FJsonObject>& OutParams);

	UPROPERTY(BlueprintAssignable, Category = "Primordia|Blender")
	FOnBlenderJobFinished OnJobFinished;

private:
	TSharedPtr<FBlenderRpcClient> Rpc;
};
