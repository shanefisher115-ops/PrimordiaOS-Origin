#include "PrimordiaBlueprintLibrary.h"
#include "PrimordiaActorFactory.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaBridgeSubsystem.h"
#include "PrimordiaJson.h"
#include "PrimordiaPayload.h"
#include "Actors/RealmRootActor.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "TimerManager.h"

UPrimordiaBridgeSubsystem* UPrimordiaBlueprintLibrary::GetPrimordiaBridge(const UObject* WorldContextObject)
{
	return UPrimordiaBridgeSubsystem::Get(WorldContextObject);
}

bool UPrimordiaBlueprintLibrary::ConnectToPrimordiaOS(const UObject* WorldContextObject, const FString& Url)
{
	if (UPrimordiaBridgeSubsystem* Bridge = GetPrimordiaBridge(WorldContextObject))
	{
		Bridge->Connect(Url);
		return true;
	}
	return false;
}

void UPrimordiaBlueprintLibrary::DisconnectFromPrimordiaOS(const UObject* WorldContextObject)
{
	if (UPrimordiaBridgeSubsystem* Bridge = GetPrimordiaBridge(WorldContextObject))
	{
		Bridge->Disconnect();
	}
}

bool UPrimordiaBlueprintLibrary::IsPrimordiaConnected(const UObject* WorldContextObject)
{
	const UPrimordiaBridgeSubsystem* Bridge = GetPrimordiaBridge(WorldContextObject);
	return Bridge && Bridge->IsConnected();
}

FPrimordiaBridgeStats UPrimordiaBlueprintLibrary::GetPrimordiaStats(const UObject* WorldContextObject)
{
	const UPrimordiaBridgeSubsystem* Bridge = GetPrimordiaBridge(WorldContextObject);
	return Bridge ? Bridge->GetStats() : FPrimordiaBridgeStats();
}

bool UPrimordiaBlueprintLibrary::SendPrimordiaCommand(const UObject* WorldContextObject, const FString& Command, const FString& ArgsJson)
{
	UPrimordiaBridgeSubsystem* Bridge = GetPrimordiaBridge(WorldContextObject);
	return Bridge && Bridge->SendCommand(Command, ArgsJson);
}

bool UPrimordiaBlueprintLibrary::PerturbMetaphysics(const UObject* WorldContextObject, FName Key, float Value)
{
	const TSharedRef<FJsonObject> Args = MakeShared<FJsonObject>();
	Args->SetStringField(TEXT("key"), Key.ToString());
	Args->SetNumberField(TEXT("value"), Value);
	return SendPrimordiaCommand(WorldContextObject, TEXT("perturb"), PrimordiaJson::ToString(Args));
}

bool UPrimordiaBlueprintLibrary::RequestRealmEvolution(const UObject* WorldContextObject)
{
	return SendPrimordiaCommand(WorldContextObject, TEXT("evolve_realm"), TEXT("{}"));
}

bool UPrimordiaBlueprintLibrary::ReseedRealm(const UObject* WorldContextObject, int64 Seed)
{
	return SendPrimordiaCommand(WorldContextObject, TEXT("reseed"), FString::Printf(TEXT("{\"seed\":%u}"), static_cast<uint32>(Seed)));
}

bool UPrimordiaBlueprintLibrary::ParseRealmManifest(const FString& Json, FPrimordiaRealmManifest& OutManifest, FString& OutError)
{
	return FPrimordiaRealmManifest::FromJsonString(Json, UPrimordiaBridgeSettings::Get()->UnitsPerMeter, OutManifest, OutError);
}

ARealmRootActor* UPrimordiaBlueprintLibrary::SpawnRealmFromManifest(const UObject* WorldContextObject, const FPrimordiaRealmManifest& Manifest, const FTransform& Transform)
{
	if (UPrimordiaBridgeSubsystem* Bridge = GetPrimordiaBridge(WorldContextObject))
	{
		return Bridge->SpawnOrUpdateRealm(Manifest, Transform);
	}
	// No bridge in this world (e.g. editor world with Run In Editor World off): standalone realm.
	UWorld* World = GEngine ? GEngine->GetWorldFromContextObject(WorldContextObject, EGetWorldErrorMode::LogAndReturnNull) : nullptr;
	if (!World)
	{
		return nullptr;
	}
	FActorSpawnParameters Params;
	Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	ARealmRootActor* Realm = World->SpawnActor<ARealmRootActor>(ARealmRootActor::StaticClass(), Transform, Params);
	if (Realm)
	{
		Realm->ApplyManifest(Manifest);
	}
	return Realm;
}

ARealmRootActor* UPrimordiaBlueprintLibrary::SpawnRealmFromManifestJson(const UObject* WorldContextObject, const FString& Json, const FTransform& Transform, FString& OutError)
{
	FPrimordiaRealmManifest Manifest;
	if (!ParseRealmManifest(Json, Manifest, OutError))
	{
		return nullptr;
	}
	return SpawnRealmFromManifest(WorldContextObject, Manifest, Transform);
}

ARealmRootActor* UPrimordiaBlueprintLibrary::SpawnRealmFromFile(const UObject* WorldContextObject, const FString& FilePath, const FTransform& Transform, FString& OutError)
{
	const FString Path = FPaths::IsRelative(FilePath) ? FPaths::Combine(FPaths::ProjectDir(), FilePath) : FilePath;
	FString Json;
	if (!FFileHelper::LoadFileToString(Json, *Path))
	{
		OutError = FString::Printf(TEXT("cannot read %s"), *Path);
		return nullptr;
	}
	return SpawnRealmFromManifestJson(WorldContextObject, Json, Transform, OutError);
}

