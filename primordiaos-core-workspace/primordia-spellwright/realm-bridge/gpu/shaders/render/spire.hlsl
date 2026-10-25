// Spires grown by the MCP structure kernel, drawn with vkCmdDrawIndirect: the GPU wrote the
// instance count, so the CPU never learns (or waits for) how many there are.
#include "RealmCommon.hlsli"

struct FSpireVS
{
	float4 Clip : SV_Position;
	float3 World : TEXCOORD0;
	float3 Normal : TEXCOORD1;
	float3 Look : TEXCOORD2; // x hue, y biome, z height share along the spire
};

FSpireVS MainVS(uint Vertex : SV_VertexID, uint Instance : SV_InstanceID)
{
	const FRealmTickGPU T = TickBuffer[0];
	FSpireVS O = (FSpireVS)0;
	// The append counter can exceed the buffer when the realm grows more summits than the
	// budget; those instances collapse to nothing instead of reading out of bounds.
	if (Instance >= min(StructureArgs[1], T.Grid.w))
	{
		O.Clip = float4(0, 0, -1, 1);
		return O;
	}
	const FStructureGPU S = Structures[Instance];
	const uint Sides = 8u;
	const uint Tri = Vertex / 3u;
	const uint Corner = Vertex % 3u;
	const uint Side = Tri % Sides;
	const bool bCap = Tri >= Sides;
	const float Angle0 = 6.2831853 * float(Side) / float(Sides);
	const float Angle1 = 6.2831853 * float(Side + 1u) / float(Sides);
	const float Radius = S.Look.x;
	const float Height = S.PosHeight.w;
	float3 Local;
	float3 Normal;
	if (!bCap)
	{
		const float Mid = 0.5 * (Angle0 + Angle1);
		Normal = normalize(float3(cos(Mid) * Height, sin(Mid) * Height, Radius));
		Local = Corner == 0u ? float3(cos(Angle0) * Radius, sin(Angle0) * Radius, -0.5)
			: Corner == 1u ? float3(cos(Angle1) * Radius, sin(Angle1) * Radius, -0.5)
			: float3(0, 0, Height);
	}
	else
	{
		Normal = float3(0, 0, -1);
		Local = Corner == 0u ? float3(0, 0, -0.5)
			: Corner == 1u ? float3(cos(Angle1) * Radius, sin(Angle1) * Radius, -0.5)
			: float3(cos(Angle0) * Radius, sin(Angle0) * Radius, -0.5);
	}
	O.World = S.PosHeight.xyz + Local;
	O.Normal = Normal;
	O.Look = float3(S.Look.y, S.Look.z, saturate(Local.z / max(Height, 0.01)));
	O.Clip = mul(Push.ViewProj, float4(O.World, 1.0));
	return O;
}

float4 MainPS(FSpireVS In) : SV_Target0
{
	const FRealmTickGPU T = TickBuffer[0];
	const bool bCrystal = uint(In.Look.y + 0.5) == MCP_BIOME_CRYSTAL;
	const float3 Albedo = bCrystal ? MCPHsvToRgb(In.Look.x, 0.55, 0.9) : float3(0.30, 0.28, 0.27);
	float3 Color = Shade(Albedo, normalize(In.Normal), 0.5);
	if (bCrystal)
	{
		Color += Albedo * (0.3 + 1.5 * pow(In.Look.z, 3.0)) * (0.4 + T.MetaB.y);
	}
	Color += AuraAt(In.World) * 0.4;
	return float4(Color, 1.0);
}
