#pragma once

#include "CoreMinimal.h"
#include "Containers/Queue.h"
#include "HAL/ThreadSafeCounter.h"
#include "PrimordiaTypes.h"

class IWebSocket;

/**
 * Reconnecting WebSocket client. Socket callbacks may fire on any thread, so
 * they only enqueue events; Tick() (game thread) drains them, which keeps all
 * state changes and user callbacks on the game thread.
 */
class PRIMORDIAOSREALMBRIDGE_API FPrimordiaWebSocketClient : public TSharedFromThis<FPrimordiaWebSocketClient>
{
public:
	FPrimordiaWebSocketClient(float InInitialBackoff, float InMaxBackoff);
	~FPrimordiaWebSocketClient();

	void Connect(const FString& InUrl);
	void Disconnect();
	bool Send(const FString& Text);

	/** Processes socket events and reconnect timers. Game thread only. */
	void Tick(double Now);

	/** Pops one received text message. Game thread only. */
	bool PopMessage(FString& Out);
	int32 NumPendingMessages() const { return PendingMessages.GetValue(); }

	EPrimordiaConnectionState GetState() const { return State; }
	const FString& GetUrl() const { return Url; }

	TFunction<void()> OnConnected;
	TFunction<void(const FString& /*Reason*/)> OnDisconnected;

private:
	enum class EEventKind : uint8 { Connected, Error, Closed };
	struct FEvent
	{
		EEventKind Kind;
		FString Text;
	};

	void OpenSocket();
	void CloseSocket();
	void ScheduleReconnect(double Now, const FString& Reason);

	TSharedPtr<IWebSocket> Socket;
	TQueue<FEvent, EQueueMode::Mpsc> Events;
	TQueue<FString, EQueueMode::Mpsc> Messages;
	FThreadSafeCounter PendingMessages;

	FString Url;
	EPrimordiaConnectionState State = EPrimordiaConnectionState::Disconnected;
	bool bWantConnected = false;
	double ReconnectAt = 0.0;
	float InitialBackoff;
	float MaxBackoff;
	float Backoff;
	/** Bumped whenever a socket is replaced so late callbacks from the old one are ignored. */
	TSharedRef<FThreadSafeCounter> Generation = MakeShared<FThreadSafeCounter>();
};
