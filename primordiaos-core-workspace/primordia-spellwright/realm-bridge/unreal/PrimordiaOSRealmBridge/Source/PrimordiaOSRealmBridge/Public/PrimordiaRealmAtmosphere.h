#pragma once

#include "CoreMinimal.h"
#include "PrimordiaTypes.h"

class UExponentialHeightFogComponent;
class UPostProcessComponent;

/**
 * The realm's atmosphere: what its metaphysics *mean*, made visible (docs/PRS-1.md §6.3, channel 4).
 * Evaluate() is a pure mapping, so the same metaphysics always look the same; Apply() writes it to
 * the realm root's fog and post-process components. Both are cheap: the fog is one full-screen pass
 * and the grade rides on the tonemapper that runs anyway, so there is no per-frame CPU cost beyond
 * setting a few values while a transition eases.
 */
struct PRIMORDIAOSREALMBRIDGE_API FPrimordiaAtmosphereLook
{
	// Fog
	float FogDensity = 0.02f;
	float FogHeightFalloff = 0.2f;
	float FogMaxOpacity = 1.f;
	FLinearColor FogColor = FLinearColor::White;
	// Grade
	float ExposureBias = 0.f;
	float BloomIntensity = 0.675f;
	float Saturation = 1.f;
	float Contrast = 1.f;
	FLinearColor Gain = FLinearColor::White;
	FLinearColor ShadowGain = FLinearColor::White;
	float Vignette = 0.4f;
	float FilmGrain = 0.f;
	float Fringe = 0.f;
};

namespace PrimordiaAtmosphere
{
	/**
	 * entropy    -> haze and grain: thicker fog, film grain, chromatic fringe, a little contrast
	 * luminosity -> light: exposure bias, bloom, brighter fog
	 * coherence  -> order: saturation, a crisp low-lying fog layer
	 * inversion  -> shadow: vignette, contrast, shadows tinted toward the complement of essence, darker fog
	 * lucidity   -> clarity: thins fog and grain, strengthens the essence tint
	 * essence    -> the realm's hue in fog and highlights
	 */
	PRIMORDIAOSREALMBRIDGE_API FPrimordiaAtmosphereLook Evaluate(const FPrimordiaMetaphysics& M);

	/**
	 * Writes the look; either component may be null. GradeWeight 0..1 scales the post-process blend.
	 * FogCutoff (cm): no fog beyond it, so the sky stays visible; the realm root passes 5 x its bounds.
	 */
	PRIMORDIAOSREALMBRIDGE_API void Apply(const FPrimordiaAtmosphereLook& Look, UExponentialHeightFogComponent* Fog, UPostProcessComponent* Grade, float GradeWeight, float FogCutoff);
}
