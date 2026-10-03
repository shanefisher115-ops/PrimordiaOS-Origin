#pragma once
#include \"CoreMinimal.h\"
#include \"NiagaraComponent.h\"

class FNiagaraAutoUpdate {
public:
  static void Update(UNiagaraComponent* Comp, const FString& EventName);
};