// Sigils: a camera-facing disc per PRS-1 glyph, inscribed with its symmetry and intent phase
// (the same rose the MCP field kernel evaluates), blended additively over the scene.
#include "RealmCommon.hlsli"

struct FSigilVS
{
	float4 Clip : SV_Position;
	float2 Uv : TEXCOORD0;
	nointerpolation uint Index : TEXCOORD1;
};

FSigilVS MainVS(uint Vertex : SV_VertexID, uint Instance : SV_InstanceID)
{
	const FSigilGPU G = Sigils[Instance];
	const float2 Corners[6] = { float2(-1, -1), float2(1, -1), float2(1, 1), float2(-1, -1), float2(1, 1), float2(-1, 1) };
	const float2 Uv = Corners[Vertex];
	const float3 Forward = normalize(G.PosScale.xyz - Push.Camera.xyz);
	const float3 Right = normalize(cross(Forward, float3(0, 0, 1)));
	const float3 Up = cross(Right, Forward);
	const float Extent = G.PosScale.w * 1.2;
	FSigilVS O;
	O.Uv = Uv;
	O.Index = Instance;
	O.Clip = mul(Push.ViewProj, float4(G.PosScale.xyz + (Right * Uv.x + Up * Uv.y) * Extent, 1.0));
	return O;
}

float4 MainPS(FSigilVS In) : SV_Target0
{
	const FRealmTickGPU T = TickBuffer[0];
	const FSigilGPU G = Sigils[In.Index];
	const float R = length(In.Uv) * 1.2; // 1.0 = the glyph's rim
	const float Theta = atan2(In.Uv.y, In.Uv.x);
	const float Spin = Push.Camera.w * G.Live.w * (0.3 + T.MetaA.w);
	const float Rose = 0.5 + 0.5 * cos(G.Shape.x * Theta + G.Live.y + Spin);
	const float Rim = (R - 0.8) / 0.05;
	const float Petal = (R - 0.8 * lerp(0.35, 0.95, Rose)) / 0.04;
	const float Ring = exp(-Rim * Rim) + 0.6 * exp(-Petal * Petal) * G.Shape.y;
	const float Clarity = lerp(0.35, 1.0, T.MetaA.z);
	const float Glow = (Ring * Clarity + 0.15 * exp(-R * R * 3.0)) * G.Live.x * smoothstep(1.2, 1.0, R);
	const bool bWard = uint(G.Shape.w + 0.5) == MCP_GLYPH_WARD;
	const float3 Color = MCPHsvToRgb(G.Shape.z, bWard ? 0.9 : 0.6, 1.0) * (bWard ? 1.0 + T.MetaB.x : 1.0);
	return float4(Color * Glow * (1.0 + 2.0 * T.MetaA.y), 0.0);
}
