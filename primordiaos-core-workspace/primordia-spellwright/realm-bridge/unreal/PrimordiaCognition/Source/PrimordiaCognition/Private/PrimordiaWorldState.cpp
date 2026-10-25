#include "PrimordiaWorldState.h"

#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/PlayerController.h"
#include "LoreCodex.h"

bool FPrimordiaWorldState::IsTracked(const FName& Tag) const
{
	const FString S = Tag.ToString();
	for (const FString& Prefix : TrackedTagPrefixes)
	{
		if (S.StartsWith(Prefix))
		{
			return true;
		}
	}
	return false;
}

FPrimordiaWorldSnapshot FPrimordiaWorldState::Collect(UWorld* World, FName Realm, const FLoreCodex* Codex, bool bBoltConnected, int32 ActiveJobs, int32 ActiveSpells) const
{
	FPrimordiaWorldSnapshot S;
	S.Realm = Realm;
	S.bBoltConnected = bBoltConnected;
	S.ActiveJobs = ActiveJobs;
	S.ActiveSpells = ActiveSpells;
	S.Era = Codex ? Codex->GetEra() : 0;
	if (World)
	{
		S.WorldName = World->GetMapName();
		S.TimeSeconds = World->GetTimeSeconds();
		for (TActorIterator<AActor> It(World); It; ++It)
		{
			AActor* Actor = *It;
			if (!IsValid(Actor))
			{
				continue;
			}
			++S.ActorCount;
			S.ClassCounts.FindOrAdd(Actor->GetClass()->GetName())++;
			bool bTracked = false;
			for (const FName& Tag : Actor->Tags)
			{
				if (IsTracked(Tag))
				{
					S.TagCounts.FindOrAdd(Tag)++;
					bTracked = true;
				}
			}
			if (bTracked && S.Entities.Num() < MaxTrackedEntities)
			{
				FPrimordiaEntityState& E = S.Entities.AddDefaulted_GetRef();
				E.Name = Actor->GetActorNameOrLabel();
				E.Class = Actor->GetClass()->GetName();
				E.Tags = Actor->Tags;
				E.Location = Actor->GetActorLocation();
			}
		}
		if (APlayerController* PC = World->GetFirstPlayerController())
		{
			if (APawn* Pawn = PC->GetPawn())
			{
				S.bHasPlayer = true;
				S.PlayerLocation = Pawn->GetActorLocation();
			}
		}
	}

	TMap<FString, FString>& F = S.Facts;
	F.Add(TEXT("world.name"), S.WorldName);
	F.Add(TEXT("world.time"), FString::SanitizeFloat(S.TimeSeconds));
	F.Add(TEXT("world.actors"), FString::FromInt(S.ActorCount));
	F.Add(TEXT("player.present"), S.bHasPlayer ? TEXT("true") : TEXT("false"));
	if (S.bHasPlayer)
	{
		F.Add(TEXT("player.x"), FString::SanitizeFloat(S.PlayerLocation.X));
		F.Add(TEXT("player.y"), FString::SanitizeFloat(S.PlayerLocation.Y));
		F.Add(TEXT("player.z"), FString::SanitizeFloat(S.PlayerLocation.Z));
	}
	for (const TPair<FName, int32>& T : S.TagCounts)
	{
		F.Add(TEXT("tag.") + T.Key.ToString(), FString::FromInt(T.Value));
	}
	TArray<TPair<FString, int32>> Classes;
	for (const TPair<FString, int32>& C : S.ClassCounts) { Classes.Emplace(C.Key, C.Value); }
	Classes.Sort([](const TPair<FString, int32>& A, const TPair<FString, int32>& B) { return A.Value != B.Value ? A.Value > B.Value : A.Key < B.Key; });
	for (int32 i = 0; i < FMath::Min(MaxClassFacts, Classes.Num()); ++i)
	{
		F.Add(TEXT("class.") + Classes[i].Key, FString::FromInt(Classes[i].Value));
	}
	F.Add(TEXT("realm"), Realm.ToString());
	if (Codex)
	{
		if (const FLoreRealm* R = Codex->FindRealm(Realm))
		{
			F.Add(TEXT("realm.name"), R->Name);
			F.Add(TEXT("realm.stability"), FString::SanitizeFloat(R->Stability));
			for (const TPair<FName, float>& M : R->Metaphysics)
			{
				F.Add(TEXT("realm.") + M.Key.ToString(), FString::SanitizeFloat(M.Value));
			}
		}
	}
	F.Add(TEXT("era"), FString::FromInt(S.Era));
	F.Add(TEXT("bolt.connected"), bBoltConnected ? TEXT("true") : TEXT("false"));
	F.Add(TEXT("jobs.active"), FString::FromInt(ActiveJobs));
	F.Add(TEXT("spells.active"), FString::FromInt(ActiveSpells));
	return S;
}

