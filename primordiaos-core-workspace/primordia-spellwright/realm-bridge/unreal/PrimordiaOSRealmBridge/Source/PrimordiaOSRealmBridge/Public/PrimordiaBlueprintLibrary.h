#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "Kismet/BlueprintAsyncActionBase.h"
#include "PrimordiaTypes.h"
#include "PrimordiaBlueprintLibrary.generated.h"

class UPrimordiaBridgeSubsystem;
class UPrimordiaPayload;
class ARealmRootActor;

/** Blueprint nodes for connecting to PrimordiaOS, spawning realms and driving visualizers. */
UCLASS()
class PRIMORDIAOSREALMBRIDGE_API UPrimordiaBlueprintLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	// --- Connection ---------------------------------------------------------

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Bridge", meta = (WorldContext = "WorldContextObject"))
	static UPrimordiaBridgeSubsystem* GetPrimordiaBridge(const UObject* WorldContextObject);

	/** Connect to PrimordiaOS. Empty Url = Project Settings (ws://127.0.0.1:7777). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge", meta = (WorldContext = "WorldContextObject", AdvancedDisplay = "Url"))
	static bool ConnectToPrimordiaOS(const UObject* WorldContextObject, const FString& Url);

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge", meta = (WorldContext = "WorldContextObject"))
	static void DisconnectFromPrimordiaOS(const UObject* WorldContextObject);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Bridge", meta = (WorldContext = "WorldContextObject"))
	static bool IsPrimordiaConnected(const UObject* WorldContextObject);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Bridge", meta = (WorldContext = "WorldContextObject"))
	static FPrimordiaBridgeStats GetPrimordiaStats(const UObject* WorldContextObject);

	/** Sends {"type":"command","name":Command,"args":ArgsJson}. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge", meta = (WorldContext = "WorldContextObject", AutoCreateRefTerm = "ArgsJson"))
	static bool SendPrimordiaCommand(const UObject* WorldContextObject, const FString& Command, const FString& ArgsJson);

	/** Sets a metaphysical scalar in PrimordiaOS (entropy, luminosity, coherence, resonance, inversion, lucidity, ...). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge", meta = (WorldContext = "WorldContextObject"))
	static bool PerturbMetaphysics(const UObject* WorldContextObject, FName Key, float Value);

	/** Asks Worldforge to evolve the realm immediately (new manifest revision). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge", meta = (WorldContext = "WorldContextObject"))
	static bool RequestRealmEvolution(const UObject* WorldContextObject);

	/** Asks Worldforge for a brand-new realm from Seed. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge", meta = (WorldContext = "WorldContextObject"))
	static bool ReseedRealm(const UObject* WorldContextObject, int64 Seed);

	// --- Realms -------------------------------------------------------------

	/** Parses a PRS-1 manifest (bare, or a whole realm_manifest packet). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm")
	static bool ParseRealmManifest(const FString& Json, FPrimordiaRealmManifest& OutManifest, FString& OutError);

	/** Spawns (or diff-updates) the world's active realm from a manifest. Works without a server. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm", meta = (WorldContext = "WorldContextObject"))
	static ARealmRootActor* SpawnRealmFromManifest(const UObject* WorldContextObject, const FPrimordiaRealmManifest& Manifest, const FTransform& Transform);

	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm", meta = (WorldContext = "WorldContextObject"))
	static ARealmRootActor* SpawnRealmFromManifestJson(const UObject* WorldContextObject, const FString& Json, const FTransform& Transform, FString& OutError);

	/** Loads a .json manifest from disk (absolute or project-relative path). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Realm", meta = (WorldContext = "WorldContextObject"))
	static ARealmRootActor* SpawnRealmFromFile(const UObject* WorldContextObject, const FString& FilePath, const FTransform& Transform, FString& OutError);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Realm", meta = (WorldContext = "WorldContextObject"))
	static ARealmRootActor* GetActiveRealm(const UObject* WorldContextObject);

	// --- Visualization ------------------------------------------------------

	/** Pushes a full PRS-1 packet (envelope JSON) through the bridge pipeline: spawn/update/retire. */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Visualization", meta = (WorldContext = "WorldContextObject"))
	static bool ApplyPacketJson(const UObject* WorldContextObject, const FString& PacketJson);

	/** Drives one actor directly with a payload, bypassing the factory (previews, tests, Sequencer). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Visualization")
	static bool ApplyPayloadToActor(AActor* Actor, EPrimordiaPacketType Type, const FString& PayloadJson);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Visualization", meta = (WorldContext = "WorldContextObject"))
	static AActor* FindPrimordiaEntity(const UObject* WorldContextObject, EPrimordiaPacketType Type, const FString& EntityId);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Visualization", meta = (WorldContext = "WorldContextObject"))
	static TArray<AActor*> GetAllPrimordiaEntities(const UObject* WorldContextObject);

	/** Use a Blueprint class for a stream from now on (runtime override of Project Settings). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Visualization", meta = (WorldContext = "WorldContextObject"))
	static void RegisterVisualizerClass(const UObject* WorldContextObject, EPrimordiaPacketType Type, TSubclassOf<AActor> Class);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Visualization")
	static UPrimordiaPayload* MakePayloadFromJson(const FString& Json);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Visualization")
	static FString PacketTypeToString(EPrimordiaPacketType Type);

	/** PRS-1 meters -> Unreal units. */
	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Visualization")
	static FVector PrimordiaToUnreal(FVector Meters);
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FPrimordiaConnectResult, const FString&, Message);

/** Latent "Connect To PrimordiaOS" node with On Connected / On Failed pins. */
UCLASS()
class PRIMORDIAOSREALMBRIDGE_API UPrimordiaConnectAsyncAction : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Bridge", meta = (BlueprintInternalUseOnly = "true", WorldContext = "WorldContextObject", DisplayName = "Connect To PrimordiaOS (Async)", AdvancedDisplay = "Url,TimeoutSeconds"))
	static UPrimordiaConnectAsyncAction* ConnectToPrimordiaOSAsync(const UObject* WorldContextObject, const FString& Url, float TimeoutSeconds = 10.f);

	UPROPERTY(BlueprintAssignable) FPrimordiaConnectResult OnConnected;
	UPROPERTY(BlueprintAssignable) FPrimordiaConnectResult OnFailed;

	virtual void Activate() override;

private:
	// By-value Message: delegate payload types must match the bound signature exactly.
	void Finish(bool bSuccess, FString Message);

	TWeakObjectPtr<UPrimordiaBridgeSubsystem> Bridge;
	FString Url;
	float TimeoutSeconds = 10.f;
	FDelegateHandle ConnectedHandle;
	FTimerHandle TimeoutHandle;
	bool bDone = false;
};
