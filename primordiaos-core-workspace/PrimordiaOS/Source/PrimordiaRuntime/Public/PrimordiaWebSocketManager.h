#pragma once

#include \"CoreMinimal.h\"
#include \"IWebSocket.h\"

class FPrimordiaWebSocketManager {
public:
    static void Init();
    static void Shutdown();

private:
    static TSharedPtr<IWebSocket> Socket;

    static void OnConnected();
    static void OnConnectionError(const FString& Error);
    static void OnClosed(int64 StatusCode, const FString& Reason, bool bWasClean);
    static void OnMessage(const FString& Message);
};