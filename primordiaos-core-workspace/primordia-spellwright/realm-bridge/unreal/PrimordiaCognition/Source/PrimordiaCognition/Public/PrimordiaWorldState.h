#pragma once

#include "CoreMinimal.h"
#include "CognitionTypes.h"

class UWorld;
class FLoreCodex;

/** A change between two snapshots, worth remembering. */
struct PRIMORDIACOGNITION_API FPrimordiaObservation
{
	FString Summary;
	TArray<FName> Tags;
	float Salience = 0.5f;
};

/**
 * World-state collector: walks the world once per cycle, counts what is there, records the tracked
 * entities, and flattens everything into facts:
 *
 *   world.name  world.time  world.actors  player.present  player.x/y/z
 *   tag.<tag>  (count of actors with that tag)    class.<class>  (top classes by count)
 *   realm  realm.stability  realm.<metaphysic>  era  bolt.connected  jobs.active  spells.active
 */
class PRIMORDIACOGNITION_API FPrimordiaWorldState
{
public:
	TArray<FString> TrackedTagPrefixes = {TEXT("Primordia")};
	int32 MaxTrackedEntities = 256;
	int32 MaxClassFacts = 32;

	FPrimordiaWorldSnapshot Collect(UWorld* World, FName Realm, const FLoreCodex* Codex, bool bBoltConnected, int32 ActiveJobs, int32 ActiveSpells) const;

	/** What changed: entities appearing and leaving, tag counts moving, the realm destabilising. */
	static TArray<FPrimordiaObservation> Diff(const FPrimordiaWorldSnapshot& Before, const FPrimordiaWorldSnapshot& After);

	/** A few lines of plain text for a language model. */
	static FString Summarize(const FPrimordiaWorldSnapshot& Snapshot, int32 MaxEntities = 12);

	bool IsTracked(const FName& Tag) const;
};
