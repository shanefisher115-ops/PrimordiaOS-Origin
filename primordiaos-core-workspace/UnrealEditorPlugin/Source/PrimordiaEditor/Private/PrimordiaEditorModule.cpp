#include \"PrimordiaEditorModule.h\"
#include \"PrimordiaEditorCommands.h\"

IMPLEMENT_MODULE(FPrimordiaEditorModule, PrimordiaEditor)

void FPrimordiaEditorModule::StartupModule() {
  FPrimordiaEditorCommands::Register();
}

void FPrimordiaEditorModule::ShutdownModule() {}