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
 * Glyph material: Symmetry, Complexity, Hue, Unity, Spin (radians, accumulated
 * here so speed changes never jump), GlyphKind (0 soul, 1 sigil, 2 ward, 3 gate),
 * RetireAlpha. The volumetric material (bVolumetricGlyphs) also reads the
 * inscribed intent (SigilStrokes, SigilSeed, SigilPoints0..5) and the realm's
 * metaphysics (Entropy, Coherence, Inversion, Luminosity, Resonance, Lucidity, Essence).
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

	/** Re-inscribes the glyph from a new statement of intent (empty = the glyph's id). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Soul")
	void SetIntent(const FString& InIntent);

	/** The realm's current (eased) metaphysics, which colours and moves the volumetric glyph. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Soul")
	void SetMetaphysics(const FPrimordiaMetaphysics& InMetaphysics) { Metaphysics = InMetaphysics; }

	/** Turn the glyph toward the viewer every frame: the plane fully; in volume mode, sigils and gates about world up. */
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

	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Soul") FString Intent;
	/** The intent's surviving letters, in the order the monogram writes them. */
	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "PrimordiaOS|Soul") FString InscribedLetters;
	UPROPERTY(BlueprintReadOnly, Category = "PrimordiaOS|Soul") FPrimordiaMetaphysics Metaphysics;

protected:
	virtual void OnConstruction(const FTransform& Transform) override;
	virtual void UpdateRetireFade(float Alpha) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Soul") TObjectPtr<USceneComponent> GlyphPivot;
	/** A billboarded plane, or in volume mode the cube the glyph is raymarched inside. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Soul") TObjectPtr<UStaticMeshComponent> GlyphPlane;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "PrimordiaOS|Soul") TObjectPtr<UInstancedStaticMeshComponent> Fragments;
	UPROPERTY(Transient) TObjectPtr<UMaterialInstanceDynamic> GlyphMID;

private:
	void EnsureMaterials();
	/** Turns the pivot toward the viewer: fully (plane normal +Z) or about world up only (volume face +Y). */
	void FaceCamera(bool bYawOnly);
	void ApplyGlyphScale();
	void PushInscription();
	/** Creates the MID if needed and writes every material parameter. */
	void UpdateMaterial();

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
	bool bVolumetric = false;
	bool bInscribed = false;
	/** The live stream has inscribed this glyph; manifest revisions no longer override its intent. */
	bool bLiveIntent = false;
	/** Inscribed when the intent is empty: the manifest glyph id, else the entity id. */
	FString InscriptionFallback;
	TArray<FVector2D> SigilPoints;
	float SigilSeed = 0.f;
};
