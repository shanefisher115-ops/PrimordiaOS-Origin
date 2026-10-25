#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

PRIMORDIAOLLAMA_API DECLARE_LOG_CATEGORY_EXTERN(LogPrimordiaOllama, Log, All);

class FPrimordiaOllamaModule : public IModuleInterface
{
public:
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
};
