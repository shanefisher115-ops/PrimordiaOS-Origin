// Actors: one octahedron per actor, colored by the action cognition committed to, glowing
// with fear. Positions come straight from this tick's ActorsOut buffer.
#include "RealmCommon.hlsli"

struct FActorVS
{
	float4 Clip : SV_Position;
	float3 Normal : TEXCOORD0;
	float4 Look : TEXCOORD1; // rgb action color, w fear
};

FActorVS MainVS(uint Vertex : SV_VertexID, uint Instance : SV_InstanceID)
{
	const FActorGPU A = Actors[Instance];
	// 8 faces x 3 corners. Face f takes the quadrant signs of f % 4, top half for f < 4.
	const uint Face = Vertex / 3u;
	const uint Corner = Vertex % 3u;
	const float2 Signs[4] = { float2(1, 1), float2(-1, 1), float2(-1, -1), float2(1, -1) };
	const float2 Sg = Signs[Face % 4u];
	const float Up = Face < 4u ? 1.0 : -1.0;
	float3 Local = Corner == 0u ? float3(Sg.x, 0, 0) : Corner == 1u ? float3(0, Sg.y, 0) : float3(0, 0, Up);
	if (Up < 0.0 && Corner < 2u)
	{
		Local = Corner == 0u ? float3(0, Sg.y, 0) : float3(Sg.x, 0, 0); // keep the winding outward
	}
	const float Scale = Push.View.z;
	FActorVS O;
	O.Normal = normalize(float3(Sg.x, Sg.y, Up));
	O.Look = float4(ActionColor(A.State.x), A.Drives.z);
	const float3 World = A.PosRadius.xyz + Local * float3(Scale, Scale, Scale * 1.6);
	O.Clip = mul(Push.ViewProj, float4(World, 1.0));
	return O;
}

float4 MainPS(FActorVS In) : SV_Target0
{
	const float3 Lit = Shade(In.Look.rgb, normalize(In.Normal), 0.8);
	return float4(Lit + In.Look.rgb * 0.15 + float3(1.0, 0.15, 0.05) * In.Look.w * 0.8, 1.0);
}
