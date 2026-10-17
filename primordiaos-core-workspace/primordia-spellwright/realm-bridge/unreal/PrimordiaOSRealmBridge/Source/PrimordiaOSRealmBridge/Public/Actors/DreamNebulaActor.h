#pragma once

#include "CoreMinimal.h"
#include "Actors/PrimordiaVisualActor.h"
#include "DreamNebulaActor.generated.h"

class UStaticMeshComponent;
class UNiagaraComponent;
class UMaterialInstanceDynamic;

/**
 * dream_nebula -> raymarched volumetric cloud + optional Niagara motes that
 * write into Volumetric Fog.
 *
 * The bounding cube (100 uu) is scaled to `extent` (meters, full size). Its
 * material (M_PrimordiaDreamNebula, translucent, raymarched in a Custom node)
 * receives: Density, Turbulence, NoiseScale, DriftOffset (accumulated drift, cm),
 * ColorA, ColorB, Lucidity, ExtentUnits, RetireAlpha.
 * Niagara user params (NS_PrimordiaDreamMotes): Density, Extent, ColorA, ColorB, Turbulence.
 */
UCLASS(Blueprintable)
class PRIMORDIAOSREALMBRIDGE_API ADreamNebulaActor : public APrimordiaVisualActor
{
	GENERATED_BODY()

public:
	ADreamNebulaActor();

	virtual void ApplyPayload(const TSharedPtr<FJsonObject>& Payload) override;
	virtual void Tick(float DeltaSeconds) override;

	/** Rate (1/s) for density/colour easing; nebulae should feel slow. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Dream")
	float FieldSmoothing = 2.f;

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Dream") float Density = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Dream") float Turbulence = 0.5f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Dream") float NoiseScale = 0.05f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Dream") float Lucidity = 0.5f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Dream") FLinearColor ColorA = FLinearColor(0.6f, 0.3f, 1.f);
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Dream") FLinearColor ColorB = FLinearColor(0.2f, 0.1f, 0.4f);

protected:
	virtual void OnConstruction(const FTransform& Transform) override;
	virtual void UpdateRetireFade(float Alpha) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Dream") TObjectPtr<UStaticMeshComponent> Volume;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Dream") TObjectPtr<UNiagaraComponent> Motes;
	UPROPERTY(Transient) TObjectPtr<UMaterialInstanceDynamic> VolumeMID;

private:
	void EnsureMaterials();

	float TargetDensity = 0.f;
	FLinearColor TargetColorA = FLinearColor::White;
	FLinearColor TargetColorB = FLinearColor::Black;
	FVector Drift = FVector::ZeroVector;      // m/s
	FVector DriftOffset = FVector::ZeroVector; // cm, accumulated
	FVector ExtentUnits = FVector(3000.f);
};
