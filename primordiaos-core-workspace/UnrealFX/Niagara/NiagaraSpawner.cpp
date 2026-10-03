#include \"NiagaraSpawner.h\"

void UNiagaraSpawner::SpawnFX(UWorld* World, FString FXName, FVector Location) {
  UNiagaraSystem* System = LoadObject<UNiagaraSystem>(nullptr, *FString::Printf(TEXT(\"/Game/FX/%s.%s\"), *FXName, *FXName));
  if (System) {
    UNiagaraFunctionLibrary::SpawnSystemAtLocation(World, System, Location);
  }
}