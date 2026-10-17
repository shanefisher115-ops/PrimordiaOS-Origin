#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "PrimordiaTypes.h"
#include "PrimordiaVisualActor.generated.h"

class UMaterialInterface;
class UMaterialInstanceDynamic;
class UMeshComponent;
class UPrimordiaPayload;

/**
 * Base for all PrimordiaOS visualization actors.
 *  - ApplyPacket(): ordering guard, then ApplyPayload() (native fast path).
 *  - Location/scale targets are smoothed in Tick so 30 Hz data renders at frame rate.
 *  - Retire fades RetireAlpha 1 -> 0 over RetireFadeSeconds, then destroys.
 * Positions in payloads are realm-local; the factory attaches entities to the realm root.
 */
UCLASS(Abstract, Blueprintable)
class PRIMORDIAOSREALMBRIDGE_API APrimordiaVisualActor : public AActor
{
	GENERATED_BODY()

public:
	APrimordiaVisualActor();

	/** Native entry point used by the actor factory. */
	virtual void ApplyPacket(const FPrimordiaPacket& Packet);

	/** Subclasses parse their stream's payload here. */
	virtual void ApplyPayload(const TSharedPtr<FJsonObject>& Payload) {}

	/** Starts the retire fade (idempotent). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS")
	void BeginRetire();

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS")
	bool IsRetiring() const { return bRetiring; }

	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS")
	FString EntityId;

	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS")
	EPrimordiaPacketType PacketType = EPrimordiaPacketType::Unknown;

	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS")
	int64 LastSeq = -1;

	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS")
	double LastSimTime = 0.0;

	/** Exponential smoothing rate (1/s) for location and scale. 0 = snap. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS")
	float Smoothing = 12.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS", meta = (Units = "s"))
	float RetireFadeSeconds = 1.5f;

	/** Also raise OnPrimordiaPayload with a UPrimordiaPayload (allocates per packet). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS")
	bool bExposePayloadToBlueprint = false;

	/** 1 while alive, fades to 0 during retirement; fed to materials as "RetireAlpha". */
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS")
	float RetireAlpha = 1.f;

	/** Raised after every applied packet when bExposePayloadToBlueprint is set. */
	UFUNCTION(BlueprintImplementableEvent, Category = "PrimordiaOS")
	void OnPrimordiaPayload(const FPrimordiaPacketInfo& Info, UPrimordiaPayload* Payload);

	UFUNCTION(BlueprintImplementableEvent, Category = "PrimordiaOS")
	void OnPrimordiaRetire();

	virtual void Tick(float DeltaSeconds) override;
	/** Live preview in editor viewports when the bridge runs in the editor world. */
	virtual bool ShouldTickIfViewportsOnly() const override { return true; }

protected:
	/** Called every tick with the current RetireAlpha so subclasses can fade materials. */
	virtual void UpdateRetireFade(float Alpha) {}

	void SetTargetLocation(const FVector& RelativeLocation, bool bSnap = false);
	void SetTargetScale(const FVector& Scale, bool bSnap = false);

	/** Creates a MID on Mesh slot 0 from Material (or the basic-shape fallback). */
	UMaterialInstanceDynamic* MakeMID(UMeshComponent* Mesh, UMaterialInterface* Material);

	float UnitsPerMeter() const;
	FVector Meters(const FVector& M) const { return M * UnitsPerMeter(); }

	static float ExpAlpha(float Rate, float DeltaSeconds) { return Rate <= 0.f ? 1.f : 1.f - FMath::Exp(-Rate * DeltaSeconds); }

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS")
	TObjectPtr<USceneComponent> SceneRoot;

	bool bHasReceivedPacket = false;
	bool bRetiring = false;
	float RetireElapsed = 0.f;

private:
	FVector TargetLocation = FVector::ZeroVector;
	FVector TargetScale = FVector::OneVector;
	bool bHasTargetLocation = false;
	bool bHasTargetScale = false;
};
