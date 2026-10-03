#include \"NiagaraParamBinder.h\"

void FNiagaraParamBinder::Bind(UNiagaraComponent* Comp, const FString& EventName) {
  if (EventName == \"SpawnPulse\") {
    Comp->SetVariableFloat(TEXT(\"Intensity\"), 1.0f);
    Comp->SetVariableLinearColor(TEXT(\"Color\"), FLinearColor::Blue);
  }
  if (EventName == \"SpawnNebula\") {
    Comp->SetVariableFloat(TEXT(\"Density\"), 0.8f);
    Comp->SetVariableLinearColor(TEXT(\"Color\"), FLinearColor::Purple);
  }
}