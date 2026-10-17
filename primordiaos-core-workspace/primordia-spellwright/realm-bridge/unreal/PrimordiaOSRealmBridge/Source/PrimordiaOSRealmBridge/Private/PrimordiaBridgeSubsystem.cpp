#include "PrimordiaBridgeSubsystem.h"
#include "PrimordiaActorFactory.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaJson.h"
#include "PrimordiaPayload.h"
#include "PrimordiaRealmGenerator.h"
#include "PrimordiaWebSocketClient.h"
#include "Actors/RealmRootActor.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "HAL/IConsoleManager.h"
#include "Misc/EngineVersion.h"

UPrimordiaBridgeSubsystem* UPrimordiaBridgeSubsystem::Get(const UObject* WorldContextObject)
{
	UWorld* World = GEngine ? GEngine->GetWorldFromContextObject(WorldContextObject, EGetWorldErrorMode::ReturnNull) : nullptr;
	return World ? World->GetSubsystem<UPrimordiaBridgeSubsystem>() : nullptr;
}

bool UPrimordiaBridgeSubsystem::DoesSupportWorldType(const EWorldType::Type WorldType) const
{
	return WorldType == EWorldType::Game || WorldType == EWorldType::PIE
		|| (WorldType == EWorldType::Editor && UPrimordiaBridgeSettings::Get()->bRunInEditorWorld);
}

void UPrimordiaBridgeSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	Factory = NewObject<UPrimordiaActorFactory>(this, TEXT("PrimordiaActorFactory"));
	Factory->Initialize(GetWorld());
	Generator = NewObject<UPrimordiaRealmGenerator>(this, TEXT("PrimordiaRealmGenerator"));
	Generator->SetFactory(Factory);

	Factory->OnEntitySpawned.AddWeakLambda(this, [this](const FString& Key, AActor* Actor) { OnEntitySpawned.Broadcast(Key, Actor); });
	Factory->OnEntityRetired.AddWeakLambda(this, [this](const FString& Key, AActor* Actor) { OnEntityRetired.Broadcast(Key, Actor); });
}

void UPrimordiaBridgeSubsystem::Deinitialize()
{
	if (Client.IsValid())
	{
		Client->OnConnected = nullptr;
		Client->OnDisconnected = nullptr;
		Client->Disconnect();
		Client.Reset();
	}
	Super::Deinitialize();
}

void UPrimordiaBridgeSubsystem::OnWorldBeginPlay(UWorld& InWorld)
{
	Super::OnWorldBeginPlay(InWorld);
	if (UPrimordiaBridgeSettings::Get()->bAutoConnect)
	{
		Connect();
	}
}

TStatId UPrimordiaBridgeSubsystem::GetStatId() const
{
	RETURN_QUICK_DECLARE_CYCLE_STAT(UPrimordiaBridgeSubsystem, STATGROUP_Tickables);
}

void UPrimordiaBridgeSubsystem::Connect(const FString& Url)
{
	const UPrimordiaBridgeSettings* Settings = UPrimordiaBridgeSettings::Get();
	if (!Client.IsValid())
	{
		Client = MakeShared<FPrimordiaWebSocketClient>(Settings->ReconnectInitialDelay, Settings->ReconnectMaxDelay);
		// Raw `this` is safe: the client is owned by this subsystem and only
		// invokes callbacks from inside Client->Tick(), which we call.
		Client->OnConnected = [this]() { HandleConnected(); };
		Client->OnDisconnected = [this](const FString& Reason) { HandleDisconnected(Reason); };
	}
	Client->Connect(Url.IsEmpty() ? Settings->ServerUrl : Url);
}

void UPrimordiaBridgeSubsystem::Disconnect()
{
	if (Client.IsValid())
	{
		Client->Disconnect();
	}
}

bool UPrimordiaBridgeSubsystem::IsConnected() const
{
	return GetConnectionState() == EPrimordiaConnectionState::Connected;
}

EPrimordiaConnectionState UPrimordiaBridgeSubsystem::GetConnectionState() const
{
	return Client.IsValid() ? Client->GetState() : EPrimordiaConnectionState::Disconnected;
}

