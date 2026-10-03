#include \"NiagaraComponent.h\"

void UpdateNebulaFX(UNiagaraComponent* Comp) {
  Comp->SetVariableFloat(TEXT(\"Glow\"), 0.4f);
}