ARealmRootActor* UPrimordiaBlueprintLibrary::GetActiveRealm(const UObject* WorldContextObject)
{
	const UPrimordiaBridgeSubsystem* Bridge = GetPrimordiaBridge(WorldContextObject);
	return Bridge ? Bridge->GetActiveRealm() : nullptr;
}

bool UPrimordiaBlueprintLibrary::ApplyPacketJson(const UObject* WorldContextObject, const FString& PacketJson)
{
	UPrimordiaBridgeSubsystem* Bridge = GetPrimordiaBridge(WorldContextObject);
	return Bridge && Bridge->InjectPacketJson(PacketJson);
}

bool UPrimordiaBlueprintLibrary::ApplyPayloadToActor(AActor* Actor, EPrimordiaPacketType Type, const FString& PayloadJson)
{
	const TSharedPtr<FJsonObject> Payload = PrimordiaJson::Parse(PayloadJson);
	if (!Actor || !Payload.IsValid())
	{
		return false;
	}
	FPrimordiaPacket Packet;
	Packet.Type = Type;
	Packet.TypeName = PrimordiaPacketType::ToString(Type);
	Packet.EntityId = Actor->GetName();
	// Direct drives always win the ordering guard.
	Packet.Seq = TNumericLimits<int64>::Max() / 2 + static_cast<int64>(FPlatformTime::Cycles64() & 0xffffffff);
	Packet.ReceivedAt = FPlatformTime::Seconds();
	Packet.Payload = Payload;
	return UPrimordiaActorFactory::Deliver(Actor, Packet);
}

AActor* UPrimordiaBlueprintLibrary::FindPrimordiaEntity(const UObject* WorldContextObject, EPrimordiaPacketType Type, const FString& EntityId)
{
	const UPrimordiaBridgeSubsystem* Bridge = GetPrimordiaBridge(WorldContextObject);
	return Bridge ? Bridge->GetFactory()->FindEntity(Type, EntityId) : nullptr;
}

TArray<AActor*> UPrimordiaBlueprintLibrary::GetAllPrimordiaEntities(const UObject* WorldContextObject)
{
	const UPrimordiaBridgeSubsystem* Bridge = GetPrimordiaBridge(WorldContextObject);
	return Bridge ? Bridge->GetFactory()->GetAllEntities() : TArray<AActor*>();
}

void UPrimordiaBlueprintLibrary::RegisterVisualizerClass(const UObject* WorldContextObject, EPrimordiaPacketType Type, TSubclassOf<AActor> Class)
{
	if (const UPrimordiaBridgeSubsystem* Bridge = GetPrimordiaBridge(WorldContextObject))
	{
		Bridge->GetFactory()->RegisterVisualizerClass(Type, Class);
	}
}

UPrimordiaPayload* UPrimordiaBlueprintLibrary::MakePayloadFromJson(const FString& Json)
{
	return UPrimordiaPayload::Wrap(nullptr, PrimordiaJson::Parse(Json));
}

FString UPrimordiaBlueprintLibrary::PacketTypeToString(EPrimordiaPacketType Type)
{
	return PrimordiaPacketType::ToString(Type);
}

FVector UPrimordiaBlueprintLibrary::PrimordiaToUnreal(FVector Meters)
{
	return Meters * UPrimordiaBridgeSettings::Get()->UnitsPerMeter;
}

// ---------------------------------------------------------------------------

UPrimordiaConnectAsyncAction* UPrimordiaConnectAsyncAction::ConnectToPrimordiaOSAsync(const UObject* WorldContextObject, const FString& Url, float TimeoutSeconds)
{
	UPrimordiaConnectAsyncAction* Action = NewObject<UPrimordiaConnectAsyncAction>();
	Action->Bridge = UPrimordiaBridgeSubsystem::Get(WorldContextObject);
	Action->Url = Url;
	Action->TimeoutSeconds = TimeoutSeconds;
	Action->RegisterWithGameInstance(WorldContextObject);
	return Action;
}

void UPrimordiaConnectAsyncAction::Activate()
{
	UPrimordiaBridgeSubsystem* Subsystem = Bridge.Get();
	if (!Subsystem)
	{
		Finish(false, TEXT("No PrimordiaOS bridge in this world"));
		return;
	}
	if (Subsystem->IsConnected() && Url.IsEmpty())
	{
		Finish(true, TEXT("Already connected"));
		return;
	}
	ConnectedHandle = Subsystem->OnConnectedNative.AddUObject(this, &UPrimordiaConnectAsyncAction::Finish, true, FString(TEXT("Connected")));
	if (TimeoutSeconds > 0.f)
	{
		Subsystem->GetWorld()->GetTimerManager().SetTimer(TimeoutHandle, FTimerDelegate::CreateUObject(this, &UPrimordiaConnectAsyncAction::Finish, false,
			FString::Printf(TEXT("Timed out after %.1fs (is the bridge running? node src/server.js)"), TimeoutSeconds)), TimeoutSeconds, false);
	}
	Subsystem->Connect(Url);
}

void UPrimordiaConnectAsyncAction::Finish(bool bSuccess, FString Message)
{
	if (bDone)
	{
		return;
	}
	bDone = true;
	if (UPrimordiaBridgeSubsystem* Subsystem = Bridge.Get())
	{
		Subsystem->OnConnectedNative.Remove(ConnectedHandle);
		if (UWorld* World = Subsystem->GetWorld())
		{
			World->GetTimerManager().ClearTimer(TimeoutHandle);
		}
	}
	(bSuccess ? OnConnected : OnFailed).Broadcast(Message);
	SetReadyToDestroy();
}
