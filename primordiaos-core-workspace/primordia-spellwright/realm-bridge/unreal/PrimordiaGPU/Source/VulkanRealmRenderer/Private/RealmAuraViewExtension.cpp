#include "RealmAuraViewExtension.h"

#include "HAL/IConsoleManager.h"
#include "MCPGPUState.h"
#include "OnyxGPUTimer.h"
#include "PostProcess/PostProcessMaterialInputs.h"
#include "RealmAuraShaders.h"
#include "RenderGraphBuilder.h"
#include "ScreenPass.h"

IMPLEMENT_GLOBAL_SHADER(FRealmAuraPS, "/Plugin/PrimordiaGPU/Private/RealmAuraComposite.usf", "MainPS", SF_Pixel);

namespace
{
TAutoConsoleVariable<int32> CVarAura(TEXT("r.PrimordiaRealm.Aura"), 1, TEXT("Composite the MCP sigil field into the scene (0 = off)."), ECVF_RenderThreadSafe);
TAutoConsoleVariable<float> CVarAuraIntensity(TEXT("r.PrimordiaRealm.AuraIntensity"), 0.06f, TEXT("Aura light added per meter of field the view ray crosses."), ECVF_RenderThreadSafe);
TAutoConsoleVariable<int32> CVarAuraSteps(TEXT("r.PrimordiaRealm.AuraSteps"), 48, TEXT("Field samples per pixel."), ECVF_RenderThreadSafe);
} // namespace

FRealmAuraViewExtension::FRealmAuraViewExtension(const FAutoRegister& AutoRegister) : FSceneViewExtensionBase(AutoRegister)
{
}

void FRealmAuraViewExtension::SubscribeToPostProcessingPass(EPostProcessingPass Pass, FAfterPassCallbackDelegateArray& InOutPassCallbacks, bool bIsPassEnabled)
{
	// After motion blur: linear HDR scene color, before tonemapping.
	if (Pass == EPostProcessingPass::MotionBlur && CVarAura.GetValueOnRenderThread() != 0)
	{
		InOutPassCallbacks.Add(FAfterPassCallbackDelegate::CreateRaw(this, &FRealmAuraViewExtension::AddAura_RenderThread));
	}
}

FScreenPassTexture FRealmAuraViewExtension::AddAura_RenderThread(FRDGBuilder& GraphBuilder, const FSceneView& View, const FPostProcessMaterialInputs& Inputs)
{
	const TSharedPtr<FMCPGPUState, ESPMode::ThreadSafe> MCP = View.Family ? FMCPGPUState::Find(View.Family->Scene) : nullptr;
	const FMCPGPUState::FFieldView Field = MCP ? MCP->GetFieldView_RenderThread() : FMCPGPUState::FFieldView();
	if (!Field.bValid || !Inputs.SceneTextures.SceneTextures)
	{
		return Inputs.ReturnUntouchedSceneColorForPostProcessing(GraphBuilder);
	}

	FOnyxGPUTimer::Get().Stamp(GraphBuilder, TEXT("render.realm_aura"));
	const FScreenPassTexture SceneColor = FScreenPassTexture::CopyFromSlice(GraphBuilder, Inputs.GetInput(EPostProcessMaterialInput::SceneColor));
	FScreenPassRenderTarget Output = Inputs.OverrideOutput;
	if (!Output.IsValid())
	{
		Output = FScreenPassRenderTarget::CreateFromInput(GraphBuilder, SceneColor, View.GetOverwriteLoadAction(), TEXT("PrimordiaRealm.Aura"));
	}

	// Translated world -> world -> realm (Unreal units) -> realm meters. Row-vector convention,
	// as in the shader's mul(float4(P, 1), M).
	const FMatrix TranslatedToWorld = FTranslationMatrix(-View.ViewMatrices.GetPreViewTranslation());
	const FMatrix WorldToRealm = Field.RealmToWorld.ToInverseMatrixWithScale();
	const FMatrix ToMeters = FScaleMatrix(FVector(1.0 / FMath::Max(0.01f, Field.UnitsPerMeter)));

	FRealmAuraPS::FParameters* Params = GraphBuilder.AllocParameters<FRealmAuraPS::FParameters>();
	Params->View = View.ViewUniformBuffer;
	Params->SceneTextures = Inputs.SceneTextures;
	Params->SceneColorTexture = SceneColor.Texture;
	Params->TickBuffer = GraphBuilder.CreateSRV(GraphBuilder.RegisterExternalBuffer(Field.Tick));
	Params->SigilField = GraphBuilder.CreateSRV(GraphBuilder.RegisterExternalBuffer(Field.Field));
	Params->TranslatedWorldToRealm = FMatrix44f(TranslatedToWorld * WorldToRealm * ToMeters);
	Params->AuraIntensity = CVarAuraIntensity.GetValueOnRenderThread();
	Params->AuraSteps = static_cast<uint32>(FMath::Clamp(CVarAuraSteps.GetValueOnRenderThread(), 1, 256));
	Params->RenderTargets[0] = Output.GetRenderTargetBinding();

	FGlobalShaderMap* ShaderMap = GetGlobalShaderMap(View.GetFeatureLevel());
	TShaderMapRef<FScreenPassVS> VertexShader(ShaderMap);
	TShaderMapRef<FRealmAuraPS> PixelShader(ShaderMap);
	AddDrawScreenPass(GraphBuilder, RDG_EVENT_NAME("PrimordiaRealm.Aura"), FScreenPassViewInfo(View), FScreenPassTextureViewport(Output),
		FScreenPassTextureViewport(SceneColor), VertexShader, PixelShader, Params);
	FOnyxGPUTimer::Get().Close(GraphBuilder, nullptr, Output.Texture);
	return FScreenPassTexture(Output);
}
