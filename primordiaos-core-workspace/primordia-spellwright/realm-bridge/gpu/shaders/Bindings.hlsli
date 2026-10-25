// Descriptor binding table of the standalone Vulkan engine. Included by the HLSL entry
// points (as [[vk::binding(N, 0)]] numbers) and by the C++ host (descriptor set layouts),
// so the two can never drift. Every binding is a storage buffer.
#pragma once

// Compute (MCP) set 0: one layout shared by every kernel; each tick parity has its own set.
#define MCP_B_TICK 0
#define MCP_B_TERRAIN_IN 1
#define MCP_B_TERRAIN_OUT 2
#define MCP_B_STRUCTURES 3
#define MCP_B_STRUCTURE_ARGS 4
#define MCP_B_SIGILS 5
#define MCP_B_SIGIL_FIELD 6
#define MCP_B_SIGIL_COST 7
#define MCP_B_ACTORS_IN 8
#define MCP_B_ACTORS_OUT 9
#define MCP_B_BT_NODES 10
#define MCP_B_ACTOR_COST 11
#define MCP_B_EPISODES 12
#define MCP_B_MEMORY 13
#define MCP_B_RECALL_IN 14
#define MCP_B_RECALL_OUT 15
#define MCP_BINDING_COUNT 16

// Graphics (realm renderer) set 0: the outputs of one MCP tick.
#define RR_B_TICK 0
#define RR_B_TERRAIN 1
#define RR_B_STRUCTURES 2
#define RR_B_STRUCTURE_ARGS 3
#define RR_B_SIGILS 4
#define RR_B_SIGIL_FIELD 5
#define RR_B_ACTORS 6
#define RR_B_RECALL 7
#define RR_BINDING_COUNT 8
