// Vulkan entry point: MCPMemoryRetrieve (kernel body: unreal/PrimordiaGPU/Shaders/Shared/MCPMemoryRetrieve.ush).
// Declares exactly the buffers the body names, at the bindings in Bindings.hlsli.
#include "Bindings.hlsli"
#include "MCPTypes.ush"
#include "MCPCommon.ush"

[[vk::binding(MCP_B_TICK, 0)]] StructuredBuffer<FRealmTickGPU> TickBuffer;
[[vk::binding(MCP_B_EPISODES, 0)]] StructuredBuffer<FEpisodeGPU> EpisodesIn;
[[vk::binding(MCP_B_ACTORS_OUT, 0)]] StructuredBuffer<FActorGPU> ActorsCurrent;
[[vk::binding(MCP_B_MEMORY, 0)]] StructuredBuffer<FMemoryGPU> MemoryCurrent;
[[vk::binding(MCP_B_RECALL_OUT, 0)]] RWStructuredBuffer<FRecallGPU> RecallOut;
[[vk::binding(MCP_B_ACTOR_COST, 0)]] RWStructuredBuffer<FActorCostGPU> ActorCost;

#include "MCPMemoryRetrieve.ush"

[numthreads(MCP_MEMORY_SLOTS, 1, 1)]
void main(uint3 Group : SV_GroupID, uint Local : SV_GroupIndex)
{
	MCPMemoryRetrieve(Group.x, Local);
}
