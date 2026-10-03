#include \"PrimordiaWSClient.h\"

void FPrimordiaWSClient::Connect() {
  FWebSocketsModule::Get().StartupModule();
  Socket = FWebSocketsModule::Get().CreateWebSocket(TEXT(\"ws://localhost:8080\"));
  Socket->OnMessage().AddLambda([](const FString& Msg){
    UE_LOG(LogTemp, Warning, TEXT(\"WS Message: %s\"), *Msg);
  });
  Socket->Connect();
}

void FPrimordiaWSClient::Send(const FString& Msg) {
  if (Socket.IsValid()) Socket->Send(Msg);
}