// The MCP kernels as Unreal global shaders. Each FParameters struct binds exactly the globals
// its kernel body names (Shaders/Shared/*.ush); the .usf entry files declare the same names.
#pragma once

#include "CoreMinimal.h"
#include "DataDrivenShaderPlatformInfo.h"
#include "GlobalShader.h"
#include "ShaderParameterStruct.h"
#include "RenderGraphResources.h"

class FMCPShader : public FGlobalShader
{
public:
	FMCPShader() = default;
	FMCPShader(const ShaderMetaType::CompiledShaderInitializerType& Initializer) : FGlobalShader(Initializer) {}

	static bool ShouldCompilePermutation(const FGlobalShaderPermutationParameters& Parameters)
	{
		return IsFeatureLevelSupported(Parameters.Platform, ERHIFeatureLevel::SM5);
	}
};

class FMCPTickResetCS : public FMCPShader
{
public:
	DECLARE_GLOBAL_SHADER(FMCPTickResetCS);
	SHADER_USE_PARAMETER_STRUCT(FMCPTickResetCS, FMCPShader);
	BEGIN_SHADER_PARAMETER_STRUCT(FParameters, )
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<uint>, StructureArgs)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<uint>, SigilCost)
	END_SHADER_PARAMETER_STRUCT()
};

class FMCPTopologyCS : public FMCPShader
{
public:
	DECLARE_GLOBAL_SHADER(FMCPTopologyCS);
	SHADER_USE_PARAMETER_STRUCT(FMCPTopologyCS, FMCPShader);
	BEGIN_SHADER_PARAMETER_STRUCT(FParameters, )
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FRealmTickGPU>, TickBuffer)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FTerrainCellGPU>, TerrainIn)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<FTerrainCellGPU>, TerrainOut)
	END_SHADER_PARAMETER_STRUCT()
};

class FMCPStructuresCS : public FMCPShader
{
public:
	DECLARE_GLOBAL_SHADER(FMCPStructuresCS);
	SHADER_USE_PARAMETER_STRUCT(FMCPStructuresCS, FMCPShader);
	BEGIN_SHADER_PARAMETER_STRUCT(FParameters, )
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FRealmTickGPU>, TickBuffer)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FTerrainCellGPU>, TerrainCurrent)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<FStructureGPU>, Structures)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<uint>, StructureArgs)
	END_SHADER_PARAMETER_STRUCT()
};

class FMCPSigilFieldCS : public FMCPShader
{
public:
	DECLARE_GLOBAL_SHADER(FMCPSigilFieldCS);
	SHADER_USE_PARAMETER_STRUCT(FMCPSigilFieldCS, FMCPShader);
	BEGIN_SHADER_PARAMETER_STRUCT(FParameters, )
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FRealmTickGPU>, TickBuffer)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FSigilGPU>, Sigils)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<FFieldVoxelGPU>, SigilFieldOut)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<uint>, SigilCost)
	END_SHADER_PARAMETER_STRUCT()
};

class FMCPCognitionCS : public FMCPShader
{
public:
	DECLARE_GLOBAL_SHADER(FMCPCognitionCS);
	SHADER_USE_PARAMETER_STRUCT(FMCPCognitionCS, FMCPShader);
	BEGIN_SHADER_PARAMETER_STRUCT(FParameters, )
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FRealmTickGPU>, TickBuffer)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FTerrainCellGPU>, TerrainCurrent)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FFieldVoxelGPU>, SigilFieldCurrent)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FSigilGPU>, Sigils)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FActorGPU>, ActorsIn)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<FActorGPU>, ActorsOut)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FBTNodeGPU>, BTNodes)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FRecallGPU>, RecallIn)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<FActorCostGPU>, ActorCost)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<FEpisodeGPU>, EpisodesOut)
	END_SHADER_PARAMETER_STRUCT()
};

class FMCPMemoryCompressCS : public FMCPShader
{
public:
	DECLARE_GLOBAL_SHADER(FMCPMemoryCompressCS);
	SHADER_USE_PARAMETER_STRUCT(FMCPMemoryCompressCS, FMCPShader);
	BEGIN_SHADER_PARAMETER_STRUCT(FParameters, )
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FRealmTickGPU>, TickBuffer)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FEpisodeGPU>, EpisodesIn)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<FActorGPU>, ActorsOut)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<FMemoryGPU>, Memory)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<FActorCostGPU>, ActorCost)
	END_SHADER_PARAMETER_STRUCT()
};

class FMCPMemoryRetrieveCS : public FMCPShader
{
public:
	DECLARE_GLOBAL_SHADER(FMCPMemoryRetrieveCS);
	SHADER_USE_PARAMETER_STRUCT(FMCPMemoryRetrieveCS, FMCPShader);
	BEGIN_SHADER_PARAMETER_STRUCT(FParameters, )
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FRealmTickGPU>, TickBuffer)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FEpisodeGPU>, EpisodesIn)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FActorGPU>, ActorsCurrent)
		SHADER_PARAMETER_RDG_BUFFER_SRV(StructuredBuffer<FMemoryGPU>, MemoryCurrent)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<FRecallGPU>, RecallOut)
		SHADER_PARAMETER_RDG_BUFFER_UAV(RWStructuredBuffer<FActorCostGPU>, ActorCost)
	END_SHADER_PARAMETER_STRUCT()
};
