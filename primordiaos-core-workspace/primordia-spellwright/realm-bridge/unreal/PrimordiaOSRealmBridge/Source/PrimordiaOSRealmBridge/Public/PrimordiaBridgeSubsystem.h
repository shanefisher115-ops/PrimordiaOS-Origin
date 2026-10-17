#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "PrimordiaTypes.h"
#include "PrimordiaBridgeSubsystem.generated.h"

class FPrimordiaWebSocketClient;
class UPrimordiaActorFactory;
class UPrimordiaRealmGenerator;
class UPrimordiaPayload;
class ARealmRootActor;

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FPrimordiaConnectedEvent);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FPrimordiaDisconnectedEvent, const FString&, Reason);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FPrimordiaPacketEvent, const FPrimordiaPacketInfo&, Info, UPrimordiaPayload*, Payload);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FPrimordiaManifestEvent, const FPrimordiaRealmManifest&, Manifest, ARealmRootActor*, Realm);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FPrimordiaEntityEvent, const FString&, EntityKey, AActor*, Actor);

/**
 * One PrimordiaOS link per world. Owns the WebSocket client, the actor
 * factory and the realm generator, and runs the runtime update loop:
 *
 *   Tick: socket events -> drain inbound (budgeted) -> parse -> coalesce
 *         -> dispatch (manifests, upserts, retires) -> stale-entity GC
 */
UCLASS()
class PRIMORDIAOSREALMBRIDGE_API UPrimordiaBridgeSubsystem : public UTickableWorldSubsystem
{
	GENERATED_BODY()

public:
	static UPrimordiaBridgeSubsystem* Get(const UObject* WorldContextObject);

	// USubsystem / UWorldSubsystem
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;
	virtual void OnWorldBeginPlay(UWorld& InWorld) override;
	virtual bool DoesSupportWorldType(const EWorldType::Type WorldType) const override;

	// FTickableGameObject
	virtual void Tick(float DeltaTime) override;
	virtual TStatId GetStatId() const override;
	virtual bool IsTickableInEditor() const override { return true; }

	/** Connects (or reconnects) to PrimordiaOS. Empty Url = Project Settings ServerUrl. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge")
	void Connect(const FString& Url = TEXT(""));

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge")
	void Disconnect();

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Bridge")
	bool IsConnected() const;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Bridge")
	EPrimordiaConnectionState GetConnectionState() const;

	/** Sends raw JSON to the bridge. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge")
	bool SendJson(const FString& Json);

	/** {"type":"command","name":Name,"args":ArgsJson}. Commands: evolve_realm, reseed{seed}, perturb{key,value}, load_manifest{manifest}. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge")
	bool SendCommand(const FString& Name, const FString& ArgsJson = TEXT("{}"));

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge")
	bool RequestManifest();

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge")
	bool SetStreamRate(int32 Hz);

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge")
	bool Subscribe(const TArray<FString>& Streams);

	/** Feeds a packet through the full pipeline as if it came off the socket (replays, tests, offline). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge")
	bool InjectPacketJson(const FString& PacketJson);

	/** Generates (or updates) a realm from a manifest without a server. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm")
	ARealmRootActor* SpawnOrUpdateRealm(const FPrimordiaRealmManifest& Manifest, const FTransform& Transform);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Realm")
	ARealmRootActor* GetActiveRealm() const { return ActiveRealm.Get(); }

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Bridge")
	UPrimordiaActorFactory* GetFactory() const { return Factory; }

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Realm")
	UPrimordiaRealmGenerator* GetGenerator() const { return Generator; }

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Bridge")
	FPrimordiaBridgeStats GetStats() const;

	UPROPERTY(BlueprintAssignable, Category = "PrimordiaOS|Bridge") FPrimordiaConnectedEvent OnConnected;
	UPROPERTY(BlueprintAssignable, Category = "PrimordiaOS|Bridge") FPrimordiaDisconnectedEvent OnDisconnected;
	/** Every applied packet (allocates a payload view; bind only when needed). */
	UPROPERTY(BlueprintAssignable, Category = "PrimordiaOS|Bridge") FPrimordiaPacketEvent OnPacket;
	UPROPERTY(BlueprintAssignable, Category = "PrimordiaOS|Realm") FPrimordiaManifestEvent OnRealmManifest;
	UPROPERTY(BlueprintAssignable, Category = "PrimordiaOS|Bridge") FPrimordiaEntityEvent OnEntitySpawned;
	UPROPERTY(BlueprintAssignable, Category = "PrimordiaOS|Bridge") FPrimordiaEntityEvent OnEntityRetired;

	/** Native mirrors (used by async Blueprint actions). */
	FSimpleMulticastDelegate OnConnectedNative;
	TMulticastDelegate<void(const FString&)> OnDisconnectedNative;

private:
	void HandleConnected();
	void HandleDisconnected(const FString& Reason);
	void ProcessInbound();
	void Dispatch(const FPrimordiaPacket& Packet);
	void HandleManifest(const FPrimordiaPacket& Packet);
	void SendHello();

	TSharedPtr<FPrimordiaWebSocketClient> Client;

	UPROPERTY() TObjectPtr<UPrimordiaActorFactory> Factory;
	UPROPERTY() TObjectPtr<UPrimordiaRealmGenerator> Generator;

	TWeakObjectPtr<ARealmRootActor> ActiveRealm;
	FPrimordiaBridgeStats Stats;
	/** Packets injected from Blueprint/C++ that bypass the socket. */
	TArray<FString> Injected;
};
