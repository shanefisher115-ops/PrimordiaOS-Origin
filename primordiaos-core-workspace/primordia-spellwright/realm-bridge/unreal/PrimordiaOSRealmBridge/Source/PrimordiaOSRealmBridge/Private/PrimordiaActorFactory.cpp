#include "PrimordiaActorFactory.h"
#include "PrimordiaBridgeSettings.h"
#include "PrimordiaPayload.h"
#include "PrimordiaVisualizer.h"
#include "Actors/PrimordiaVisualActor.h"
#include "Actors/HeartActor.h"
#include "Actors/CosmicWebActor.h"
#include "Actors/FateWeaveActor.h"
#include "Actors/SoulGlyphActor.h"
#include "Actors/DreamNebulaActor.h"
#include "Actors/ShadowInversionActor.h"
#include "Engine/World.h"

void UPrimordiaActorFactory::Initialize(UWorld* InWorld)
{
	World = InWorld;
}

FString UPrimordiaActorFactory::MakeKey(EPrimordiaPacketType Type, const FString& EntityId)
{
	return PrimordiaPacketType::ToString(Type) + TEXT("/") + EntityId;
}

void UPrimordiaActorFactory::RegisterVisualizerClass(EPrimordiaPacketType Type, TSubclassOf<AActor> Class)
{
	if (Class)
	{
		RuntimeClasses.Add(Type, Class);
	}
	else
	{
		RuntimeClasses.Remove(Type);
	}
}

TSubclassOf<AActor> UPrimordiaActorFactory::ResolveClass(EPrimordiaPacketType Type) const
{
	if (const TSubclassOf<AActor>* Runtime = RuntimeClasses.Find(Type))
	{
		return *Runtime;
	}
	if (const TSoftClassPtr<AActor>* Override = UPrimordiaBridgeSettings::Get()->ActorClassOverrides.Find(Type))
	{
		if (UClass* Loaded = Override->LoadSynchronous())
		{
			return Loaded;
		}
	}
	switch (Type)
	{
	case EPrimordiaPacketType::HeartBeat: return AHeartActor::StaticClass();
	case EPrimordiaPacketType::CosmicWeb: return ACosmicWebActor::StaticClass();
	case EPrimordiaPacketType::FateWeave: return AFateWeaveActor::StaticClass();
	case EPrimordiaPacketType::SoulUnification: return ASoulGlyphActor::StaticClass();
	case EPrimordiaPacketType::DreamNebula: return ADreamNebulaActor::StaticClass();
	case EPrimordiaPacketType::ShadowInversion: return AShadowInversionActor::StaticClass();
	default: return nullptr;
	}
}

AActor* UPrimordiaActorFactory::Spawn(const FPrimordiaPacket& Packet, AActor* AttachTo)
{
	UWorld* W = World.Get();
	const TSubclassOf<AActor> Class = ResolveClass(Packet.Type);
	if (!W || !Class)
	{
		return nullptr;
	}

	FActorSpawnParameters Params;
	Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	Params.Owner = AttachTo;
	Params.bDeferConstruction = true;
	if (W->WorldType == EWorldType::Editor)
	{
		// Live editor previews are never saved into the level.
		Params.ObjectFlags |= RF_Transient;
	}

	AActor* Actor = W->SpawnActor<AActor>(Class, FTransform::Identity, Params);
	if (!Actor)
	{
		return nullptr;
	}
	if (APrimordiaVisualActor* Visual = Cast<APrimordiaVisualActor>(Actor))
	{
		Visual->EntityId = Packet.EntityId;
		Visual->PacketType = Packet.Type;
	}
	Actor->FinishSpawning(FTransform::Identity);
	if (AttachTo)
	{
		Actor->AttachToActor(AttachTo, FAttachmentTransformRules::KeepRelativeTransform);
	}
#if WITH_EDITOR
	Actor->SetActorLabel(FString::Printf(TEXT("Primordia_%s_%s"), *Packet.TypeName, *Packet.EntityId));
#endif
	UE_LOG(LogPrimordia, Verbose, TEXT("Spawned %s for %s"), *Class->GetName(), *Packet.EntityKey());
	return Actor;
}

bool UPrimordiaActorFactory::Deliver(AActor* Actor, const FPrimordiaPacket& Packet)
{
	if (!IsValid(Actor))
	{
		return false;
	}
	if (APrimordiaVisualActor* Visual = Cast<APrimordiaVisualActor>(Actor))
	{
		Visual->ApplyPacket(Packet);
		return true;
	}
	if (Actor->GetClass()->ImplementsInterface(UPrimordiaVisualizer::StaticClass()))
	{
		IPrimordiaVisualizer::Execute_ReceivePrimordiaPacket(Actor, FPrimordiaPacketInfo::From(Packet), UPrimordiaPayload::Wrap(Actor, Packet.Payload));
		return true;
	}
	return false;
}

