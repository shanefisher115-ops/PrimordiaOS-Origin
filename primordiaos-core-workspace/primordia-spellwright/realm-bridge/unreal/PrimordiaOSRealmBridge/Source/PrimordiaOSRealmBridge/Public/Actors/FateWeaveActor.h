#pragma once

#include "CoreMinimal.h"
#include "Actors/PrimordiaVisualActor.h"
#include "FateWeaveActor.generated.h"

class UNiagaraComponent;

/**
 * fate_weave -> Niagara ribbons.
 *
 * Threads are resampled (Catmull-Rom) to PointsPerThread and written into
 * fixed slots so a thread keeps its ribbon for life. User parameters on
 * NS_PrimordiaFateWeave (see docs/MATERIALS_AND_NIAGARA.md §3):
 *
 *   User.ThreadPoints     Niagara Position Array  [Slot * PointsPerThread + k] (local space, cm)
 *   User.ThreadColors     Niagara Color Array     [Slot]
 *   User.ThreadParams     Niagara Vector4 Array   [Slot] = (tension, width cm, alpha, fate 0/1/2)
 *   User.ThreadSlots      int  (MaxThreads)
 *   User.PointsPerThread  int
 *   User.LoomSpeed        float
 *   User.WeaveDensity     float
 */
UCLASS(Blueprintable)
class PRIMORDIAOSREALMBRIDGE_API AFateWeaveActor : public APrimordiaVisualActor
{
	GENERATED_BODY()

public:
	AFateWeaveActor();

	virtual void ApplyPayload(const TSharedPtr<FJsonObject>& Payload) override;
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|FateWeave", meta = (ClampMin = 2, ClampMax = 128))
	int32 PointsPerThread = 32;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|FateWeave", meta = (ClampMin = 1, ClampMax = 64))
	int32 MaxThreads = 16;

	/** Seconds a severed thread takes to fade after the server stops sending it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|FateWeave")
	float SeverFadeSeconds = 1.5f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|FateWeave")
	float PointSmoothing = 14.f;

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|FateWeave") float LoomSpeed = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|FateWeave") float WeaveDensity = 0.f;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|FateWeave")
	int32 GetLiveThreadCount() const;

protected:
	virtual void OnConstruction(const FTransform& Transform) override;
	virtual void UpdateRetireFade(float Alpha) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|FateWeave")
	TObjectPtr<UNiagaraComponent> Loom;

private:
	struct FThreadSlot
	{
		FString Id;
		bool bUsed = false;
		bool bSeenThisPacket = false;
		float Alpha = 0.f;         // current, smoothed
		float TargetAlpha = 0.f;
		float Tension = 1.f;
		float WidthUnits = 10.f;
		int32 Fate = 0;            // 0 bound, 1 frayed, 2 severed
		FLinearColor Color = FLinearColor::White;
		TArray<FVector> Target;    // resampled, PointsPerThread
		TArray<FVector> Current;
	};

	static void Resample(const TArray<FVector>& In, int32 Count, TArray<FVector>& Out);
	int32 FindOrAllocSlot(const FString& Id);
	void PushToNiagara();

	TArray<FThreadSlot> Slots;
	float RetireMultiplier = 1.f;
};
