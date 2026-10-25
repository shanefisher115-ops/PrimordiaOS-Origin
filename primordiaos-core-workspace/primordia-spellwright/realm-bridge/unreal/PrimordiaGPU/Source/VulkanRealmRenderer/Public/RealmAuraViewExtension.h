// Unreal render thread -> realm rendering: a scene view extension that adds the MCP sigil
// field to every view of a scene whose world runs MCP. Console: r.PrimordiaRealm.Aura 0|1,
// r.PrimordiaRealm.AuraIntensity, r.PrimordiaRealm.AuraSteps.
#pragma once

#include "CoreMinimal.h"
#include "SceneViewExtension.h"

class VULKANREALMRENDERER_API FRealmAuraViewExtension : public FSceneViewExtensionBase
{
public:
	FRealmAuraViewExtension(const FAutoRegister& AutoRegister);

	virtual void SetupViewFamily(FSceneViewFamily& InViewFamily) override {}
	virtual void SetupView(FSceneViewFamily& InViewFamily, FSceneView& InView) override {}
	virtual void BeginRenderViewFamily(FSceneViewFamily& InViewFamily) override {}
	virtual void SubscribeToPostProcessingPass(EPostProcessingPass Pass, FAfterPassCallbackDelegateArray& InOutPassCallbacks, bool bIsPassEnabled) override;

private:
	FScreenPassTexture AddAura_RenderThread(FRDGBuilder& GraphBuilder, const FSceneView& View, const FPostProcessMaterialInputs& Inputs);
};