AActor* UPrimordiaActorFactory::Apply(const FPrimordiaPacket& Packet, AActor* AttachTo)
{
	const FString Key = Packet.EntityKey();
	if (Packet.Op == EPrimordiaPacketOp::Retire)
	{
		Retire(Key);
		return nullptr;
	}

	FRecord* Record = Entities.Find(Key);
	AActor* Actor = Record ? Record->Actor.Get() : nullptr;
	if (!IsValid(Actor))
	{
		Actor = Spawn(Packet, AttachTo);
		if (!Actor)
		{
			return nullptr;
		}
		FRecord& NewRecord = Entities.Add(Key);
		NewRecord.Actor = Actor;
		NewRecord.Type = Packet.Type;
		Record = &NewRecord;
		OnEntitySpawned.Broadcast(Key, Actor);
	}
	Record->LastUpdate = FPlatformTime::Seconds();
	Deliver(Actor, Packet);
	return Actor;
}

bool UPrimordiaActorFactory::Retire(const FString& Key)
{
	FRecord Record;
	if (!Entities.RemoveAndCopyValue(Key, Record))
	{
		return false;
	}
	AActor* Actor = Record.Actor.Get();
	if (!IsValid(Actor))
	{
		return false;
	}
	OnEntityRetired.Broadcast(Key, Actor);
	if (Record.bAdopted)
	{
		return true; // realm-owned: the stream let go, the realm keeps it
	}
	if (APrimordiaVisualActor* Visual = Cast<APrimordiaVisualActor>(Actor))
	{
		Visual->BeginRetire();
	}
	else if (Actor->GetClass()->ImplementsInterface(UPrimordiaVisualizer::StaticClass()))
	{
		IPrimordiaVisualizer::Execute_RetirePrimordiaEntity(Actor);
	}
	else
	{
		Actor->Destroy();
	}
	return true;
}

void UPrimordiaActorFactory::Adopt(EPrimordiaPacketType Type, const FString& EntityId, AActor* Actor)
{
	if (!IsValid(Actor))
	{
		return;
	}
	const FString Key = MakeKey(Type, EntityId);
	double LastUpdate = 0.0;
	if (FRecord* Existing = Entities.Find(Key))
	{
		LastUpdate = Existing->LastUpdate; // liveness belongs to the entity, not the actor
		AActor* Old = Existing->Actor.Get();
		if (Old && Old != Actor && !Existing->bAdopted)
		{
			Old->Destroy(); // a stream-spawned duplicate yields to the realm's actor
		}
	}
	FRecord& Record = Entities.Add(Key);
	Record.LastUpdate = LastUpdate;
	Record.Actor = Actor;
	Record.Type = Type;
	Record.bAdopted = true;
	if (APrimordiaVisualActor* Visual = Cast<APrimordiaVisualActor>(Actor))
	{
		Visual->EntityId = EntityId;
		Visual->PacketType = Type;
	}
}

void UPrimordiaActorFactory::Release(AActor* Actor)
{
	for (auto It = Entities.CreateIterator(); It; ++It)
	{
		if (It->Value.Actor.Get() == Actor)
		{
			It.RemoveCurrent();
		}
	}
}

void UPrimordiaActorFactory::CollectStale(double Now, float TimeoutSeconds)
{
	if (TimeoutSeconds <= 0.f)
	{
		return;
	}
	TArray<FString> Stale;
	for (const TPair<FString, FRecord>& Pair : Entities)
	{
		const FRecord& R = Pair.Value;
		if (!R.Actor.IsValid() && !R.bAdopted)
		{
			Stale.Add(Pair.Key); // destroyed externally
		}
		else if (!R.bAdopted && PrimordiaPacketType::IsVisual(R.Type) && R.LastUpdate > 0.0 && Now - R.LastUpdate > TimeoutSeconds)
		{
			Stale.Add(Pair.Key);
		}
	}
	for (const FString& Key : Stale)
	{
		UE_LOG(LogPrimordia, Log, TEXT("Entity %s timed out"), *Key);
		Retire(Key);
	}
}

AActor* UPrimordiaActorFactory::FindEntity(EPrimordiaPacketType Type, const FString& EntityId) const
{
	const FRecord* Record = Entities.Find(MakeKey(Type, EntityId));
	return Record ? Record->Actor.Get() : nullptr;
}

double UPrimordiaActorFactory::GetLastUpdate(EPrimordiaPacketType Type, const FString& EntityId) const
{
	const FRecord* Record = Entities.Find(MakeKey(Type, EntityId));
	return Record ? Record->LastUpdate : 0.0;
}

TArray<AActor*> UPrimordiaActorFactory::GetAllEntities() const
{
	TArray<AActor*> Out;
	for (const TPair<FString, FRecord>& Pair : Entities)
	{
		if (AActor* Actor = Pair.Value.Actor.Get())
		{
			Out.Add(Actor);
		}
	}
	return Out;
}

void UPrimordiaActorFactory::DestroyAll()
{
	for (const TPair<FString, FRecord>& Pair : Entities)
	{
		if (AActor* Actor = Pair.Value.Actor.Get(); Actor && !Pair.Value.bAdopted)
		{
			Actor->Destroy();
		}
	}
	Entities.Reset();
}
