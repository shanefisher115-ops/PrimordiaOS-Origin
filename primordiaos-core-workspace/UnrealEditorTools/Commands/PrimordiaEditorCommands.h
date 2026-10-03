#pragma once
#include \"Framework/Commands/Commands.h\"

class FPrimordiaEditorCommands : public TCommands<FPrimordiaEditorCommands> {
public:
  FPrimordiaEditorCommands();
  virtual void RegisterCommands() override;
};