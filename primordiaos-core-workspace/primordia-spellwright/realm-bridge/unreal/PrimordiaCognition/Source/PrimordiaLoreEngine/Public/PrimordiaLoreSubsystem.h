#pragma once

#include "CoreMinimal.h"
#include "Subsystems/EngineSubsystem.h"
#include "LoreTypes.h"
#include "LoreCodex.h"
#include "LoreEvolver.h"
#include "PrimordiaLoreSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnLoreChanged, int32, Era);
DECLARE_MULTICAST_DELEGATE_OneParam(FOnLoreChangedNative, const FLoreCodex&);

/**
 * Owns the live codex. An engine subsystem so the editor, every world, and every Primordia module
 * (cognition, Spellwright, Jules, the pipeline subsystems) query one shared database.
 *
 * Loads Saved/Primordia/Lore/codex.json if present (the evolved codex), otherwise the founding codex
 * in the plugin's Resources/Lore/codex.json.
 */
UCLASS()
class PRIMORDIALOREENGINE_API UPrimordiaLoreSubsystem : public UEngineSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	static UPrimordiaLoreSubsystem* Get();

	const FLoreCodex& GetCodex() const { return Codex; }
	FLoreCodex& GetCodexMutable() { return Codex; }

	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	TArray<FLoreQueryHit> QueryLore(const FLoreQuery& Query) const;

	/** Shorthand: free-text query over every record kind. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	TArray<FLoreQueryHit> Ask(const FString& Text, int32 Limit = 5) const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	bool GetRealm(FName Id, FLoreRealm& OutRealm) const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	bool GetFaction(FName Id, FLoreFaction& OutFaction) const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	bool GetGlyph(FName Id, FLoreGlyph& OutGlyph) const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	TArray<FName> GetRealmIds() const;

	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	TArray<FName> InscribeIntent(const FString& Phrase) const { return Codex.Inscribe(Phrase); }

	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	FString TranslateGlyphs(const TArray<FName>& Glyphs) const { return Codex.Translate(Glyphs); }

	/** Records an event that happened at runtime (applies its shifts) and saves the codex. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	void RecordEvent(const FLoreEvent& Event);

	/** Advances history by the given number of eras. Returns the events that happened. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	TArray<FLoreEvent> Evolve(int32 Eras = 1);

	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	int32 GetEra() const { return Codex.GetEra(); }

	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	bool SaveCodex() const;

	/** Discards the evolved codex and reloads the founding one. */
	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	bool ResetToFounding();

	UFUNCTION(BlueprintCallable, Category = "Primordia|Lore")
	TArray<FString> ValidateCodex() const { return Codex.Validate(); }

	UPROPERTY(BlueprintAssignable, Category = "Primordia|Lore")
	FOnLoreChanged OnLoreChanged;

	FOnLoreChangedNative OnLoreChangedNative;

	/** Seed for evolution; history is reproducible per seed. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Primordia|Lore")
	int32 EvolutionSeed = 0x5EED1E55;

	FString GetFoundingPath() const;
	FString GetSavedPath() const;

private:
	void Broadcast();

	FLoreCodex Codex;
	FLoreEvolver Evolver;
};
