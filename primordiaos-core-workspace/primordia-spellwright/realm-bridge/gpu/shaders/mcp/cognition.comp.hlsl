// Vulkan entry point: MCPCognition (kernel body: unreal/PrimordiaGPU/Shaders/Shared/MCPCognition.ush).
// Declares exactly the buffers the body names, at the bindings in Bindings.hlsli.
#include "Bindings.hlsli"
#include "MCPTypes.ush"
#include "MCPCommon.ush"

[[vk::binding(MCP_B_TICK, 0)]] StructuredBuffer<FRealmTickGPU> TickBuffer;
[[vk::binding(MCP_B_TERRAIN_OUT, 0)]] StructuredBuffer<FTerrainCellGPU> TerrainCurrent;
[[vk::binding(MCP_B_SIGIL_FIELD, 0)]] StructuredBuffer<FFieldVoxelGPU> SigilFieldCurrent;
[[vk::binding(MCP_B_SIGILS, 0)]] StructuredBuffer<FSigilGPU> Sigils;
[[vk::binding(MCP_B_ACTORS_IN, 0)]] StructuredBuffer<FActorGPU> ActorsIn;
[[vk::binding(MCP_B_ACTORS_OUT, 0)]] RWStructuredBuffer<FActorGPU> ActorsOut;
[[vk::binding(MCP_B_BT_NODES, 0)]] StructuredBuffer<FBTNodeGPU> BTNodes;
[[vk::binding(MCP_B_RECALL_IN, 0)]] StructuredBuffer<FRecallGPU> RecallIn;
[[vk::binding(MCP_B_ACTOR_COST, 0)]] RWStructuredBuffer<FActorCostGPU> ActorCost;
[[vk::binding(MCP_B_EPISODES, 0)]] RWStructuredBuffer<FEpisodeGPU> EpisodesOut;

#include "MCPCognition.ush"

[numthreads(MCP_GROUP_1D, 1, 1)]
void main(uint3 Id : SV_DispatchThreadID)
{
	MCPActorCognition(Id.x);
}
