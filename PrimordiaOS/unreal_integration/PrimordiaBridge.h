#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "PrimordiaBridge.generated.h"

UCLASS()
class APrimordiaBridge : public AActor
{
    GENERATED_BODY()

public:
    APrimordiaBridge();

protected:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

    UFUNCTION(BlueprintImplementableEvent, Category = "Primordia")
    void Primordia_ReactorPulse(float Intensity, float Energy, const FString& State);

    UFUNCTION(BlueprintImplementableEvent, Category = "Primordia")
    void Primordia_AscensionBegin();

    UFUNCTION(BlueprintImplementableEvent, Category = "Primordia")
    void Primordia_AscensionEnd();

    UFUNCTION(BlueprintImplementableEvent, Category = "Primordia")
    void Primordia_TelemetryUpdate(float ReactorCharge, float GlyphStability, float StormIntensity);

private:
    void ConnectWebSocket();
    void CloseWebSocket();
    void HandleMessage(const FString& Message);

    class IWebSocket* Socket;
};
