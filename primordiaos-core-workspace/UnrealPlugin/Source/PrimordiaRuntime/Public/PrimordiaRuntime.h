#pragma once
#include \"Modules/ModuleManager.h\"

class FPrimordiaRuntimeModule : public IModuleInterface {
public:
  virtual void StartupModule() override;
  virtual void ShutdownModule() override;
};