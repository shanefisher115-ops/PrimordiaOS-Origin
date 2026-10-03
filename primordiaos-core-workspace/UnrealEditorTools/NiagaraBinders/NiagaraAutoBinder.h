#pragma once
#include \"CoreMinimal.h\"
#include \"NiagaraComponent.h\"
#include \"NiagaraAutoBinder.generated.h\"

UCLASS()
class UNiagaraAutoBinder : public UObject {
  GENERATED_BODY()
public:
  static void BindParameters(UNiagaraComponent* Comp);
};