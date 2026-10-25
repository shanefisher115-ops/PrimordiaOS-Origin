// Vulkan entry point: MCPTopology (kernel body: unreal/PrimordiaGPU/Shaders/Shared/MCPTopology.ush).
// Declares exactly the buffers the body names, at the bindings in Bindings.hlsli.
#include "Bindings.hlsli"
#include "MCPTypes.ush"
#include "MCPCommon.ush"

[[vk::binding(MCP_B_TICK, 0)]] StructuredBuffer<FRealmTickGPU> TickBuffer;
[[vk::binding(MCP_B_TERRAIN_IN, 0)]] StructuredBuffer<FTerrainCellGPU> TerrainIn;
[[vk::binding(MCP_B_TERRAIN_OUT, 0)]] RWStructuredBuffer<FTerrainCellGPU> TerrainOut;

#include "MCPTopology.ush"

[numthreads(MCP_GROUP_2D, MCP_GROUP_2D, 1)]
void main(uint3 Id : SV_DispatchThreadID)
{
	MCPTopologyMutate(Id.xy);
}
