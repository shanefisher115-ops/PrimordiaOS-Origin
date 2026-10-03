#include \"FXDispatcher.h\"
#include \"NiagaraSpawner.h\"

void UFXDispatcher::Dispatch(const FString& FXName) {
  UNiagaraSpawner::SpawnFX(GWorld, FXName, FVector(0,0,0));
}