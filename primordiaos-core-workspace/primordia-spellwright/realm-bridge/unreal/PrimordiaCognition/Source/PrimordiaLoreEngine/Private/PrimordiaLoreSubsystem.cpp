#include "PrimordiaLoreSubsystem.h"

#include "PrimordiaLoreEngine.h"
#include "Engine/Engine.h"
#include "HAL/FileManager.h"
#include "Misc/Paths.h"

void UPrimordiaLoreSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	FString Error;
	const FString Saved = GetSavedPath();
	if (FPaths::FileExists(Saved) && Codex.LoadFromFile(Saved, Error))
	{
		UE_LOG(LogPrimordiaLore, Log, TEXT("Loaded evolved codex %s (era %d)"), *Saved, Codex.GetEra());
	}
	else
	{
		if (!Error.IsEmpty())
		{
			UE_LOG(LogPrimordiaLore, Warning, TEXT("Evolved codex unreadable (%s); falling back to the founding codex"), *Error);
		}
		ResetToFounding();
	}

	for (const FString& Issue : Codex.Validate())
	{
		UE_LOG(LogPrimordiaLore, Warning, TEXT("Codex: %s"), *Issue);
	}
	UE_LOG(LogPrimordiaLore, Log, TEXT("Codex: %d entries, %d realms, %d factions, %d events, %d glyphs"),
		Codex.GetEntries().Num(), Codex.GetRealms().Num(), Codex.GetFactions().Num(), Codex.GetEvents().Num(), Codex.GetGlyphs().Num());
}

void UPrimordiaLoreSubsystem::Deinitialize()
{
	SaveCodex();
	Super::Deinitialize();
}

UPrimordiaLoreSubsystem* UPrimordiaLoreSubsystem::Get()
{
	return GEngine ? GEngine->GetEngineSubsystem<UPrimordiaLoreSubsystem>() : nullptr;
}

FString UPrimordiaLoreSubsystem::GetFoundingPath() const
{
	return FPaths::Combine(FLoreText::ResourcesDir(), TEXT("Lore"), TEXT("codex.json"));
}

FString UPrimordiaLoreSubsystem::GetSavedPath() const
{
	return FPaths::Combine(FLoreText::SavedDir(TEXT("Lore")), TEXT("codex.json"));
}

TArray<FLoreQueryHit> UPrimordiaLoreSubsystem::QueryLore(const FLoreQuery& Query) const
{
	return Codex.Query(Query);
}

TArray<FLoreQueryHit> UPrimordiaLoreSubsystem::Ask(const FString& Text, int32 Limit) const
{
	FLoreQuery Q;
	Q.Text = Text;
	Q.Limit = Limit;
	return Codex.Query(Q);
}

bool UPrimordiaLoreSubsystem::GetRealm(FName Id, FLoreRealm& OutRealm) const
{
	if (const FLoreRealm* R = Codex.FindRealm(Id)) { OutRealm = *R; return true; }
	return false;
}

bool UPrimordiaLoreSubsystem::GetFaction(FName Id, FLoreFaction& OutFaction) const
{
	if (const FLoreFaction* F = Codex.FindFaction(Id)) { OutFaction = *F; return true; }
	return false;
}

bool UPrimordiaLoreSubsystem::GetGlyph(FName Id, FLoreGlyph& OutGlyph) const
{
	if (const FLoreGlyph* G = Codex.FindGlyph(Id)) { OutGlyph = *G; return true; }
	return false;
}

TArray<FName> UPrimordiaLoreSubsystem::GetRealmIds() const
{
	TArray<FName> Ids;
	Codex.GetRealms().GetKeys(Ids);
	Ids.Sort(FNameLexicalLess());
	return Ids;
}

void UPrimordiaLoreSubsystem::RecordEvent(const FLoreEvent& Event)
{
	FLoreEvent Copy = Event;
	if (Copy.Era == 0)
	{
		Copy.Era = Codex.GetEra();
	}
	if (Copy.RecordedAt.IsEmpty())
	{
		Copy.RecordedAt = FDateTime::UtcNow().ToIso8601();
	}
	FLoreEvolver::ApplyEvent(Codex, Copy);
	SaveCodex();
	Broadcast();
}

TArray<FLoreEvent> UPrimordiaLoreSubsystem::Evolve(int32 Eras)
{
	const FLoreEvolution Evolution = Evolver.Evolve(Codex, Eras, EvolutionSeed);
	for (const FLoreEvent& E : Evolution.Events)
	{
		UE_LOG(LogPrimordiaLore, Log, TEXT("Era %d: %s — %s"), E.Era, *E.Title, *E.Account);
	}
	SaveCodex();
	Broadcast();
	return Evolution.Events;
}

bool UPrimordiaLoreSubsystem::SaveCodex() const
{
	const FString Path = GetSavedPath();
	const bool bOk = Codex.SaveToFile(Path);
	if (!bOk)
	{
		UE_LOG(LogPrimordiaLore, Error, TEXT("Could not save codex to %s"), *Path);
	}
	return bOk;
}

bool UPrimordiaLoreSubsystem::ResetToFounding()
{
	FString Error;
	const FString Founding = GetFoundingPath();
	if (!Codex.LoadFromFile(Founding, Error))
	{
		UE_LOG(LogPrimordiaLore, Error, TEXT("Founding codex failed to load: %s"), *Error);
		return false;
	}
	IFileManager::Get().Delete(*GetSavedPath(), false, true, true);
	Broadcast();
	return true;
}

void UPrimordiaLoreSubsystem::Broadcast()
{
	OnLoreChanged.Broadcast(Codex.GetEra());
	OnLoreChangedNative.Broadcast(Codex);
}
