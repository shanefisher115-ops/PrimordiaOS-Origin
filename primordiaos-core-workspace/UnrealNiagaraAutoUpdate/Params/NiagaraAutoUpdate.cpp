#include \"NiagaraAutoUpdate.h\"

void FNiagaraAutoUpdate::Update(UNiagaraComponent* Comp, const FString& EventName) {
  if (EventName == \"SpawnPulse\") {
    Comp->SetVariableFloat(TEXT(\"Glow\"), 1.0f);
  }
  if (EventName == \"SpawnNebula\") {
    Comp->SetVariableFloat(TEXT(\"Glow\"), 0.4f);
  }
}