// HDR -> display: ACES (Narkowicz fit), exposure from the realm's luminosity, sRGB encode.
// The output target is UNORM on every path (swapchain or readback), so encoding is explicit.
[[vk::binding(0, 0)]] Texture2D<float4> SceneColor;
[[vk::binding(1, 0)]] SamplerState SceneSampler;

struct FTonemapPush
{
	float4 Params; // x exposure, y vignette strength, z/w zero
};
[[vk::push_constant]] FTonemapPush Push;

struct FFullscreenVS
{
	float4 Clip : SV_Position;
	float2 Uv : TEXCOORD0;
};

FFullscreenVS MainVS(uint Vertex : SV_VertexID)
{
	FFullscreenVS O;
	O.Uv = float2((Vertex << 1) & 2, Vertex & 2);
	O.Clip = float4(O.Uv * 2.0 - 1.0, 0.0, 1.0);
	return O;
}

float3 Aces(float3 X)
{
	return saturate((X * (2.51 * X + 0.03)) / (X * (2.43 * X + 0.59) + 0.14));
}

float3 ToSrgb(float3 L)
{
	return select(L <= 0.0031308, L * 12.92, 1.055 * pow(L, 1.0 / 2.4) - 0.055);
}

float4 MainPS(FFullscreenVS In) : SV_Target0
{
	const float3 Hdr = SceneColor.SampleLevel(SceneSampler, In.Uv, 0).rgb * Push.Params.x;
	const float2 D = In.Uv - 0.5;
	const float Vignette = 1.0 - Push.Params.y * dot(D, D) * 2.0;
	return float4(ToSrgb(Aces(Hdr) * Vignette), 1.0);
}
