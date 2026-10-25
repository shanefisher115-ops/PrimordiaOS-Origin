#include "MCPShaders.h"

#include "MCPTypes.ush"

// The .usf entry files repeat these as numthreads literals (FXC-compatible); keep them equal.
static_assert(PrimordiaMCP::MCP_GROUP_1D == 64, "MCPCognition/MCPMemoryCompress.usf use numthreads(64, 1, 1)");
static_assert(PrimordiaMCP::MCP_GROUP_2D == 8, "MCPTopology/MCPStructures.usf use numthreads(8, 8, 1)");
static_assert(PrimordiaMCP::MCP_GROUP_3D == 4, "MCPSigilField.usf uses numthreads(4, 4, 4)");
static_assert(PrimordiaMCP::MCP_MEMORY_SLOTS == 64, "MCPMemoryRetrieve.usf uses numthreads(64, 1, 1)");

IMPLEMENT_GLOBAL_SHADER(FMCPTickResetCS, "/Plugin/PrimordiaGPU/Private/MCPTickReset.usf", "MainCS", SF_Compute);
IMPLEMENT_GLOBAL_SHADER(FMCPTopologyCS, "/Plugin/PrimordiaGPU/Private/MCPTopology.usf", "MainCS", SF_Compute);
IMPLEMENT_GLOBAL_SHADER(FMCPStructuresCS, "/Plugin/PrimordiaGPU/Private/MCPStructures.usf", "MainCS", SF_Compute);
IMPLEMENT_GLOBAL_SHADER(FMCPSigilFieldCS, "/Plugin/PrimordiaGPU/Private/MCPSigilField.usf", "MainCS", SF_Compute);
IMPLEMENT_GLOBAL_SHADER(FMCPCognitionCS, "/Plugin/PrimordiaGPU/Private/MCPCognition.usf", "MainCS", SF_Compute);
IMPLEMENT_GLOBAL_SHADER(FMCPMemoryCompressCS, "/Plugin/PrimordiaGPU/Private/MCPMemoryCompress.usf", "MainCS", SF_Compute);
IMPLEMENT_GLOBAL_SHADER(FMCPMemoryRetrieveCS, "/Plugin/PrimordiaGPU/Private/MCPMemoryRetrieve.usf", "MainCS", SF_Compute);
