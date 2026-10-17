#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "PrimordiaTypes.h"
#include "PrimordiaActorFactory.generated.h"

/**
 * Maps packet types to visualizer classes and owns the entity registry
 * ("<type>/<id>" -> actor). Spawns on first upsert, routes later packets,
 * retires on op:"retire" or timeout.
 */
UCLASS(BlueprintType)
class PRIMORDIAOSREALMBRIDGE_API UPrimordiaActorFactory : public UObject
{
	GENERATED_BODY()

public:
	void Initialize(UWorld* InWorld);

	/** Overrides the visualizer class for a stream (takes precedence over Project Settings). */
	UFUNCTION(BlueprintCallable, Category = "PrimordiaOS|Factory")
	void RegisterVisualizerClass(EPrimordiaPacketType Type, TSubclassOf<AActor> Class);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Factory")
	TSubclassOf<AActor> ResolveClass(EPrimordiaPacketType Type) const;

	/** Spawn-or-update for an upsert; retire for op:"retire". Returns the entity (null when retired). */
	AActor* Apply(const FPrimordiaPacket& Packet, AActor* AttachTo);

	/** Routes a packet to an arbitrary actor (native fast path or PrimordiaVisualizer interface). */
	static bool Deliver(AActor* Actor, const FPrimordiaPacket& Packet);

	bool Retire(const FString& EntityKey);

	/**
	 * Registers an actor the realm generator created (e.g. the glyph bound to "soul")
	 * so the live stream updates it instead of spawning a duplicate. Adopted
	 * entities never time out: they belong to the realm.
	 */
	void Adopt(EPrimordiaPacketType Type, const FString& EntityId, AActor* Actor);
	void Release(AActor* Actor);

	/** Retires visual entities not refreshed within TimeoutSeconds. */
	void CollectStale(double Now, float TimeoutSeconds);

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Factory")
	AActor* FindEntity(EPrimordiaPacketType Type, const FString& EntityId) const;

	UFUNCTION(BlueprintPure, Category = "PrimordiaOS|Factory")
	TArray<AActor*> GetAllEntities() const;

	/** Last time (FPlatformTime::Seconds) a live packet touched this entity; 0 if never. */
	double GetLastUpdate(EPrimordiaPacketType Type, const FString& EntityId) const;

	void DestroyAll();
	int32 Num() const { return Entities.Num(); }

	static FString MakeKey(EPrimordiaPacketType Type, const FString& EntityId);

	TMulticastDelegate<void(const FString& /*Key*/, AActor*)> OnEntitySpawned;
	TMulticastDelegate<void(const FString& /*Key*/, AActor*)> OnEntityRetired;

private:
	AActor* Spawn(const FPrimordiaPacket& Packet, AActor* AttachTo);

	struct FRecord
	{
		TWeakObjectPtr<AActor> Actor;
		EPrimordiaPacketType Type = EPrimordiaPacketType::Unknown;
		double LastUpdate = 0.0;
		bool bAdopted = false;
	};
	TMap<FString, FRecord> Entities;

	UPROPERTY()
	TMap<EPrimordiaPacketType, TSubclassOf<AActor>> RuntimeClasses;

	TWeakObjectPtr<UWorld> World;
};
