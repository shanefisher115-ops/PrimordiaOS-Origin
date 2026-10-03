#pragma once
#include \"CoreMinimal.h\"
#include \"NiagaraFunctionLibrary.h\"
#include \"NiagaraSpawner.generated.h\"

UCLASS()
class UNREAL_API UNiagaraSpawner : public UObject {
  GENERATED_BODY()
public:
  static void SpawnFX(UWorld* World, FString FXName, FVector Location);
};