// Shared declarations for the realm renderer's graphics shaders. Everything the renderer
// draws is pulled straight out of the MCP tick's output buffers: there are no vertex
// buffers, so a new tick is visible the moment its compute work finishes.
#pragma once
#include "Bindings.hlsli"
#include "MCPTypes.ush"
#include "MCPCommon.ush"

[[vk::binding(RR_B_TICK, 0)]] StructuredBuffer<FRealmTickGPU> TickBuffer;
[[vk::binding(RR_B_TERRAIN, 0)]] StructuredBuffer<FTerrainCellGPU> Terrain;
[[vk::binding(RR_B_STRUCTURES, 0)]] StructuredBuffer<FStructureGPU> Structures;
[[vk::binding(RR_B_STRUCTURE_ARGS, 0)]] StructuredBuffer<uint> StructureArgs;
[[vk::binding(RR_B_SIGILS, 0)]] StructuredBuffer<FSigilGPU> Sigils;
[[vk::binding(RR_B_SIGIL_FIELD, 0)]] StructuredBuffer<FFieldVoxelGPU> SigilField;
[[vk::binding(RR_B_ACTORS, 0)]] StructuredBuffer<FActorGPU> Actors;
[[vk::binding(RR_B_RECALL, 0)]] StructuredBuffer<FRecallGPU> Recall;

struct FRealmPush
{
	float4x4 ViewProj;  // column-major on the C++ side, used as mul(ViewProj, p)
	float4 Camera;      // xyz eye (m), w realm time
	float4 View;        // x exposure, y aspect, z actor scale, w visible actor count
};
[[vk::push_constant]] FRealmPush Push;

static const float3 SunDir = normalize(float3(0.45, 0.25, 0.86));

float3 BiomeColor(uint Biome)
{
	switch (Biome)
	{
	case MCP_BIOME_ABYSS: return float3(0.02, 0.05, 0.10);
	case MCP_BIOME_SHORE: return float3(0.62, 0.56, 0.42);
	case MCP_BIOME_MEADOW: return float3(0.24, 0.42, 0.16);
	case MCP_BIOME_FOREST: return float3(0.08, 0.24, 0.10);
	case MCP_BIOME_HIGHLAND: return float3(0.36, 0.33, 0.30);
	case MCP_BIOME_CRYSTAL: return float3(0.35, 0.75, 0.90);
	default: return float3(0.10, 0.08, 0.07); // ashland
	}
}

float3 ActionColor(uint Action)
{
	switch (Action)
	{
	case MCP_ACTION_WANDER: return float3(0.95, 0.85, 0.55);
	case MCP_ACTION_SEEK_SIGIL: return float3(0.45, 0.80, 1.00);
	case MCP_ACTION_FLEE: return float3(1.00, 0.20, 0.12);
	case MCP_ACTION_REST: return float3(0.35, 0.35, 0.45);
	case MCP_ACTION_COMMUNE: return float3(1.00, 0.55, 0.95);
	default: return float3(0.70, 0.70, 0.70);
	}
}

/** Sigil aura at a world point (nearest voxel of this tick's field). */
float3 AuraAt(float3 P)
{
	const FRealmTickGPU T = TickBuffer[0];
	const uint N = T.Grid.y;
	return SigilField[MCPFieldIndex(MCPFieldVoxelAt(P, T.Field, N), N)].Value.rgb;
}

float3 Shade(float3 Albedo, float3 Normal, float Ambient)
{
	const FRealmTickGPU T = TickBuffer[0];
	const float Lum = T.MetaA.y;
	const float3 Sun = lerp(float3(1.0, 0.92, 0.80), T.Essence.rgb, 0.25) * (0.6 + 1.8 * Lum);
	const float3 Sky = lerp(float3(0.10, 0.12, 0.18), T.Essence.rgb * 0.3, 0.4) * (0.4 + Lum);
	return Albedo * (Sun * saturate(dot(Normal, SunDir)) + Sky * Ambient);
}
