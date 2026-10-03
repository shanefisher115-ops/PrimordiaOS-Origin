#include \"PrimordiaEventRouter.h\"
#include \"NiagaraSpawner.h\"

void FPrimordiaEventRouter::Route(const FString& EventName) {
  if (EventName == \"SpawnPulse\") UNiagaraSpawner::SpawnFX(GWorld, TEXT(\"PulseWave\"), FVector(0,0,0));
  if (EventName == \"SpawnNebula\") UNiagaraSpawner::SpawnFX(GWorld, TEXT(\"NebulaField\"), FVector(0,0,0));
}