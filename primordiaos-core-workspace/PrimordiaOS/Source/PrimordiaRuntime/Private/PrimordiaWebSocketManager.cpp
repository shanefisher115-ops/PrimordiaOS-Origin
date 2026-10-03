#include \"PrimordiaWebSocketManager.h\"
#include \"WebSocketsModule.h\"
#include \"Json.h\"
#include \"JsonUtilities.h\"
#include \"PrimordiaEventRouter.h\"

TSharedPtr<IWebSocket> FPrimordiaWebSocketManager::Socket = nullptr;

void FPrimordiaWebSocketManager::Init() {
    if (!FModuleManager::Get().IsModuleLoaded(\"WebSockets\")) {
        FModuleManager::Get().LoadModule(\"WebSockets\");
    }

    Socket = FWebSocketsModule::Get().CreateWebSocket(TEXT(\"ws://127.0.0.1:8080\"));

    Socket->OnConnected().AddStatic(&FPrimordiaWebSocketManager::OnConnected);
    Socket->OnConnectionError().AddStatic(&FPrimordiaWebSocketManager::OnConnectionError);
    Socket->OnClosed().AddStatic(&FPrimordiaWebSocketManager::OnClosed);
    Socket->OnMessage().AddStatic(&FPrimordiaWebSocketManager::OnMessage);

    Socket->Connect();
}

void FPrimordiaWebSocketManager::Shutdown() {
    if (Socket.IsValid()) {
        Socket->Close();
        Socket.Reset();
    }
}

void FPrimordiaWebSocketManager::OnConnected() {
    UE_LOG(LogTemp, Log, TEXT(\"PrimordiaOS WS Connected\"));
}

void FPrimordiaWebSocketManager::OnConnectionError(const FString& Error) {
    UE_LOG(LogTemp, Error, TEXT(\"PrimordiaOS WS Error: %s\"), *Error);
}

void FPrimordiaWebSocketManager::OnClosed(int64 StatusCode, const FString& Reason, bool bWasClean) {
    UE_LOG(LogTemp, Warning, TEXT(\"PrimordiaOS WS Closed: %s\"), *Reason);
}

void FPrimordiaWebSocketManager::OnMessage(const FString& Message) {
    TSharedPtr<FJsonObject> Root;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Message);

    if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid()) {
        UE_LOG(LogTemp, Warning, TEXT(\"PrimordiaOS WS Invalid JSON\"));
        return;
    }

    FString Type = Root->GetStringField(\"type\");
    TSharedPtr<FJsonObject> Payload = Root->GetObjectField(\"payload\");

    FPrimordiaEventRouter::RouteEvent(Type, Payload);
}