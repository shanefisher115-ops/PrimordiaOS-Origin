#include "PrimordiaRealmAtmosphere.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/PostProcessComponent.h"

namespace
{
	float Unit(float V) { return FMath::Clamp(V, 0.f, 1.f); }

	/** Essence normalized to its brightest channel, so it tints without changing brightness. */
	FLinearColor Hue(const FLinearColor& Essence)
	{
		const float Max = FMath::Max3(Essence.R, Essence.G, Essence.B);
		return Max > KINDA_SMALL_NUMBER ? FLinearColor(Essence.R / Max, Essence.G / Max, Essence.B / Max, 1.f) : FLinearColor::White;
	}
}

FPrimordiaAtmosphereLook PrimordiaAtmosphere::Evaluate(const FPrimordiaMetaphysics& M)
{
	const float Entropy = Unit(M.Entropy);
	const float Luminosity = Unit(M.Luminosity);
	const float Coherence = Unit(M.Coherence);
	const float Inversion = Unit(M.Inversion);
	const float Lucidity = Unit(M.Lucidity);
	const FLinearColor Tint = Hue(M.Essence);
	const FLinearColor Complement(1.f - 0.6f * Tint.R, 1.f - 0.6f * Tint.G, 1.f - 0.6f * Tint.B, 1.f);

	FPrimordiaAtmosphereLook L;
	const float Clarity = 1.2f - 0.6f * Lucidity; // lucid realms are clear
	L.FogDensity = (0.002f + 0.02f * Entropy + 0.02f * Inversion) * Clarity;
	L.FogHeightFalloff = 0.08f + 0.3f * Coherence; // ordered realms keep their haze low and layered
	L.FogMaxOpacity = 0.55f + 0.4f * Inversion;    // only a nightmare closes in completely
	// Ordered, untroubled realms get pale air; otherwise the haze carries the essence; inversion darkens it.
	const FLinearColor Air = FLinearColor(0.72f, 0.8f, 0.9f) * (0.2f + 0.6f * Luminosity);
	const FLinearColor Essential = Tint * (0.12f + 0.5f * Luminosity);
	L.FogColor = FMath::Lerp(FMath::Lerp(Essential, Air, 0.6f * Coherence * (1.f - Inversion)), FLinearColor(0.02f, 0.01f, 0.04f), 0.8f * Inversion);

	L.ExposureBias = 1.5f * (Luminosity - 0.5f);
	L.BloomIntensity = 0.3f + 1.5f * Luminosity;
	L.Saturation = FMath::Clamp(0.55f + 0.6f * Coherence - 0.25f * Inversion, 0.2f, 1.4f);
	L.Contrast = 1.f + 0.25f * Inversion + 0.1f * Entropy;
	L.Gain = FMath::Lerp(FLinearColor::White, Tint, 0.1f + 0.1f * Lucidity);
	L.ShadowGain = FMath::Lerp(FLinearColor::White, Complement, 0.35f * Inversion);
	L.Vignette = 0.25f + 0.6f * Inversion;
	// Grain and fringe are reserved for real disorder, so a default realm stays clean.
	L.FilmGrain = 0.5f * FMath::Max(0.f, Entropy - 0.3f) / 0.7f * Clarity;
	L.Fringe = 2.5f * FMath::Max(0.f, Entropy - 0.4f) / 0.6f;
	return L;
}

void PrimordiaAtmosphere::Apply(const FPrimordiaAtmosphereLook& L, UExponentialHeightFogComponent* Fog, UPostProcessComponent* Grade, float GradeWeight, float FogCutoff)
{
	if (Fog)
	{
		Fog->SetFogDensity(L.FogDensity);
		Fog->SetFogHeightFalloff(L.FogHeightFalloff);
		Fog->SetFogMaxOpacity(L.FogMaxOpacity);
		Fog->SetFogInscatteringColor(L.FogColor);
		// Past the realm, no fog: the sky dome and the far horizon stay visible.
		Fog->SetFogCutoffDistance(FogCutoff);
	}
	if (Grade)
	{
		FPostProcessSettings& S = Grade->Settings;
		S.bOverride_AutoExposureBias = true;    S.AutoExposureBias = L.ExposureBias;
		S.bOverride_BloomIntensity = true;      S.BloomIntensity = L.BloomIntensity;
		S.bOverride_ColorSaturation = true;     S.ColorSaturation = FVector4(1, 1, 1, L.Saturation);
		S.bOverride_ColorContrast = true;       S.ColorContrast = FVector4(1, 1, 1, L.Contrast);
		S.bOverride_ColorGain = true;           S.ColorGain = FVector4(L.Gain.R, L.Gain.G, L.Gain.B, 1);
		S.bOverride_ColorGainShadows = true;    S.ColorGainShadows = FVector4(L.ShadowGain.R, L.ShadowGain.G, L.ShadowGain.B, 1);
		S.bOverride_VignetteIntensity = true;   S.VignetteIntensity = L.Vignette;
		S.bOverride_FilmGrainIntensity = true;  S.FilmGrainIntensity = L.FilmGrain;
		S.bOverride_SceneFringeIntensity = true; S.SceneFringeIntensity = L.Fringe;
		Grade->BlendWeight = FMath::Clamp(GradeWeight, 0.f, 1.f);
	}
}
