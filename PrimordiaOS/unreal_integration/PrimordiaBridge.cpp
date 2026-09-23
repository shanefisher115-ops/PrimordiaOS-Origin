#include "PrimordiaBridge.h"
#include "Json.h"
#include "JsonUtilities.h"
#include "WebSocketsModule.h"
#include "IWebSocket.h"

APrimordiaBridge::APrimordiaBridge()
{
    PrimaryActorTick.bCanEverTick = false;
    Socket = nullptr;
}

void APrimordiaBridge::BeginPlay()
{
    Super::BeginPlay();
    ConnectWebSocket();
}

void APrimordiaBridge::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    CloseWebSocket();
    Super::EndPlay(EndPlayReason);
}

void APrimordiaBridge::ConnectWebSocket()
{
    if (!FModuleManager::Get().IsModuleLoaded("WebSockets"))
    {
        FModuleManager::LoadModuleChecked<FWebSocketsModule>("WebSockets");
    }

    FString Url = TEXT("ws://localhost:8081");
    Socket = FWebSocketsModule::Get().CreateWebSocket(Url);

    Socket->OnConnected().AddLambda([]()
    {
        UE_LOG(LogTemp, Log, TEXT("[PrimordiaBridge] Connected to PrimordiaOS."));
    });

    Socket->OnConnectionError().AddLambda([](const FString& Error)
    {
        UE_LOG(LogTemp, Error, TEXT("[PrimordiaBridge] Connection error: %s"), *Error);
    });

    Socket->OnClosed().AddLambda([](int32 StatusCode, const FString& Reason, bool bWasClean)
    {
        UE_LOG(LogTemp, Log, TEXT("[PrimordiaBridge] Closed: %s"), *Reason);
    });

    Socket->OnMessage().AddLambda([this](const FString& Message)
    {
        HandleMessage(Message);
    });

    Socket->Connect();
}

void APrimordiaBridge::CloseWebSocket()
{
    if (Socket)
    {
        Socket->Close();
        Socket = nullptr;
    }
}

void APrimordiaBridge::HandleMessage(const FString& Message)
{
    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Message);

    if (!FJsonSerializer::Deserialize(Reader, JsonObject) || !JsonObject.IsValid())
    {
        UE_LOG(LogTemp, Warning, TEXT("[PrimordiaBridge] Invalid JSON from PrimordiaOS."));
        return;
    }

    const FString Type = JsonObject->GetStringField(TEXT("type"));

    if (Type == TEXT("primordia_command"))
    {
        const FString Command = JsonObject->GetStringField(TEXT("command"));
        TSharedPtr<FJsonObject> Payload = JsonObject->GetObjectField(TEXT("payload"));

        if (Command == TEXT("reactor_pulse"))
        {
            const float Intensity = Payload->GetNumberField(TEXT("intensity"));
            const float Energy = Payload->GetNumberField(TEXT("energy"));
            const FString State = Payload->GetStringField(TEXT("state"));
            Primordia_ReactorPulse(Intensity, Energy, State);
        }
        else if (Command == TEXT("ascension_begin"))
        {
            Primordia_AscensionBegin();
        }
        else if (Command == TEXT("ascension_end"))
        {
            Primordia_AscensionEnd();
        }
    }
    else if (Type == TEXT("primordia_telemetry"))
    {
        TSharedPtr<FJsonObject> Metrics = JsonObject->GetObjectField(TEXT("metrics"));
        const float ReactorCharge = Metrics->GetNumberField(TEXT("reactor_charge"));
        const float GlyphStability = Metrics->GetNumberField(TEXT("glyph_stability"));
        const float StormIntensity = Metrics->GetNumberField(TEXT("storm_intensity"));

        Primordia_TelemetryUpdate(ReactorCharge, GlyphStability, StormIntensity);
    }
}
