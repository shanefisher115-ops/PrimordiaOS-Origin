// Creates the realm aura view extension and probes the Vulkan device once the engine (and
// with it the RHI and the scene view extension registry) exists.
#include "Misc/CoreDelegates.h"
#include "Modules/ModuleManager.h"
#include "RealmAuraViewExtension.h"
#include "SceneViewExtension.h"
#include "VulkanRealmDevice.h"

class FVulkanRealmRendererModule : public IModuleInterface
{
public:
	virtual void StartupModule() override
	{
		PostEngineInitHandle = FCoreDelegates::OnPostEngineInit.AddLambda([this]()
		{
			Extension = FSceneViewExtensions::NewExtension<FRealmAuraViewExtension>();
			FVulkanRealmDevice::Probe();
		});
	}

	virtual void ShutdownModule() override
	{
		FCoreDelegates::OnPostEngineInit.Remove(PostEngineInitHandle);
		Extension.Reset();
	}

private:
	FDelegateHandle PostEngineInitHandle;
	TSharedPtr<FRealmAuraViewExtension, ESPMode::ThreadSafe> Extension;
};

IMPLEMENT_MODULE(FVulkanRealmRendererModule, VulkanRealmRenderer)
