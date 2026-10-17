#include "PrimordiaWebSocketClient.h"
#include "WebSocketsModule.h"
#include "IWebSocket.h"

FPrimordiaWebSocketClient::FPrimordiaWebSocketClient(float InInitialBackoff, float InMaxBackoff)
	: InitialBackoff(FMath::Max(0.1f, InInitialBackoff))
	, MaxBackoff(FMath::Max(InInitialBackoff, InMaxBackoff))
	, Backoff(InitialBackoff)
{
}

FPrimordiaWebSocketClient::~FPrimordiaWebSocketClient()
{
	bWantConnected = false;
	CloseSocket();
}

void FPrimordiaWebSocketClient::Connect(const FString& InUrl)
{
	Url = InUrl;
	bWantConnected = true;
	Backoff = InitialBackoff;
	CloseSocket();
	OpenSocket();
}

void FPrimordiaWebSocketClient::Disconnect()
{
	const bool bWasConnected = State == EPrimordiaConnectionState::Connected;
	bWantConnected = false;
	CloseSocket();
	State = EPrimordiaConnectionState::Disconnected;
	if (bWasConnected && OnDisconnected)
	{
		OnDisconnected(TEXT("client requested disconnect"));
	}
}

bool FPrimordiaWebSocketClient::Send(const FString& Text)
{
	if (State != EPrimordiaConnectionState::Connected || !Socket.IsValid())
	{
		return false;
	}
	Socket->Send(Text);
	return true;
}

void FPrimordiaWebSocketClient::OpenSocket()
{
	State = EPrimordiaConnectionState::Connecting;
	Socket = FWebSocketsModule::Get().CreateWebSocket(Url);

	// Callbacks capture the generation they belong to; once the socket is
	// replaced or closed their events are dropped.
	const int32 MyGeneration = Generation->GetValue();
	TSharedRef<FThreadSafeCounter> GenerationRef = Generation;
	TWeakPtr<FPrimordiaWebSocketClient> WeakSelf = AsShared();

	auto Enqueue = [WeakSelf, GenerationRef, MyGeneration](EEventKind Kind, const FString& Text)
	{
		if (GenerationRef->GetValue() != MyGeneration)
		{
			return;
		}
		if (TSharedPtr<FPrimordiaWebSocketClient> This = WeakSelf.Pin())
		{
			This->Events.Enqueue(FEvent{ Kind, Text });
		}
	};

	Socket->OnConnected().AddLambda([Enqueue]() { Enqueue(EEventKind::Connected, FString()); });
	Socket->OnConnectionError().AddLambda([Enqueue](const FString& Error) { Enqueue(EEventKind::Error, Error); });
	Socket->OnClosed().AddLambda([Enqueue](int32 StatusCode, const FString& Reason, bool bWasClean)
	{
		Enqueue(EEventKind::Closed, FString::Printf(TEXT("closed (%d%s) %s"), StatusCode, bWasClean ? TEXT(", clean") : TEXT(""), *Reason));
	});
	Socket->OnMessage().AddLambda([WeakSelf, GenerationRef, MyGeneration](const FString& Message)
	{
		if (GenerationRef->GetValue() != MyGeneration)
		{
			return;
		}
		if (TSharedPtr<FPrimordiaWebSocketClient> This = WeakSelf.Pin())
		{
			This->Messages.Enqueue(Message);
			This->PendingMessages.Increment();
		}
	});

	UE_LOG(LogPrimordia, Log, TEXT("Connecting to PrimordiaOS at %s"), *Url);
	Socket->Connect();
}

void FPrimordiaWebSocketClient::CloseSocket()
{
	Generation->Increment();
	if (Socket.IsValid())
	{
		Socket->OnConnected().Clear();
		Socket->OnConnectionError().Clear();
		Socket->OnClosed().Clear();
		Socket->OnMessage().Clear();
		if (Socket->IsConnected())
		{
			Socket->Close(1000, TEXT("PrimordiaOS bridge closing"));
		}
		Socket.Reset();
	}
	// Drop anything the old socket queued.
	Events.Empty();
	FString Discard;
	while (Messages.Dequeue(Discard))
	{
	}
	PendingMessages.Reset();
}

void FPrimordiaWebSocketClient::ScheduleReconnect(double Now, const FString& Reason)
{
	const bool bWasConnected = State == EPrimordiaConnectionState::Connected;
	CloseSocket();
	if (bWantConnected)
	{
		State = EPrimordiaConnectionState::WaitingToReconnect;
		ReconnectAt = Now + Backoff;
		UE_LOG(LogPrimordia, Warning, TEXT("PrimordiaOS link lost (%s); retrying in %.1fs"), *Reason, Backoff);
		Backoff = FMath::Min(Backoff * 2.f, MaxBackoff);
	}
	else
	{
		State = EPrimordiaConnectionState::Disconnected;
	}
	if (bWasConnected && OnDisconnected)
	{
		OnDisconnected(Reason);
	}
}

void FPrimordiaWebSocketClient::Tick(double Now)
{
	FEvent Event;
	while (Events.Dequeue(Event))
	{
		switch (Event.Kind)
		{
		case EEventKind::Connected:
			State = EPrimordiaConnectionState::Connected;
			Backoff = InitialBackoff;
			UE_LOG(LogPrimordia, Log, TEXT("Connected to PrimordiaOS at %s"), *Url);
			if (OnConnected)
			{
				OnConnected();
			}
			break;
		case EEventKind::Error:
		case EEventKind::Closed:
			ScheduleReconnect(Now, Event.Text);
			return; // queues were flushed with the socket
		}
	}

	if (State == EPrimordiaConnectionState::WaitingToReconnect && bWantConnected && Now >= ReconnectAt)
	{
		OpenSocket();
	}
}

bool FPrimordiaWebSocketClient::PopMessage(FString& Out)
{
	if (Messages.Dequeue(Out))
	{
		PendingMessages.Decrement();
		return true;
	}
	return false;
}
