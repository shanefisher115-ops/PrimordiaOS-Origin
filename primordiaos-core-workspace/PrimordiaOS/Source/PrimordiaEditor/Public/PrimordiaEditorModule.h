#pragma once
#include \"Modules/ModuleManager.h\"

class FPrimordiaEditorModule : public IModuleInterface {
public:
    virtual void StartupModule() override;
    virtual void ShutdownModule() override;
};