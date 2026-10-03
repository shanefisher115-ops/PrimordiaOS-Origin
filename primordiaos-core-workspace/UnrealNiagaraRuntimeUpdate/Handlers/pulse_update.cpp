#include \"NiagaraComponent.h\"

void UpdatePulseFX(UNiagaraComponent* Comp) {
  Comp->SetVariableFloat(TEXT(\"Glow\"), 1.0f);
}