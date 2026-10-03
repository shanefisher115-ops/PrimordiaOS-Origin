#include \"PrimordiaConsoleWidget.h\"
#include \"LevelEditor.h\"

static void RegisterPrimordiaConsoleTab() {
  FGlobalTabmanager::Get()->RegisterNomadTabSpawner(
    \"PrimordiaConsole\",
    FOnSpawnTab::CreateLambda([](const FSpawnTabArgs& Args){
      return SNew(SDockTab).TabRole(ETabRole::NomadTab)[
        SNew(SPrimordiaConsoleWidget)
      ];
    })
  );
}