#pragma once

#include "CoreMinimal.h"
#include "Subsystems/EngineSubsystem.h"
#include "PrimordiaWorldSubsystem.generated.h"

UCLASS()
class PRIMORDIACORE_API UPrimordiaWorldSubsystem : public UEngineSubsystem
{
    GENERATED_BODY()

public:

    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    UFUNCTION(BlueprintCallable, Category="Primordia")
    void SpawnPrimordiaActor();

    UFUNCTION(BlueprintCallable, Category="Primordia")
    void SendMessageToBridge(const FString& Message);
};
