// Vulkan entry point: MCPStructures (kernel body: unreal/PrimordiaGPU/Shaders/Shared/MCPStructures.ush).
// Declares exactly the buffers the body names, at the bindings in Bindings.hlsli.
#include "Bindings.hlsli"
#include "MCPTypes.ush"
#include "MCPCommon.ush"

[[vk::binding(MCP_B_TICK, 0)]] StructuredBuffer<FRealmTickGPU> TickBuffer;
[[vk::binding(MCP_B_TERRAIN_OUT, 0)]] StructuredBuffer<FTerrainCellGPU> TerrainCurrent;
[[vk::binding(MCP_B_STRUCTURES, 0)]] RWStructuredBuffer<FStructureGPU> Structures;
[[vk::binding(MCP_B_STRUCTURE_ARGS, 0)]] RWStructuredBuffer<uint> StructureArgs;

#include "MCPStructures.ush"

[numthreads(MCP_GROUP_2D, MCP_GROUP_2D, 1)]
void main(uint3 Id : SV_DispatchThreadID)
{
	MCPStructureSpawn(Id.xy);
}
