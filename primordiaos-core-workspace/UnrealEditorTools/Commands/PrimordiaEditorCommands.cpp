#include \"PrimordiaEditorCommands.h\"

FPrimordiaEditorCommands::FPrimordiaEditorCommands()
  : TCommands<FPrimordiaEditorCommands>(
      TEXT(\"PrimordiaEditor\"),
      NSLOCTEXT(\"Contexts\", \"PrimordiaEditor\", \"Primordia Editor\"),
      NAME_None,
      TEXT(\"EditorStyle\")
    ) {}

void FPrimordiaEditorCommands::RegisterCommands() {
  UI_COMMAND(OpenFXPreview, \"FX Preview\", \"Open FX Preview\", EUserInterfaceActionType::Button, FInputChord());
}