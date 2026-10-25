#include "LoreEvolver.h"

#include "LoreCodex.h"
#include "Math/RandomStream.h"

namespace
{
	float Meta(const FLoreRealm& Realm, const TCHAR* Key, float Default = 0.5f)
	{
		const float* V = Realm.Metaphysics.Find(FName(Key));
		return V ? *V : Default;
	}

	bool AreRivals(const FLoreFaction& A, const FLoreFaction& B)
	{
		return A.Rivals.Contains(B.Id) || B.Rivals.Contains(A.Id);
	}

	bool AreAllies(const FLoreFaction& A, const FLoreFaction& B)
	{
		return A.Allies.Contains(B.Id) || B.Allies.Contains(A.Id);
	}
}

void FLoreEvolver::NormalizeInfluence(FLoreCodex& Codex)
{
	TMap<FName, FLoreFaction>& Factions = Codex.GetFactionsMutable();
	float Sum = 0.f;
	for (const TPair<FName, FLoreFaction>& F : Factions)
	{
		Sum += FMath::Max(0.f, F.Value.Influence);
	}
	if (Sum <= KINDA_SMALL_NUMBER)
	{
		return;
	}
	for (TPair<FName, FLoreFaction>& F : Factions)
	{
		F.Value.Influence = FMath::Max(0.f, F.Value.Influence) / Sum;
	}
}

void FLoreEvolver::ApplyEvent(FLoreCodex& Codex, FLoreEvent Event)
{
	if (Event.Id.IsNone())
	{
		Event.Id = FName(*FString::Printf(TEXT("event_%d_%08x"), Event.Era, GetTypeHash(Event.Title)));
	}
	if (FLoreRealm* Realm = Event.Realm.IsNone() ? nullptr : Codex.FindRealmMutable(Event.Realm))
	{
		for (const TPair<FName, float>& Shift : Event.MetaphysicsShift)
		{
			float& V = Realm->Metaphysics.FindOrAdd(Shift.Key, 0.5f);
			V = FMath::Clamp(V + Shift.Value, 0.f, 1.f);
		}
		Realm->Stability = FMath::Clamp(Realm->Stability + Event.StabilityShift, 0.f, 1.f);
	}
	if (Event.InfluenceShift.Num() > 0)
	{
		for (const TPair<FName, float>& Shift : Event.InfluenceShift)
		{
			if (FLoreFaction* F = Codex.FindFactionMutable(Shift.Key))
			{
				F->Influence = FMath::Max(0.f, F->Influence + Shift.Value);
			}
		}
		NormalizeInfluence(Codex);
	}
	Codex.AddEvent(Event);
}

FLoreEvolution FLoreEvolver::Evolve(FLoreCodex& Codex, int32 Eras, int32 Seed) const
{
	FLoreEvolution Out;
	Out.FromEra = Codex.GetEra();
	for (int32 i = 0; i < FMath::Max(0, Eras); ++i)
	{
		EvolveOneEra(Codex, Seed, Out);
	}
	Out.ToEra = Codex.GetEra();
	return Out;
}

