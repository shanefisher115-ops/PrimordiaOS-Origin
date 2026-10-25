// Vulkan entry point: MCPMemoryCompress (kernel body: unreal/PrimordiaGPU/Shaders/Shared/MCPMemoryCompress.ush).
// Declares exactly the buffers the body names, at the bindings in Bindings.hlsli.
#include "Bindings.hlsli"
#include "MCPTypes.ush"
#include "MCPCommon.ush"

[[vk::binding(MCP_B_TICK, 0)]] StructuredBuffer<FRealmTickGPU> TickBuffer;
[[vk::binding(MCP_B_EPISODES, 0)]] StructuredBuffer<FEpisodeGPU> EpisodesIn;
[[vk::binding(MCP_B_ACTORS_OUT, 0)]] RWStructuredBuffer<FActorGPU> ActorsOut;
[[vk::binding(MCP_B_MEMORY, 0)]] RWStructuredBuffer<FMemoryGPU> Memory;
[[vk::binding(MCP_B_ACTOR_COST, 0)]] RWStructuredBuffer<FActorCostGPU> ActorCost;

#include "MCPMemoryCompress.ush"

[numthreads(MCP_GROUP_1D, 1, 1)]
void main(uint3 Id : SV_DispatchThreadID)
{
	MCPMemoryCompress(Id.x);
}
