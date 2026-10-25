#pragma once

#include "CoreMinimal.h"
#include "CognitionTypes.h"

/**
 * Persistent episodic memory.
 *
 * Records decay: effective salience = salience * 0.5^(age / half-life), plus a little for every
 * recall, so what keeps being useful stays. Observing the same thing again (same kind and summary)
 * merges into the existing record instead of adding a new one. When full, the record with the lowest
 * effective salience is forgotten.
 *
 * Recall ranks by token overlap with the query (and tag matches), weighted by effective salience.
 */
class PRIMORDIACOGNITION_API FPrimordiaMemory
{
public:
	int32 Capacity = 2048;
	double HalfLifeHours = 24.0;

	/** Returns the record id (an existing one if the observation merged). */
	int64 Remember(FName Kind, const FString& Summary, const TArray<FName>& Tags, float Salience);

	/** Best matches for a query; bumps their recall count. Empty query = most salient. */
	TArray<FPrimordiaMemoryRecord> Recall(const FString& Query, const TArray<FName>& Tags, int32 Limit);

	/** Most recent records of a kind (or all kinds when Kind is None). */
	TArray<FPrimordiaMemoryRecord> Recent(FName Kind, int32 Limit) const;

	int32 Num() const { return Records.Num(); }
	int32 CountKind(FName Kind) const;
	void Clear() { Records.Reset(); NextId = 1; }

	bool Save(const FString& Path) const;
	bool Load(const FString& Path);

	float EffectiveSalience(const FPrimordiaMemoryRecord& R, const FDateTime& Now) const;

private:
	void Evict();

	TArray<FPrimordiaMemoryRecord> Records;
	int64 NextId = 1;
};
