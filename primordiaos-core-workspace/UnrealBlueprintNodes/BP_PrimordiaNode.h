#pragma once
#include \"Kismet/BlueprintFunctionLibrary.h\"
#include \"BP_PrimordiaNode.generated.h\"

UCLASS()
class UBP_PrimordiaNode : public UBlueprintFunctionLibrary {
  GENERATED_BODY()
public:
  UFUNCTION(BlueprintCallable, Category=\"Primordia\")
  static void TriggerPrimordiaEvent(const FString& EventName);
};