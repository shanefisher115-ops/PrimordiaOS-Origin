#pragma once
#include \"CoreMinimal.h\"
#include \"NiagaraComponent.h\"

class FNiagaraParamBinder {
public:
  static void Bind(UNiagaraComponent* Comp, const FString& EventName);
};