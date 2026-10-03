#include \"PrimordiaEditorCommands.h\"

FPrimordiaEditorCommands::FPrimordiaEditorCommands()
  : TCommands<FPrimordiaEditorCommands>(
      TEXT(\"PrimordiaEditor\"),
      NSLOCTEXT(\"Contexts\", \"PrimordiaEditor\", \"Primordia Editor\"),
      NAME_None,
      TEXT(\"EditorStyle\")
    ) {}

void FPrimordiaEditorCommands::RegisterCommands() {
  UI_COMMAND(OpenPrimordiaConsole, \"Primordia Console\", \"Open Primordia Console\", EUserInterfaceActionType::Button, FInputChord());
}