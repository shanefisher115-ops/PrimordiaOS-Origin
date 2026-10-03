#include \"BP_PrimordiaNode.h\"
#include \"NiagaraSpawner.h\"

void UBP_PrimordiaNode::TriggerPrimordiaEvent(const FString& EventName) {
  UWorld* World = GEngine->GetWorldContexts()[0].World();
  UNiagaraSpawner::SpawnFX(World, EventName, FVector(0,0,0));
}