bool UPrimordiaBridgeSubsystem::SendJson(const FString& Json)
{
	return Client.IsValid() && Client->Send(Json);
}

bool UPrimordiaBridgeSubsystem::SendCommand(const FString& Name, const FString& ArgsJson)
{
	const TSharedRef<FJsonObject> Msg = MakeShared<FJsonObject>();
	Msg->SetStringField(TEXT("type"), TEXT("command"));
	Msg->SetStringField(TEXT("name"), Name);
	const TSharedPtr<FJsonObject> Args = PrimordiaJson::Parse(ArgsJson.IsEmpty() ? TEXT("{}") : ArgsJson);
	if (!Args.IsValid())
	{
		UE_LOG(LogPrimordia, Warning, TEXT("SendCommand(%s): ArgsJson is not a JSON object"), *Name);
		return false;
	}
	Msg->SetObjectField(TEXT("args"), Args);
	return SendJson(PrimordiaJson::ToString(Msg));
}

bool UPrimordiaBridgeSubsystem::RequestManifest()
{
	return SendJson(TEXT("{\"type\":\"request_manifest\"}"));
}

bool UPrimordiaBridgeSubsystem::SetStreamRate(int32 Hz)
{
	return SendJson(FString::Printf(TEXT("{\"type\":\"set_rate\",\"hz\":%d}"), FMath::Clamp(Hz, 1, 60)));
}

bool UPrimordiaBridgeSubsystem::Subscribe(const TArray<FString>& Streams)
{
	const TSharedRef<FJsonObject> Msg = MakeShared<FJsonObject>();
	Msg->SetStringField(TEXT("type"), TEXT("subscribe"));
	TArray<TSharedPtr<FJsonValue>> Values;
	for (const FString& S : Streams)
	{
		Values.Add(MakeShared<FJsonValueString>(S));
	}
	Msg->SetArrayField(TEXT("streams"), Values);
	return SendJson(PrimordiaJson::ToString(Msg));
}

bool UPrimordiaBridgeSubsystem::InjectPacketJson(const FString& PacketJson)
{
	Injected.Add(PacketJson);
	return true;
}

void UPrimordiaBridgeSubsystem::SendHello()
{
	const UPrimordiaBridgeSettings* Settings = UPrimordiaBridgeSettings::Get();
	const TSharedRef<FJsonObject> Msg = MakeShared<FJsonObject>();
	Msg->SetStringField(TEXT("type"), TEXT("hello"));
	Msg->SetStringField(TEXT("client"), TEXT("UnrealEngine"));
	Msg->SetStringField(TEXT("version"), TEXT("1.0.0"));
	Msg->SetStringField(TEXT("engine"), FEngineVersion::Current().ToString());
	Msg->SetNumberField(TEXT("hz"), Settings->RequestedRateHz);
	if (Settings->SubscribedStreams.Num() > 0)
	{
		TArray<TSharedPtr<FJsonValue>> Values;
		for (const FString& S : Settings->SubscribedStreams)
		{
			Values.Add(MakeShared<FJsonValueString>(S));
		}
		Msg->SetArrayField(TEXT("streams"), Values);
	}
	SendJson(PrimordiaJson::ToString(Msg));
}

void UPrimordiaBridgeSubsystem::HandleConnected()
{
	SendHello();
	OnConnectedNative.Broadcast();
	OnConnected.Broadcast();
}

void UPrimordiaBridgeSubsystem::HandleDisconnected(const FString& Reason)
{
	OnDisconnectedNative.Broadcast(Reason);
	OnDisconnected.Broadcast(Reason);
}

void UPrimordiaBridgeSubsystem::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);
	const double Now = FPlatformTime::Seconds();

	if (Client.IsValid())
	{
		Client->Tick(Now);
	}
	ProcessInbound();

	// Only time entities out while the link is up: on disconnect the realm freezes in place.
	if (IsConnected())
	{
		Factory->CollectStale(Now, UPrimordiaBridgeSettings::Get()->EntityTimeoutSeconds);
	}
	Stats.LiveEntities = Factory->Num();
	Stats.QueuedMessages = Client.IsValid() ? Client->NumPendingMessages() : 0;
}