void FLoreEvolver::EvolveOneEra(FLoreCodex& Codex, int32 Seed, FLoreEvolution& Out) const
{
	const int32 NewEra = Codex.GetEra() + 1;
	FRandomStream Rng(static_cast<int32>(HashCombine(static_cast<uint32>(Seed), static_cast<uint32>(NewEra))));

	TArray<FName> RealmIds;
	Codex.GetRealms().GetKeys(RealmIds);
	RealmIds.Sort(FNameLexicalLess());

	for (const FName& RealmId : RealmIds)
	{
		const FLoreRealm Realm = *Codex.FindRealm(RealmId);
		TArray<const FLoreFaction*> Present = Codex.GetFactionsInRealm(RealmId);

		FLoreEvent Era;
		Era.Era = NewEra;
		Era.Realm = RealmId;
		Era.RecordedAt = FDateTime::UtcNow().ToIso8601();

		TArray<FString> Account;
		float StabilityShift = 0.f;
		float EntropyShift = 0.f;
		float CoherenceShift = 0.f;

		for (int32 a = 0; a < Present.Num(); ++a)
		{
			for (int32 b = a + 1; b < Present.Num(); ++b)
			{
				const FLoreFaction& A = *Present[a];
				const FLoreFaction& B = *Present[b];
				if (AreRivals(A, B))
				{
					const float Total = A.Influence + B.Influence + KINDA_SMALL_NUMBER;
					const float Evenness = 1.f - FMath::Abs(A.Influence - B.Influence) / Total;
					const float Pressure = RivalryPressure * (0.5f + 0.5f * Evenness);
					const bool bAWins = Rng.FRand() * Total < A.Influence + KINDA_SMALL_NUMBER * 0.5f;
					const FLoreFaction& Winner = bAWins ? A : B;
					const FLoreFaction& Loser = bAWins ? B : A;
					Era.InfluenceShift.FindOrAdd(Winner.Id) += Pressure * 0.5f;
					Era.InfluenceShift.FindOrAdd(Loser.Id) -= Pressure * 0.5f;
					Era.Factions.AddUnique(A.Id);
					Era.Factions.AddUnique(B.Id);
					StabilityShift -= Pressure;
					EntropyShift += Pressure * 0.5f;
					Account.Add(FString::Printf(TEXT("%s contested %s with %s and prevailed."), *Winner.Name, *Realm.Name, *Loser.Name));
				}
				else if (AreAllies(A, B))
				{
					CoherenceShift += AllianceBond;
					StabilityShift += AllianceBond * 0.5f;
					Era.Factions.AddUnique(A.Id);
					Era.Factions.AddUnique(B.Id);
					Account.Add(FString::Printf(TEXT("%s and %s kept their covenant in %s."), *A.Name, *B.Name, *Realm.Name));
				}
			}
		}

		StabilityShift += CoherenceLift * Meta(Realm, TEXT("coherence")) - EntropyDrag * Meta(Realm, TEXT("entropy"));
		StabilityShift += Rng.FRandRange(-0.01f, 0.01f);

		const float Projected = FMath::Clamp(Realm.Stability + StabilityShift, 0.f, 1.f);
		if (Projected < FractureThreshold)
		{
			// A fracture releases the pressure that caused it, at the cost of the realm's order.
			Era.Id = FName(*FString::Printf(TEXT("era%d_%s_fracture"), NewEra, *RealmId.ToString()));
			Era.Title = FString::Printf(TEXT("The Fracture of %s"), *Realm.Name);
			Account.Add(FString::Printf(TEXT("%s could no longer hold its shape; its law broke and shadow poured through the seams."), *Realm.Name));
			Era.MetaphysicsShift.Add(TEXT("inversion"), 0.15f);
			EntropyShift += 0.1f;
			CoherenceShift -= 0.1f;
			StabilityShift += 0.2f;
		}
		else if (Projected > AscensionThreshold && Meta(Realm, TEXT("coherence")) > 0.8f)
		{
			Era.Id = FName(*FString::Printf(TEXT("era%d_%s_ascension"), NewEra, *RealmId.ToString()));
			Era.Title = FString::Printf(TEXT("The Ascension of %s"), *Realm.Name);
			Account.Add(FString::Printf(TEXT("%s rang like a struck bell; its light and song rose a measure."), *Realm.Name));
			Era.MetaphysicsShift.Add(TEXT("luminosity"), 0.05f);
			Era.MetaphysicsShift.Add(TEXT("resonance"), 0.05f);
		}
		else if (Account.Num() > 0)
		{
			Era.Id = FName(*FString::Printf(TEXT("era%d_%s_chronicle"), NewEra, *RealmId.ToString()));
			Era.Title = FString::Printf(TEXT("Chronicle of %s, Era %d"), *Realm.Name, NewEra);
		}

		if (!FMath::IsNearlyZero(EntropyShift)) { Era.MetaphysicsShift.FindOrAdd(TEXT("entropy")) += EntropyShift; }
		if (!FMath::IsNearlyZero(CoherenceShift)) { Era.MetaphysicsShift.FindOrAdd(TEXT("coherence")) += CoherenceShift; }
		Era.StabilityShift = StabilityShift;
		Era.Account = FString::Join(Account, TEXT(" "));

		if (Era.Id.IsNone())
		{
			// Nothing notable: drift silently, without a history record.
			if (FLoreRealm* Live = Codex.FindRealmMutable(RealmId))
			{
				Live->Stability = FMath::Clamp(Live->Stability + StabilityShift, 0.f, 1.f);
			}
			continue;
		}
		ApplyEvent(Codex, Era);
		Out.Events.Add(Era);
	}

	Codex.SetEra(NewEra);
}
