// Binds Onyx to Unreal's frame: OnBeginFrame -> FOnyx::BeginFrame, OnEndFrame -> EndFrame
// with fresh GPU statistics, OnEndFrameRT -> resolve render-graph timestamps. Also owns the
// on-screen inspector overlay (console: Onyx.Show 1).
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/EngineSubsystem.h"
#include "Onyx.h"
#include "OnyxSubsystem.generated.h"

class UCanvas;
class APlayerController;

USTRUCT(BlueprintType)
struct ONYXRUNTIME_API FOnyxSummary
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Onyx") int64 Tick = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Onyx") float Fps = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "Onyx") float FrameGpuMs = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "Onyx") float RealmTickGpuMs = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "Onyx") float RenderGpuMs = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "Onyx") float BudgetMs = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "Onyx") float Headroom = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "Onyx") float MemoryPressure = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "Onyx") int32 ActorCount = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Onyx") float ActorGpuUsMean = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "Onyx") FString Device;
	/** pipeline id -> GPU ms */
	UPROPERTY(BlueprintReadOnly, Category = "Onyx") TMap<FString, float> PipelineMs;
};

UCLASS()
class ONYXRUNTIME_API UOnyxSubsystem : public UEngineSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Onyx")
	FOnyxSummary GetSummary() const;

	/** Shows or hides the on-screen inspector (same as the console command Onyx.Show). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Onyx")
	void SetOverlayVisible(bool bVisible);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Onyx")
	bool IsOverlayVisible() const { return bOverlay; }

	static FOnyxSummary Summarize(const FOnyxFrame& Frame);

private:
	void HandleBeginFrame();
	void HandleEndFrame();
	void DrawOverlay(UCanvas* Canvas, APlayerController* Controller);

	FDelegateHandle BeginFrameHandle;
	FDelegateHandle EndFrameHandle;
	FDelegateHandle EndFrameRTHandle;
	FDelegateHandle DrawHandle;
	bool bOverlay = false;
};
