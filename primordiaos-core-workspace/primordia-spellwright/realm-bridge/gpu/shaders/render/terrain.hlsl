// Terrain: one quad per height-field cell, vertex-pulled from the MCP terrain buffer.
// Underwater cells are drawn at sea level as water; the sigil field tints the ground. The
// height field is square but a PRS-1 ground layer is a disc, so the sea ends at its radius.
#include "RealmCommon.hlsli"

struct FTerrainVS
{
	float4 Clip : SV_Position;
	float3 World : TEXCOORD0;
	float3 Normal : TEXCOORD1;
	float4 Cell : TEXCOORD2; // x height, y moisture, z biome, w depth below sea
};

float HeightAt(int2 C, uint N)
{
	return Terrain[MCPTerrainIndex(C, N)].Data.x;
}

FTerrainVS MainVS(uint Vertex : SV_VertexID)
{
	const FRealmTickGPU T = TickBuffer[0];
	const uint N = T.Grid.x;
	const uint Quad = Vertex / 6u;
	const uint Corner = Vertex % 6u;
	// Two triangles per quad: (0,0) (1,0) (1,1) and (0,0) (1,1) (0,1).
	const uint2 Offsets[6] = { uint2(0, 0), uint2(1, 0), uint2(1, 1), uint2(0, 0), uint2(1, 1), uint2(0, 1) };
	const uint2 C = uint2(Quad % (N - 1u), Quad / (N - 1u)) + Offsets[Corner];
	const float4 Cell = Terrain[MCPTerrainIndex(int2(C), N)].Data;
	const float Sea = T.Misc.x;
	const float2 XY = MCPTerrainCellXY(C, N, T.MetaB.z);
	const float CellSize = 2.0 * T.MetaB.z / float(N);

	const float Hx = HeightAt(int2(C) + int2(1, 0), N) - HeightAt(int2(C) - int2(1, 0), N);
	const float Hy = HeightAt(int2(C) + int2(0, 1), N) - HeightAt(int2(C) - int2(0, 1), N);
	const bool bWater = Cell.x < Sea;

	FTerrainVS O;
	O.World = float3(XY, max(Cell.x, Sea));
	O.Normal = bWater ? float3(0, 0, 1) : normalize(float3(-Hx, -Hy, 2.0 * CellSize));
	O.Cell = float4(Cell.x, Cell.y, Cell.w, max(0.0, Sea - Cell.x));
	O.Clip = mul(Push.ViewProj, float4(O.World, 1.0));
	return O;
}

float4 MainPS(FTerrainVS In) : SV_Target0
{
	const FRealmTickGPU T = TickBuffer[0];
	if (dot(In.World.xy, In.World.xy) > T.MetaB.z * T.MetaB.z)
	{
		discard;
	}
	const uint Biome = uint(In.Cell.z + 0.5);
	float3 Albedo = BiomeColor(Biome) * lerp(0.85, 1.1, In.Cell.y);
	float3 Color;
	if (In.Cell.w > 0.0)
	{
		// Water: deeper is darker, and the sun glints off the surface.
		const float3 Deep = float3(0.01, 0.04, 0.09);
		const float3 Shallow = float3(0.05, 0.22, 0.30);
		Albedo = lerp(Shallow, Deep, saturate(In.Cell.w / 6.0));
		const float3 V = normalize(Push.Camera.xyz - In.World);
		const float3 H = normalize(V + SunDir);
		const float Glint = pow(saturate(dot(H, float3(0, 0, 1))), 180.0) * 6.0;
		Color = Shade(Albedo, In.Normal, 1.0) + Glint * lerp(float3(1, 1, 1), T.Essence.rgb, 0.4);
	}
	else
	{
		Color = Shade(Albedo, In.Normal, 0.6);
		if (Biome == MCP_BIOME_CRYSTAL)
		{
			Color += Albedo * 0.35 * (0.5 + T.MetaB.y); // crystal holds its own light
		}
		if (Biome == MCP_BIOME_ASHLAND)
		{
			const float Ember = MCPValueNoise(In.World.xy * 0.7 + Push.Camera.w * 0.3, 7u);
			Color += float3(1.0, 0.3, 0.05) * pow(Ember, 6.0) * 2.0 * T.MetaB.x;
		}
	}
	Color += AuraAt(In.World + float3(0, 0, 0.8)) * 0.6;
	return float4(Color, 1.0);
}
