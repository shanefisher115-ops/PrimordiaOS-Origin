#include \"PrimordiaRuntimeModule.h\"
#include \"Modules/ModuleManager.h\"

IMPLEMENT_MODULE(FPrimordiaRuntimeModule, PrimordiaRuntime)

void FPrimordiaRuntimeModule::StartupModule() {
    // TODO: Init WS bridge, event router, Niagara/camera/lighting hooks
}

void FPrimordiaRuntimeModule::ShutdownModule() {
}