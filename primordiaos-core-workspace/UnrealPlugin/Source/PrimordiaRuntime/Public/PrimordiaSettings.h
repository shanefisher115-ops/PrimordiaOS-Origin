#pragma once
#include \"CoreMinimal.h\"
#include \"UObject/NoExportTypes.h\"
#include \"PrimordiaSettings.generated.h\"

UCLASS(Config=Game)
class UPrimordiaSettings : public UObject {
  GENERATED_BODY()
public:
  UPROPERTY(Config, EditAnywhere)
  FString DefaultFX = \"PulseWave\";
};