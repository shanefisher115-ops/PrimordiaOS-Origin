#pragma once

#include "CoreMinimal.h"
#include "Actors/PrimordiaVisualActor.h"
#include "ShadowInversionActor.generated.h"

class UStaticMeshComponent;
class UPostProcessComponent;
class UMaterialInstanceDynamic;

/**
 * shadow_inversion -> negative space.
 *  Hull:  sphere rendered with reverse culling (inverted normals): only its
 *         inner faces draw, so it reads as a cavity cut into the world.
 *  Core:  invisible-in-main-pass sphere that writes CustomDepth stencil.
 *  Post:  unbound post-process whose material inverts scene colour where the
 *         stencil matches (one owner per world, so overlapping shadows don't
 *         invert twice).
 *
 * Hull material (M_PrimordiaShadowHull): Inversion, Depth, Threshold, Pulse, RetireAlpha.
 * Post material (PP_PrimordiaInversion): Inversion, Threshold, Pulse, StencilValue.
 * Requires r.CustomDepth=3 (set automatically) for stencil masking.
 */
UCLASS(Blueprintable)
class PRIMORDIAOSREALMBRIDGE_API AShadowInversionActor : public APrimordiaVisualActor
{
	GENERATED_BODY()

public:
	AShadowInversionActor();

	virtual void ApplyPayload(const TSharedPtr<FJsonObject>& Payload) override;
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Shadow") float Inversion = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Shadow") float Depth = 0.5f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Shadow") float Threshold = 0.5f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Shadow") float Pulse = 0.f;
	/** Entity this shadow mirrors (e.g. "heart"); informational, the pulse already arrives inverted. */
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Shadow") FString MirrorOf;

	/** Fractional swell of the cavity on the anti-beat. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Shadow")
	float PulseSwell = 0.08f;

protected:
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type Reason) override;
	virtual void OnConstruction(const FTransform& Transform) override;
	virtual void UpdateRetireFade(float Alpha) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Shadow") TObjectPtr<UStaticMeshComponent> Hull;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Shadow") TObjectPtr<UStaticMeshComponent> StencilCore;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Shadow") TObjectPtr<UPostProcessComponent> PostProcess;
	UPROPERTY(Transient) TObjectPtr<UMaterialInstanceDynamic> HullMID;
	UPROPERTY(Transient) TObjectPtr<UMaterialInstanceDynamic> PostMID;

private:
	void EnsureMaterials();
	bool ClaimPostProcess();

	FVector ExtentUnits = FVector(800.f);
	float SmoothedInversion = 0.f;
	float FadeAlpha = 1.f;
};