void UPrimordiaBridgeSubsystem::ProcessInbound()
{
	const UPrimordiaBridgeSettings* Settings = UPrimordiaBridgeSettings::Get();
	TArray<FPrimordiaPacket> Batch;

	auto Ingest = [this, &Batch](const FString& Text)
	{
		++Stats.MessagesReceived;
		FPrimordiaPacket Packet;
		FString Error;
		if (!FPrimordiaPacket::Parse(Text, Packet, Error))
		{
			++Stats.ParseErrors;
			if (Stats.ParseErrors <= 10 || Stats.ParseErrors % 500 == 0)
			{
				UE_LOG(LogPrimordia, Warning, TEXT("Dropped PrimordiaOS message (%lld parse errors so far): %s"), Stats.ParseErrors, *Error);
			}
			return;
		}
		Batch.Add(MoveTemp(Packet));
	};

	for (const FString& Text : Injected)
	{
		Ingest(Text);
	}
	Injected.Reset();

	if (Client.IsValid())
	{
		FString Message;
		for (int32 Count = 0; Count < Settings->MaxMessagesPerFrame && Client->PopMessage(Message); ++Count)
		{
			Ingest(Message);
		}
	}
	if (Batch.IsEmpty())
	{
		return;
	}

	// Coalesce: of several upserts for the same entity this frame only the
	// newest is applied. cosmic_web edge lists are carried forward so a
	// superseded keyframe never loses its topology.
	TBitArray<> Skip(false, Batch.Num());
	if (Settings->bCoalesceContinuousStreams)
	{
		TMap<FString, int32> Latest;
		for (int32 i = 0; i < Batch.Num(); ++i)
		{
			FPrimordiaPacket& Packet = Batch[i];
			if (Packet.Op != EPrimordiaPacketOp::Upsert || !PrimordiaPacketType::IsCoalescible(Packet.Type))
			{
				continue;
			}
			const FString Key = Packet.EntityKey();
			if (const int32* Previous = Latest.Find(Key))
			{
				FPrimordiaPacket& Older = Batch[*Previous];
				if (Packet.Type == EPrimordiaPacketType::CosmicWeb && !Packet.Payload->HasField(TEXT("edges")) && Older.Payload->HasField(TEXT("edges")))
				{
					Packet.Payload->SetField(TEXT("edges"), Older.Payload->TryGetField(TEXT("edges")));
				}
				Skip[*Previous] = true;
				++Stats.PacketsCoalesced;
			}
			Latest.Add(Key, i);
		}
	}

	for (int32 i = 0; i < Batch.Num(); ++i)
	{
		if (!Skip[i])
		{
			Dispatch(Batch[i]);
		}
	}

	const FPrimordiaPacket& Newest = Batch.Last();
	Stats.LastSeq = Newest.Seq;
	if (Newest.TimestampMs > 0)
	{
		const double NowMs = (FDateTime::UtcNow() - FDateTime(1970, 1, 1)).GetTotalMilliseconds();
		Stats.LatencyMs = static_cast<float>(NowMs - static_cast<double>(Newest.TimestampMs));
	}
}

void UPrimordiaBridgeSubsystem::Dispatch(const FPrimordiaPacket& Packet)
{
	if (UPrimordiaBridgeSettings::Get()->bLogPackets)
	{
		UE_LOG(LogPrimordia, Log, TEXT("<- %s %s seq=%lld t=%.3f"), *Packet.EntityKey(), Packet.Op == EPrimordiaPacketOp::Retire ? TEXT("RETIRE") : TEXT(""), Packet.Seq, Packet.SimTime);
	}

	switch (Packet.Type)
	{
	case EPrimordiaPacketType::Hello:
		UE_LOG(LogPrimordia, Log, TEXT("PrimordiaOS %s says hello"), *PrimordiaJson::Str(Packet.Payload, TEXT("version"), TEXT("?")));
		break;
	case EPrimordiaPacketType::RealmManifest:
		HandleManifest(Packet);
		break;
	case EPrimordiaPacketType::Ack:
		if (!PrimordiaJson::Bool(Packet.Payload, TEXT("ok"), true))
		{
			UE_LOG(LogPrimordia, Warning, TEXT("PrimordiaOS rejected '%s': %s"), *PrimordiaJson::Str(Packet.Payload, TEXT("command")), *PrimordiaJson::Str(Packet.Payload, TEXT("error")));
		}
		break;
	case EPrimordiaPacketType::Pong:
		break;
	default:
		if (PrimordiaPacketType::IsVisual(Packet.Type))
		{
			Factory->Apply(Packet, ActiveRealm.Get());
		}
		break;
	}
	++Stats.PacketsApplied;

	if (OnPacket.IsBound())
	{
		OnPacket.Broadcast(FPrimordiaPacketInfo::From(Packet), UPrimordiaPayload::Wrap(this, Packet.Payload));
	}
}