TArray<FPrimordiaObservation> FPrimordiaWorldState::Diff(const FPrimordiaWorldSnapshot& Before, const FPrimordiaWorldSnapshot& After)
{
	TArray<FPrimordiaObservation> Out;
	if (Before.WorldName != After.WorldName)
	{
		FPrimordiaObservation& O = Out.AddDefaulted_GetRef();
		O.Summary = FString::Printf(TEXT("Entered world %s with %d actors"), *After.WorldName, After.ActorCount);
		O.Tags = {TEXT("world")};
		O.Salience = 0.8f;
		return Out; // everything else is new too; do not flood memory
	}

	TSet<FString> BeforeNames, AfterNames;
	for (const FPrimordiaEntityState& E : Before.Entities) { BeforeNames.Add(E.Name); }
	for (const FPrimordiaEntityState& E : After.Entities) { AfterNames.Add(E.Name); }
	for (const FPrimordiaEntityState& E : After.Entities)
	{
		if (!BeforeNames.Contains(E.Name))
		{
			FPrimordiaObservation& O = Out.AddDefaulted_GetRef();
			O.Summary = FString::Printf(TEXT("%s (%s) appeared at %s"), *E.Name, *E.Class, *E.Location.ToCompactString());
			O.Tags = E.Tags;
			O.Tags.Add(TEXT("appeared"));
			O.Salience = 0.55f;
		}
	}
	for (const FPrimordiaEntityState& E : Before.Entities)
	{
		if (!AfterNames.Contains(E.Name))
		{
			FPrimordiaObservation& O = Out.AddDefaulted_GetRef();
			O.Summary = FString::Printf(TEXT("%s (%s) is gone"), *E.Name, *E.Class);
			O.Tags = E.Tags;
			O.Tags.Add(TEXT("vanished"));
			O.Salience = 0.6f;
		}
	}
	if (Before.bHasPlayer != After.bHasPlayer)
	{
		FPrimordiaObservation& O = Out.AddDefaulted_GetRef();
		O.Summary = After.bHasPlayer ? TEXT("A player entered the realm") : TEXT("The player left the realm");
		O.Tags = {TEXT("player")};
		O.Salience = 0.7f;
	}
	if (Before.bBoltConnected != After.bBoltConnected)
	{
		FPrimordiaObservation& O = Out.AddDefaulted_GetRef();
		O.Summary = After.bBoltConnected ? TEXT("The Bolt pipeline came online") : TEXT("The Bolt pipeline went offline");
		O.Tags = {TEXT("bolt"), TEXT("pipeline")};
		O.Salience = 0.65f;
	}
	const FString* SB = Before.Facts.Find(TEXT("realm.stability"));
	const FString* SA = After.Facts.Find(TEXT("realm.stability"));
	if (SB && SA && FMath::Abs(FCString::Atof(**SA) - FCString::Atof(**SB)) >= 0.05f)
	{
		FPrimordiaObservation& O = Out.AddDefaulted_GetRef();
		O.Summary = FString::Printf(TEXT("%s stability moved from %.2f to %.2f"), *After.Realm.ToString(), FCString::Atof(**SB), FCString::Atof(**SA));
		O.Tags = {After.Realm, TEXT("stability")};
		O.Salience = 0.75f;
	}
	if (Before.Era != After.Era)
	{
		FPrimordiaObservation& O = Out.AddDefaulted_GetRef();
		O.Summary = FString::Printf(TEXT("History advanced to era %d"), After.Era);
		O.Tags = {TEXT("lore"), TEXT("era")};
		O.Salience = 0.7f;
	}
	return Out;
}

FString FPrimordiaWorldState::Summarize(const FPrimordiaWorldSnapshot& S, int32 MaxEntities)
{
	TArray<FString> Lines;
	Lines.Add(FString::Printf(TEXT("World %s, t=%.0fs, %d actors, realm %s (era %d)."), *S.WorldName, S.TimeSeconds, S.ActorCount, *S.Realm.ToString(), S.Era));
	if (const FString* Stab = S.Facts.Find(TEXT("realm.stability")))
	{
		Lines.Add(FString::Printf(TEXT("Realm stability %s, coherence %s, entropy %s."), **Stab,
			*S.Facts.FindRef(TEXT("realm.coherence")), *S.Facts.FindRef(TEXT("realm.entropy"))));
	}
	Lines.Add(FString::Printf(TEXT("Pipeline %s, %d jobs running, %d spells active."), S.bBoltConnected ? TEXT("online") : TEXT("offline"), S.ActiveJobs, S.ActiveSpells));
	TArray<FString> Tags;
	for (const TPair<FName, int32>& T : S.TagCounts) { Tags.Add(FString::Printf(TEXT("%s x%d"), *T.Key.ToString(), T.Value)); }
	Tags.Sort();
	if (Tags.Num() > 0) { Lines.Add(TEXT("Tagged: ") + FString::Join(Tags, TEXT(", ")) + TEXT(".")); }
	for (int32 i = 0; i < FMath::Min(MaxEntities, S.Entities.Num()); ++i)
	{
		const FPrimordiaEntityState& E = S.Entities[i];
		Lines.Add(FString::Printf(TEXT("- %s (%s) at %s"), *E.Name, *E.Class, *E.Location.ToCompactString()));
	}
	return FString::Join(Lines, TEXT("\n"));
}
