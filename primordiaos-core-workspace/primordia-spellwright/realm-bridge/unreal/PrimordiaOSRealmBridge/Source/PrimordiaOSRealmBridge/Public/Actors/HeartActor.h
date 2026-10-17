#pragma once

#include "CoreMinimal.h"
#include "Actors/PrimordiaVisualActor.h"
#include "HeartActor.generated.h"

class UStaticMeshComponent;
class UPointLightComponent;
class UMaterialInstanceDynamic;

/**
 * heart_beat -> pulsing emissive core.
 * The pulse is dead-reckoned locally from bpm and phase-corrected toward each
 * packet, so the beat stays smooth even at 30 Hz or with dropped packets.
 *
 * Material parameters (M_PrimordiaHeart): Pulse, Intensity, Coherence,
 * EssenceColor, RetireAlpha, Color (fallback tint).
 */
UCLASS(Blueprintable)
class PRIMORDIAOSREALMBRIDGE_API AHeartActor : public APrimordiaVisualActor
{
	GENERATED_BODY()

public:
	AHeartActor();

	virtual void ApplyPayload(const TSharedPtr<FJsonObject>& Payload) override;
	virtual void Tick(float DeltaSeconds) override;

	/** The lub-dub envelope shared with node-bridge/src/modules/heart.js. */
	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Heart")
	static float PulseEnvelope(float Phase);

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Heart")
	float EmissiveBase = 8.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Heart")
	float EmissivePulseGain = 40.f;

	/** Fractional scale swell at full pulse. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Heart")
	float SwellAmount = 0.12f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Heart")
	float LightIntensityBase = 2000.f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Heart")
	float LightIntensityPulse = 30000.f;

	/** Rate (1/s) at which local phase is pulled toward server phase. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Heart")
	float PhaseCorrection = 6.f;

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Heart") float Bpm = 72.f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Heart") float Phase = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Heart") float Amplitude = 1.f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Heart") float Coherence = 1.f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Heart") float Pulse = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Heart") FLinearColor Essence = FLinearColor(1.f, 0.4f, 0.3f);

protected:
	virtual void BeginPlay() override;
	virtual void OnConstruction(const FTransform& Transform) override;
	virtual void UpdateRetireFade(float Alpha) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Heart") TObjectPtr<UStaticMeshComponent> Core;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Heart") TObjectPtr<UPointLightComponent> Glow;
	UPROPERTY(Transient) TObjectPtr<UMaterialInstanceDynamic> CoreMID;

private:
	void EnsureMaterials();
	float ServerPhase = 0.f;
	float BaseDiameterUnits = 250.f;
};