void UPrimordiaBridgeSubsystem::HandleManifest(const FPrimordiaPacket& Packet)
{
	const UPrimordiaBridgeSettings* Settings = UPrimordiaBridgeSettings::Get();
	FPrimordiaRealmManifest Manifest;
	FString Error;
	if (!FPrimordiaRealmManifest::FromJson(Packet.Payload, Settings->UnitsPerMeter, Manifest, Error))
	{
		UE_LOG(LogPrimordia, Warning, TEXT("Rejected PRS-1 manifest %s: %s"), *Packet.EntityId, *Error);
		return;
	}
	ARealmRootActor* Realm = nullptr;
	if (Settings->bAutoSpawnRealmFromManifest)
	{
		Realm = SpawnOrUpdateRealm(Manifest, ActiveRealm.IsValid() ? ActiveRealm->GetActorTransform() : Settings->RealmSpawnTransform);
	}
	OnRealmManifest.Broadcast(Manifest, Realm);
}

ARealmRootActor* UPrimordiaBridgeSubsystem::SpawnOrUpdateRealm(const FPrimordiaRealmManifest& Manifest, const FTransform& Transform)
{
	UWorld* World = GetWorld();
	ARealmRootActor* Realm = ActiveRealm.Get();

	if (Realm && Realm->GetRealmId() != Manifest.RealmId)
	{
		// A different realm (reseed / load_manifest): tear the old one down entirely.
		UE_LOG(LogPrimordia, Log, TEXT("Realm changed %s -> %s"), *Realm->GetRealmId(), *Manifest.RealmId);
		Factory->DestroyAll();
		Realm->DestroyRealm();
		Realm = nullptr;
	}

	if (!Realm)
	{
		UClass* Class = UPrimordiaBridgeSettings::Get()->RealmRootClass.LoadSynchronous();
		if (!Class)
		{
			Class = ARealmRootActor::StaticClass();
		}
		FActorSpawnParameters Params;
		Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		if (World->WorldType == EWorldType::Editor)
		{
			Params.ObjectFlags |= RF_Transient;
		}
		Realm = World->SpawnActor<ARealmRootActor>(Class, Transform, Params);
		if (!Realm)
		{
			return nullptr;
		}
		ActiveRealm = Realm;

		// Entities that arrived before their realm join it now.
		for (AActor* Entity : Factory->GetAllEntities())
		{
			if (!Entity->GetAttachParentActor())
			{
				Entity->AttachToActor(Realm, FAttachmentTransformRules::KeepRelativeTransform);
			}
		}
	}

	Realm->SetGenerator(Generator);
	Realm->ApplyManifest(Manifest);
	return Realm;
}

FPrimordiaBridgeStats UPrimordiaBridgeSubsystem::GetStats() const
{
	return Stats;
}

// ---------------------------------------------------------------------------
// Console commands: Primordia.Connect [url], Primordia.Disconnect,
// Primordia.Stats, Primordia.Evolve, Primordia.Perturb <key> <value>,
// Primordia.Reseed <seed>
// ---------------------------------------------------------------------------

