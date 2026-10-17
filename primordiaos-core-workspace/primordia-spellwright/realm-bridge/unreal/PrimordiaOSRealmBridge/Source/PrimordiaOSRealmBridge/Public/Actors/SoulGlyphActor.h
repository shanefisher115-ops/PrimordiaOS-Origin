#pragma once

#include "CoreMinimal.h"
#include "Actors/PrimordiaVisualActor.h"
#include "PrimordiaTypes.h"
#include "SoulGlyphActor.generated.h"

class UStaticMeshComponent;
class UInstancedStaticMeshComponent;
class UMaterialInstanceDynamic;

/**
 * soul_unification -> the central metaphysical glyph, plus orbiting essence
 * fragments that merge into it as unity rises. Also used by the realm
 * generator for static manifest glyphs (sigils, wards, gates).
 *
 * Glyph material (M_PrimordiaSoulGlyph): Symmetry, Complexity, Hue, Unity,
 * Spin (radians, accumulated here so speed changes never jump), GlyphKind
 * (0 soul, 1 sigil, 2 ward, 3 gate), RetireAlpha.
 * Fragment material reads PerInstanceCustomData 0..2 = essence RGB.
 */
UCLASS(Blueprintable)
class PRIMORDIAOSREALMBRIDGE_API ASoulGlyphActor : public APrimordiaVisualActor
{
	GENERATED_BODY()

public:
	ASoulGlyphActor();

	virtual void ApplyPayload(const TSharedPtr<FJsonObject>& Payload) override;
	virtual void Tick(float DeltaSeconds) override;

	/** Static configuration from a PRS-1 manifest glyph. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Soul")
	void ApplyGlyphSpec(const FPrimordiaGlyphSpec& Spec);

	/** Turn the glyph plane toward the viewer every frame. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Soul")
	bool bFaceCamera = true;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "PrimordiaOS|Soul")
	float FragmentSize = 40.f;

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Soul") float Unity = 0.5f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Soul") int32 Symmetry = 6;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Soul") float Complexity = 0.5f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Soul") float RotationSpeed = 0.2f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Soul") float Hue = 0.6f;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Soul") float GlyphKind = 0.f;

protected:
	virtual void OnConstruction(const FTransform& Transform) override;
	virtual void UpdateRetireFade(float Alpha) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Soul") TObjectPtr<USceneComponent> GlyphPivot;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Soul") TObjectPtr<UStaticMeshComponent> GlyphPlane;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Soul") TObjectPtr<UInstancedStaticMeshComponent> Fragments;
	UPROPERTY(Transient) TObjectPtr<UMaterialInstanceDynamic> GlyphMID;

private:
	void EnsureMaterials();
	void FaceCamera();

	struct FFragment
	{
		FString Id;
		float Angle = 0.f;
		float Radius = 0.f;
		FLinearColor Essence = FLinearColor::White;
		FVector Current = FVector::ZeroVector;
	};
	TArray<FFragment> FragmentState;
	float Spin = 0.f;
	float GlyphDiameter = 600.f;
};
