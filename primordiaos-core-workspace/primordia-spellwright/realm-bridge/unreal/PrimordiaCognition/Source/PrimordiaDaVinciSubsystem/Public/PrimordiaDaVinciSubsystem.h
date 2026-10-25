#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleInterface.h"
#include "Subsystems/EngineSubsystem.h"
#include "DaVinciTypes.h"
#include "SpellwrightTypes.h"
#include "PrimordiaDaVinciSubsystem.generated.h"

PRIMORDIADAVINCISUBSYSTEM_API DECLARE_LOG_CATEGORY_EXTERN(LogDaVinci, Log, All);

class FJsonObject;

class FPrimordiaDaVinciSubsystemModule : public IModuleInterface
{
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnDaVinciJobFinished, const FDaVinciJob&, Job, bool, bSucceeded, const FString&, ResultJson);

using FDaVinciJobCallback = TFunction<void(bool, TSharedPtr<FJsonObject>, const FString&)>;

/**
 * Editorial through DaVinci Resolve. Resolve's scripting API is Python/Lua only, so jobs travel
 * through Bolt to pipeline/workers/resolve_worker.py, which drives the running Resolve: create or
 * load the project, import media, lay the timeline, apply LUT/CDL, render.
 */
UCLASS()
class PRIMORDIADAVINCISUBSYSTEM_API UPrimordiaDaVinciSubsystem : public UEngineSubsystem
{
	GENERATED_BODY()

public:
	static UPrimordiaDaVinciSubsystem* Get();

	/**
	 * Timeline assembly: every movie file and every image sequence in a folder, in name order.
	 * Files named like shot_0001.png ... shot_0120.png become one clip "shot_%04d.png" (1..120).
	 */
	UFUNCTION(BlueprintCallable, Category = "Primordia|DaVinci")
	static TArray<FDaVinciClip> AssembleFromFolder(const FString& Folder);

	/** Sends a job to the pipeline. Kind is davinci.render / davinci.grade / davinci.assemble (the last stage). */
	FString SubmitJob(const FDaVinciJob& Job, FDaVinciJobCallback OnDone = nullptr);

	UFUNCTION(BlueprintCallable, Category = "Primordia|DaVinci", meta = (DisplayName = "Submit DaVinci Job"))
	FString SubmitJobBP(const FDaVinciJob& Job) { return SubmitJob(Job); }

	/** Runs a davinci.* spell step. */
	FSpellwrightStepResult ExecuteStep(const FSpellwrightStep& Step, FSpellwrightStepCallback OnComplete);

	static TSharedRef<FJsonObject> JobToJson(const FDaVinciJob& Job);

	FString ResolveTargetDir(const FString& Requested) const;

	UPROPERTY(BlueprintAssignable, Category = "Primordia|DaVinci")
	FOnDaVinciJobFinished OnJobFinished;
};