namespace
{
	UPrimordiaBridgeSubsystem* BridgeFor(UWorld* World)
	{
		UPrimordiaBridgeSubsystem* Bridge = World ? World->GetSubsystem<UPrimordiaBridgeSubsystem>() : nullptr;
		if (!Bridge)
		{
			UE_LOG(LogPrimordia, Warning, TEXT("No PrimordiaOS bridge in this world (enable 'Run In Editor World' for editor worlds)."));
		}
		return Bridge;
	}

	FAutoConsoleCommandWithWorldAndArgs GConnectCmd(TEXT("Primordia.Connect"), TEXT("Connect to PrimordiaOS [url]"),
		FConsoleCommandWithWorldAndArgsDelegate::CreateLambda([](const TArray<FString>& Args, UWorld* World)
		{
			if (UPrimordiaBridgeSubsystem* Bridge = BridgeFor(World)) Bridge->Connect(Args.Num() > 0 ? Args[0] : FString());
		}));

	FAutoConsoleCommandWithWorldAndArgs GDisconnectCmd(TEXT("Primordia.Disconnect"), TEXT("Disconnect from PrimordiaOS"),
		FConsoleCommandWithWorldAndArgsDelegate::CreateLambda([](const TArray<FString>&, UWorld* World)
		{
			if (UPrimordiaBridgeSubsystem* Bridge = BridgeFor(World)) Bridge->Disconnect();
		}));

	FAutoConsoleCommandWithWorldAndArgs GStatsCmd(TEXT("Primordia.Stats"), TEXT("Print PrimordiaOS bridge statistics"),
		FConsoleCommandWithWorldAndArgsDelegate::CreateLambda([](const TArray<FString>&, UWorld* World)
		{
			if (UPrimordiaBridgeSubsystem* Bridge = BridgeFor(World))
			{
				const FPrimordiaBridgeStats S = Bridge->GetStats();
				UE_LOG(LogPrimordia, Display, TEXT("state=%s recv=%lld applied=%lld coalesced=%lld parseErrors=%lld lastSeq=%lld entities=%d queued=%d latency=%.1fms"),
					*UEnum::GetValueAsString(Bridge->GetConnectionState()), S.MessagesReceived, S.PacketsApplied, S.PacketsCoalesced, S.ParseErrors, S.LastSeq, S.LiveEntities, S.QueuedMessages, S.LatencyMs);
			}
		}));

	FAutoConsoleCommandWithWorldAndArgs GEvolveCmd(TEXT("Primordia.Evolve"), TEXT("Ask Worldforge to evolve the realm now"),
		FConsoleCommandWithWorldAndArgsDelegate::CreateLambda([](const TArray<FString>&, UWorld* World)
		{
			if (UPrimordiaBridgeSubsystem* Bridge = BridgeFor(World)) Bridge->SendCommand(TEXT("evolve_realm"));
		}));

	FAutoConsoleCommandWithWorldAndArgs GPerturbCmd(TEXT("Primordia.Perturb"), TEXT("Set a metaphysical scalar: Primordia.Perturb entropy 0.9"),
		FConsoleCommandWithWorldAndArgsDelegate::CreateLambda([](const TArray<FString>& Args, UWorld* World)
		{
			UPrimordiaBridgeSubsystem* Bridge = BridgeFor(World);
			if (Bridge && Args.Num() >= 2)
			{
				Bridge->SendCommand(TEXT("perturb"), FString::Printf(TEXT("{\"key\":\"%s\",\"value\":%f}"), *Args[0].ReplaceCharWithEscapedChar(), FCString::Atof(*Args[1])));
			}
		}));

	FAutoConsoleCommandWithWorldAndArgs GReseedCmd(TEXT("Primordia.Reseed"), TEXT("Regenerate the realm from a new seed: Primordia.Reseed 1234"),
		FConsoleCommandWithWorldAndArgsDelegate::CreateLambda([](const TArray<FString>& Args, UWorld* World)
		{
			UPrimordiaBridgeSubsystem* Bridge = BridgeFor(World);
			if (Bridge && Args.Num() >= 1)
			{
				Bridge->SendCommand(TEXT("reseed"), FString::Printf(TEXT("{\"seed\":%u}"), static_cast<uint32>(FCString::Strtoui64(*Args[0], nullptr, 0))));
			}
		}));
}
