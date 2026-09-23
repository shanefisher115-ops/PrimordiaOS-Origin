#include "Modules/ModuleManager.h"
#include "CoreMinimal.h"

class FPrimordiaOSBridgeModule : public IModuleInterface
{
public:
    virtual void StartupModule() override
    {
        UE_LOG(LogTemp, Log, TEXT("[PrimordiaOSBridge] Module started."));
    }

    virtual void ShutdownModule() override
    {
        UE_LOG(LogTemp, Log, TEXT("[PrimordiaOSBridge] Module shutdown."));
    }
};

IMPLEMENT_MODULE(FPrimordiaOSBridgeModule, PrimordiaOSBridge);
