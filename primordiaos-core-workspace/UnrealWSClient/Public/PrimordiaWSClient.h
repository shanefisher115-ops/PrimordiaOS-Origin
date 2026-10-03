#pragma once
#include \"CoreMinimal.h\"
#include \"WebSocketsModule.h\"
#include \"IWebSocket.h\"

class FPrimordiaWSClient {
public:
  void Connect();
  void Send(const FString& Msg);
  TSharedPtr<IWebSocket> Socket;
};