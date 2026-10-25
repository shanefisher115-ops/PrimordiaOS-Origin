// Vulkan entry point: MCPSigil (kernel body: unreal/PrimordiaGPU/Shaders/Shared/MCPSigil.ush).
// Declares exactly the buffers the body names, at the bindings in Bindings.hlsli.
#include "Bindings.hlsli"
#include "MCPTypes.ush"
#include "MCPCommon.ush"

[[vk::binding(MCP_B_TICK, 0)]] StructuredBuffer<FRealmTickGPU> TickBuffer;
[[vk::binding(MCP_B_SIGILS, 0)]] StructuredBuffer<FSigilGPU> Sigils;
[[vk::binding(MCP_B_SIGIL_FIELD, 0)]] RWStructuredBuffer<FFieldVoxelGPU> SigilFieldOut;
[[vk::binding(MCP_B_SIGIL_COST, 0)]] RWStructuredBuffer<uint> SigilCost;

#include "MCPSigil.ush"

[numthreads(MCP_GROUP_3D, MCP_GROUP_3D, MCP_GROUP_3D)]
void main(uint3 Id : SV_DispatchThreadID, uint Local : SV_GroupIndex)
{
	MCPSigilField(Id, Local);
}
