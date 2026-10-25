#include "Interfaces/IPluginManager.h"
#include "Misc/Paths.h"
#include "Modules/ModuleManager.h"
#include "ShaderCore.h"

class FPrimordiaOSRealmBridgeShadersModule : public IModuleInterface
{
public:
	virtual void StartupModule() override
	{
		const TSharedPtr<IPlugin> Plugin = IPluginManager::Get().FindPlugin(TEXT("PrimordiaOSRealmBridge"));
		if (Plugin.IsValid())
		{
			AddShaderSourceDirectoryMapping(TEXT("/Plugin/PrimordiaOSRealmBridge"), FPaths::Combine(Plugin->GetBaseDir(), TEXT("Shaders")));
		}
	}
};

IMPLEMENT_MODULE(FPrimordiaOSRealmBridgeShadersModule, PrimordiaOSRealmBridgeShaders)
