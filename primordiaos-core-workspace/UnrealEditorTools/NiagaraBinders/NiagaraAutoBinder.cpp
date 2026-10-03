#include \"NiagaraAutoBinder.h\"

void UNiagaraAutoBinder::BindParameters(UNiagaraComponent* Comp) {
  Comp->SetVariableFloat(TEXT(\"Intensity\"), 1.0f);
  Comp->SetVariableLinearColor(TEXT(\"Color\"), FLinearColor::Blue);
}