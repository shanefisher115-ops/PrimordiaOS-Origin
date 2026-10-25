// World-memory strip along the bottom of the frame: one bar per actor. Its height is how far
// back the moment the actor recalled this tick lies (up to 30 s), its color how frightening
// that moment was, its brightness how closely it matched; the dim underlay is how full the
// actor's memory ring is.
#include "RealmCommon.hlsli"

struct FMemoryVS
{
	float4 Clip : SV_Position;
	float4 Color : TEXCOORD0;
};

FMemoryVS MainVS(uint Vertex : SV_VertexID, uint Instance : SV_InstanceID)
{
	const FRealmTickGPU T = TickBuffer[0];
	const uint Shown = max(1u, uint(Push.View.w));
	const uint Bar = Instance % Shown;
	const bool bUnderlay = Instance < Shown; // first pass draws the underlay, second the recall
	const FRecallGPU Rc = Recall[Bar];
	const FActorGPU A = Actors[Bar];
	const float Fill = saturate(float(A.State.w) / float(T.Grid.z));
	const float Depth = Rc.Value.x > 0.0 ? saturate(Rc.Value.z / 30.0) : 0.0;
	const float Height = bUnderlay ? Fill : max(Depth, 0.04 * saturate(Rc.Value.x));
	const float2 Corners[6] = { float2(0, 0), float2(1, 0), float2(1, 1), float2(0, 0), float2(1, 1), float2(0, 1) };
	const float2 C = Corners[Vertex];
	const float Width = 1.9 / float(Shown);
	const float X = -0.95 + (float(Bar) + C.x * 0.8) * Width;
	const float Y = 0.98 - C.y * Height * 0.14; // Vulkan NDC: +y is down
	FMemoryVS O;
	O.Clip = float4(X, Y, 0.0, 1.0);
	const float3 Calm = float3(0.15, 0.4, 0.9);
	const float3 Afraid = float3(1.0, 0.25, 0.08);
	const float Match = lerp(0.35, 1.0, saturate((Rc.Value.x - 0.8) * 5.0));
	O.Color = bUnderlay ? float4(0.03, 0.03, 0.045, 1.0) : float4(lerp(Calm, Afraid, saturate(Rc.Value.y * 1.5)) * Match, 1.0);
	return O;
}

float4 MainPS(FMemoryVS In) : SV_Target0
{
	return In.Color;
}
