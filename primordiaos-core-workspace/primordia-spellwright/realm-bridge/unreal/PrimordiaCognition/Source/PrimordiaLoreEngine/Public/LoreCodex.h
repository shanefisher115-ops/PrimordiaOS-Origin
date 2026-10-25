#pragma once

#include "CoreMinimal.h"
#include "LoreTypes.h"

/**
 * The full lore database: entries, realms, factions, events and glyphs, with a token index for
 * text queries and the glyph language (Inscribe / Translate).
 *
 * Plain C++ so every module (and worker threads that copy it) can use it without UObjects.
 * UPrimordiaLoreSubsystem owns the live instance.
 */
class PRIMORDIALOREENGINE_API FLoreCodex
{
public:
	/** Bumped on every change, so readers can cache derived data. */
	uint64 GetRevision() const { return Revision; }
	int32 GetEra() const { return Era; }
	void SetEra(int32 InEra) { Era = InEra; ++Revision; }

	bool LoadFromJsonString(const FString& Json, FString& OutError);
	FString SaveToJsonString() const;
	bool LoadFromFile(const FString& Path, FString& OutError);
	bool SaveToFile(const FString& Path) const;

	void AddEntry(const FLoreEntry& Entry);
	void AddRealm(const FLoreRealm& Realm);
	void AddFaction(const FLoreFaction& Faction);
	void AddEvent(const FLoreEvent& Event);
	void AddGlyph(const FLoreGlyph& Glyph);

	const FLoreEntry* FindEntry(FName Id) const { return Entries.Find(Id); }
	const FLoreRealm* FindRealm(FName Id) const { return Realms.Find(Id); }
	const FLoreFaction* FindFaction(FName Id) const { return Factions.Find(Id); }
	const FLoreEvent* FindEvent(FName Id) const { return Events.Find(Id); }
	const FLoreGlyph* FindGlyph(FName Id) const { return Glyphs.Find(Id); }
	FLoreRealm* FindRealmMutable(FName Id) { ++Revision; return Realms.Find(Id); }
	FLoreFaction* FindFactionMutable(FName Id) { ++Revision; return Factions.Find(Id); }

	const TMap<FName, FLoreEntry>& GetEntries() const { return Entries; }
	const TMap<FName, FLoreRealm>& GetRealms() const { return Realms; }
	const TMap<FName, FLoreFaction>& GetFactions() const { return Factions; }
	const TMap<FName, FLoreEvent>& GetEvents() const { return Events; }
	const TMap<FName, FLoreGlyph>& GetGlyphs() const { return Glyphs; }
	TMap<FName, FLoreFaction>& GetFactionsMutable() { ++Revision; return Factions; }

	/** Events in chronological order (era, then insertion). */
	TArray<const FLoreEvent*> GetHistory() const;

	/** Factions that hold influence in a realm (listed by the realm, or whose home it is). */
	TArray<const FLoreFaction*> GetFactionsInRealm(FName RealmId) const;

	TArray<FLoreQueryHit> Query(const FLoreQuery& Query) const;

	/**
	 * Writes a phrase in the glyph language: its distinct consonants, each mapped to the glyph whose
	 * phoneme carries it (longest phoneme first, so "th" wins over "t"). Unmapped consonants are skipped.
	 */
	TArray<FName> Inscribe(const FString& Phrase) const;

	/** Reads a glyph sequence back as the meanings of its glyphs, joined by " / ". */
	FString Translate(const TArray<FName>& GlyphIds) const;

	/** The sigils whose composing glyphs all appear in the given sequence. */
	TArray<FName> FindSigilsIn(const TArray<FName>& GlyphIds) const;

	/** The dominant school of a glyph sequence (most frequent non-empty school). */
	FName DominantSchool(const TArray<FName>& GlyphIds) const;

	/** Checks references (links, realm factions, sigil composition) and value ranges. */
	TArray<FString> Validate() const;

	void Reset();

private:
	void IndexRecord(FName Id, ELoreRecordKind Kind, const FString& Text);
	void RebuildIndex();
	FString RecordText(FName Id, ELoreRecordKind Kind) const;
	FString RecordTitle(FName Id, ELoreRecordKind Kind) const;
	bool RecordMatchesFilters(FName Id, ELoreRecordKind Kind, const FLoreQuery& Q) const;
	float RecordWeight(FName Id, ELoreRecordKind Kind) const;

	TMap<FName, FLoreEntry> Entries;
	TMap<FName, FLoreRealm> Realms;
	TMap<FName, FLoreFaction> Factions;
	TMap<FName, FLoreEvent> Events;
	TMap<FName, FLoreGlyph> Glyphs;
	TArray<FName> EventOrder;

	struct FIndexKey
	{
		FName Id;
		ELoreRecordKind Kind;
		bool operator==(const FIndexKey& O) const { return Id == O.Id && Kind == O.Kind; }
		friend uint32 GetTypeHash(const FIndexKey& K) { return HashCombine(GetTypeHash(K.Id), (uint32)K.Kind); }
	};
	/** token -> records containing it, with term frequency. */
	TMap<FString, TMap<FIndexKey, int32>> TokenIndex;
	TMap<FIndexKey, int32> RecordLengths;

	int32 Era = 0;
	uint64 Revision = 1;
};
