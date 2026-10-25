#pragma once

#include "CoreMinimal.h"
#include "DataDrivenShaderPlatformInfo.h"
#include "GlobalShader.h"
#include "SceneTexturesConfig.h"
#include "SceneView.h"
#include "ShaderParameterStruct.h"

class FRealmAuraPS : public FGlobalShader
{
public:
	DECLARE_GLOBAL_SHADER(FRealmAuraPS);
	SHADER_USE_PARAMETER_STRUCT(FRealmAuraPS, FGlobalShader);

	BEGIN_SHADER_PARAMETER_STRUCT(FParameters, )
		SHADER_PARAMETER_STRUCT_REF(FViewUniformShaderParameters, View)
		SHADER_PARAMETER_STRUCT_INCLUDE(FSceneTextureShaderParameters, SceneTextures)
		SHADER_PARAMETER_RDG_TEXTURE(Texture2D, SceneColorTexture)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FRealmTickGPU>, TickBuffer)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FFieldVoxelGPU>, SigilField)
		SHADER_PARAMETER(FMatrix44f, TranslatedWorldToRealm)
		SHADER_PARAMETER(float, AuraIntensity)
		SHADER_PARAMETER(uint32, AuraSteps)
		RENDER_TARGET_BINDING_SLOTS()
	END_SHADER_PARAMETER_STRUCT()

	static bool ShouldCompilePermutation(const FGlobalShaderPermutationParameters& Parameters)
	{
		return IsFeatureLevelSupported(Parameters.Platform, ERHIFeatureLevel::SM5);
	}
};
