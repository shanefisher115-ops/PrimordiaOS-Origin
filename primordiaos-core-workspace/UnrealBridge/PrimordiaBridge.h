#pragma once
#include 'CoreMinimal.h'
#include 'GameFramework/Actor.h'
#include 'PrimordiaBridge.generated.h'
UCLASS()
class APrimordiaBridge : public AActor {
  GENERATED_BODY()
public:
  void OnMessage(const FString& Msg);
};