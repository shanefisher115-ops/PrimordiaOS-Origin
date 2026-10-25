// Vulkan entry point: MCPTickReset (kernel body: unreal/PrimordiaGPU/Shaders/Shared/MCPTickReset.ush).
// Declares exactly the buffers the body names, at the bindings in Bindings.hlsli.
#include "Bindings.hlsli"
#include "MCPTypes.ush"
#include "MCPCommon.ush"

[[vk::binding(MCP_B_STRUCTURE_ARGS, 0)]] RWStructuredBuffer<uint> StructureArgs;
[[vk::binding(MCP_B_SIGIL_COST, 0)]] RWStructuredBuffer<uint> SigilCost;

#include "MCPTickReset.ush"

[numthreads(64, 1, 1)]
void main(uint3 Id : SV_DispatchThreadID)
{
	MCPTickReset(Id.x);
}
