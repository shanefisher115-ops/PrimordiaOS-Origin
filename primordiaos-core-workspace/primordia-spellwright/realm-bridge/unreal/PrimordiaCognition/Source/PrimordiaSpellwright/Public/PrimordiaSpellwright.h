#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleInterface.h"

PRIMORDIASPELLWRIGHT_API DECLARE_LOG_CATEGORY_EXTERN(LogSpellwright, Log, All);

class FPrimordiaSpellwrightModule : public IModuleInterface
{
public:
	virtual void StartupModule() override;
	virtual void ShutdownModule() override {}
};
