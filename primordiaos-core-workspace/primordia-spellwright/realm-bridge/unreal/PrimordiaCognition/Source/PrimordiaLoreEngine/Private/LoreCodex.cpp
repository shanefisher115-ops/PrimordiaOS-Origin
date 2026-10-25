#include "LoreCodex.h"

#include "PrimordiaLoreEngine.h"
#include "Dom/JsonObject.h"
#include "HAL/FileManager.h"
#include "JsonObjectConverter.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

namespace
{
	template <typename T>
	bool ReadArray(const TSharedPtr<FJsonObject>& Root, const TCHAR* Field, TArray<T>& Out, FString& OutError)
	{
		const TArray<TSharedPtr<FJsonValue>>* Values = nullptr;
		if (!Root->TryGetArrayField(Field, Values))
		{
			return true; // optional section
		}
		for (int32 i = 0; i < Values->Num(); ++i)
		{
			const TSharedPtr<FJsonObject>* Obj = nullptr;
			T Item;
			if (!(*Values)[i]->TryGetObject(Obj) || !FJsonObjectConverter::JsonObjectToUStruct(Obj->ToSharedRef(), &Item, 0, 0))
			{
				OutError = FString::Printf(TEXT("%s[%d] is not a valid %s"), Field, i, *T::StaticStruct()->GetName());
				return false;
			}
			Out.Add(MoveTemp(Item));
		}
		return true;
	}

	template <typename T>
	void WriteArray(const TSharedRef<FJsonObject>& Root, const TCHAR* Field, const TArray<const T*>& Items)
	{
		TArray<TSharedPtr<FJsonValue>> Values;
		for (const T* Item : Items)
		{
			TSharedRef<FJsonObject> Obj = MakeShared<FJsonObject>();
			FJsonObjectConverter::UStructToJsonObject(T::StaticStruct(), Item, Obj, 0, 0);
			Values.Add(MakeShared<FJsonValueObject>(Obj));
		}
		Root->SetArrayField(Field, Values);
	}

	template <typename T>
	TArray<const T*> SortedValues(const TMap<FName, T>& Map)
	{
		TArray<const T*> Out;
		for (const TPair<FName, T>& Pair : Map)
		{
			Out.Add(&Pair.Value);
		}
		Out.Sort([](const T& A, const T& B) { return A.Id.LexicalLess(B.Id); });
		return Out;
	}

	FString JoinNames(const TArray<FName>& Names)
	{
		FString Out;
		for (const FName& N : Names)
		{
			Out += N.ToString();
			Out += TEXT(' ');
		}
		return Out;
	}

	FString JoinStrings(const TArray<FString>& Strings)
	{
		return FString::Join(Strings, TEXT(" "));
	}
}

void FLoreCodex::Reset()
{
	Entries.Reset();
	Realms.Reset();
	Factions.Reset();
	Events.Reset();
	Glyphs.Reset();
	EventOrder.Reset();
	TokenIndex.Reset();
	RecordLengths.Reset();
	Era = 0;
	++Revision;
}

bool FLoreCodex::LoadFromJsonString(const FString& Json, FString& OutError)
{
	TSharedPtr<FJsonObject> Root;
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Json);
	if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
	{
		OutError = FString::Printf(TEXT("codex is not valid JSON: %s"), *Reader->GetErrorMessage());
		return false;
	}

	TArray<FLoreEntry> NewEntries;
	TArray<FLoreRealm> NewRealms;
	TArray<FLoreFaction> NewFactions;
	TArray<FLoreEvent> NewEvents;
	TArray<FLoreGlyph> NewGlyphs;
	if (!ReadArray(Root, TEXT("entries"), NewEntries, OutError) || !ReadArray(Root, TEXT("realms"), NewRealms, OutError) ||
		!ReadArray(Root, TEXT("factions"), NewFactions, OutError) || !ReadArray(Root, TEXT("events"), NewEvents, OutError) ||
		!ReadArray(Root, TEXT("glyphs"), NewGlyphs, OutError))
	{
		return false;
	}

	Reset();
	int32 LoadedEra = 0;
	Root->TryGetNumberField(TEXT("era"), LoadedEra);
	Era = LoadedEra;
	for (FLoreEntry& E : NewEntries) { AddEntry(E); }
	for (FLoreRealm& R : NewRealms) { AddRealm(R); }
	for (FLoreFaction& F : NewFactions) { AddFaction(F); }
	for (FLoreGlyph& G : NewGlyphs) { AddGlyph(G); }
	NewEvents.StableSort([](const FLoreEvent& A, const FLoreEvent& B) { return A.Era < B.Era; });
	for (FLoreEvent& Ev : NewEvents) { AddEvent(Ev); }
	return true;
}

FString FLoreCodex::SaveToJsonString() const
{
	const TSharedRef<FJsonObject> Root = MakeShared<FJsonObject>();
	Root->SetNumberField(TEXT("schema"), 1);
	Root->SetNumberField(TEXT("era"), Era);
	WriteArray(Root, TEXT("entries"), SortedValues(Entries));
	WriteArray(Root, TEXT("realms"), SortedValues(Realms));
	WriteArray(Root, TEXT("factions"), SortedValues(Factions));
	WriteArray(Root, TEXT("glyphs"), SortedValues(Glyphs));
	WriteArray(Root, TEXT("events"), GetHistory());

	FString Out;
	const TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Out);
	FJsonSerializer::Serialize(Root, Writer);
	return Out;
}

bool FLoreCodex::LoadFromFile(const FString& Path, FString& OutError)
{
	FString Json;
	if (!FFileHelper::LoadFileToString(Json, *Path))
	{
		OutError = FString::Printf(TEXT("cannot read %s"), *Path);
		return false;
	}
	return LoadFromJsonString(Json, OutError);
}

bool FLoreCodex::SaveToFile(const FString& Path) const
{
	IFileManager::Get().MakeDirectory(*FPaths::GetPath(Path), true);
	// Write next to the target and move it into place, so a crash never leaves half a codex.
	const FString Temp = Path + TEXT(".tmp");
	if (!FFileHelper::SaveStringToFile(SaveToJsonString(), *Temp, FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM))
	{
		return false;
	}
	return IFileManager::Get().Move(*Path, *Temp, true, true);
}

void FLoreCodex::AddEntry(const FLoreEntry& Entry)
{
	Entries.Add(Entry.Id, Entry);
	IndexRecord(Entry.Id, ELoreRecordKind::Entry, RecordText(Entry.Id, ELoreRecordKind::Entry));
	++Revision;
}

void FLoreCodex::AddRealm(const FLoreRealm& Realm)
{
	Realms.Add(Realm.Id, Realm);
	IndexRecord(Realm.Id, ELoreRecordKind::Realm, RecordText(Realm.Id, ELoreRecordKind::Realm));
	++Revision;
}

void FLoreCodex::AddFaction(const FLoreFaction& Faction)
{
	Factions.Add(Faction.Id, Faction);
	IndexRecord(Faction.Id, ELoreRecordKind::Faction, RecordText(Faction.Id, ELoreRecordKind::Faction));
	++Revision;
}

void FLoreCodex::AddEvent(const FLoreEvent& Event)
{
	if (!Events.Contains(Event.Id))
	{
		EventOrder.Add(Event.Id);
	}
	Events.Add(Event.Id, Event);
	IndexRecord(Event.Id, ELoreRecordKind::Event, RecordText(Event.Id, ELoreRecordKind::Event));
	++Revision;
}

void FLoreCodex::AddGlyph(const FLoreGlyph& Glyph)
{
	Glyphs.Add(Glyph.Id, Glyph);
	IndexRecord(Glyph.Id, ELoreRecordKind::Glyph, RecordText(Glyph.Id, ELoreRecordKind::Glyph));
	++Revision;
}

TArray<const FLoreEvent*> FLoreCodex::GetHistory() const
{
	TArray<const FLoreEvent*> Out;
	for (const FName& Id : EventOrder)
	{
		if (const FLoreEvent* E = Events.Find(Id))
		{
			Out.Add(E);
		}
	}
	Out.StableSort([](const FLoreEvent& A, const FLoreEvent& B) { return A.Era < B.Era; });
	return Out;
}

TArray<const FLoreFaction*> FLoreCodex::GetFactionsInRealm(FName RealmId) const
{
	TArray<const FLoreFaction*> Out;
	const FLoreRealm* Realm = Realms.Find(RealmId);
	for (const TPair<FName, FLoreFaction>& Pair : Factions)
	{
		const bool bListed = Realm && Realm->Factions.Contains(Pair.Key);
		if (bListed || Pair.Value.HomeRealm == RealmId)
		{
			Out.Add(&Pair.Value);
		}
	}
	Out.Sort([](const FLoreFaction& A, const FLoreFaction& B) { return A.Id.LexicalLess(B.Id); });
	return Out;
}

FString FLoreCodex::RecordText(FName Id, ELoreRecordKind Kind) const
{
	switch (Kind)
	{
	case ELoreRecordKind::Entry:
		if (const FLoreEntry* E = Entries.Find(Id))
		{
			return E->Title + TEXT(" ") + E->Body + TEXT(" ") + JoinNames(E->Tags);
		}
		break;
	case ELoreRecordKind::Realm:
		if (const FLoreRealm* R = Realms.Find(Id))
		{
			return R->Name + TEXT(" ") + R->Domain + TEXT(" ") + R->Description + TEXT(" ") + JoinStrings(R->Laws) + TEXT(" ") + Id.ToString();
		}
		break;
	case ELoreRecordKind::Faction:
		if (const FLoreFaction* F = Factions.Find(Id))
		{
			return F->Name + TEXT(" ") + F->Creed + TEXT(" ") + JoinStrings(F->Tenets) + TEXT(" ") + F->School.ToString();
		}
		break;
	case ELoreRecordKind::Event:
		if (const FLoreEvent* Ev = Events.Find(Id))
		{
			return Ev->Title + TEXT(" ") + Ev->Account + TEXT(" ") + Ev->Realm.ToString();
		}
		break;
	case ELoreRecordKind::Glyph:
		if (const FLoreGlyph* G = Glyphs.Find(Id))
		{
			return G->Name + TEXT(" ") + G->Meaning + TEXT(" ") + G->School.ToString();
		}
		break;
	}
	return FString();
}

FString FLoreCodex::RecordTitle(FName Id, ELoreRecordKind Kind) const
{
	switch (Kind)
	{
	case ELoreRecordKind::Entry: if (const FLoreEntry* E = Entries.Find(Id)) { return E->Title; } break;
	case ELoreRecordKind::Realm: if (const FLoreRealm* R = Realms.Find(Id)) { return R->Name; } break;
	case ELoreRecordKind::Faction: if (const FLoreFaction* F = Factions.Find(Id)) { return F->Name; } break;
	case ELoreRecordKind::Event: if (const FLoreEvent* Ev = Events.Find(Id)) { return Ev->Title; } break;
	case ELoreRecordKind::Glyph: if (const FLoreGlyph* G = Glyphs.Find(Id)) { return G->Name; } break;
	}
	return Id.ToString();
}

void FLoreCodex::IndexRecord(FName Id, ELoreRecordKind Kind, const FString& Text)
{
	const FIndexKey Key{Id, Kind};
	// Re-indexing a record (an update) first removes its old postings.
	if (RecordLengths.Contains(Key))
	{
		for (TPair<FString, TMap<FIndexKey, int32>>& Posting : TokenIndex)
		{
			Posting.Value.Remove(Key);
		}
	}
	const TArray<FString> Tokens = FLoreText::Tokenize(Text);
	for (const FString& Token : Tokens)
	{
		TokenIndex.FindOrAdd(Token).FindOrAdd(Key)++;
	}
	RecordLengths.Add(Key, FMath::Max(1, Tokens.Num()));
}

void FLoreCodex::RebuildIndex()
{
	TokenIndex.Reset();
	RecordLengths.Reset();
	for (const TPair<FName, FLoreEntry>& P : Entries) { IndexRecord(P.Key, ELoreRecordKind::Entry, RecordText(P.Key, ELoreRecordKind::Entry)); }
	for (const TPair<FName, FLoreRealm>& P : Realms) { IndexRecord(P.Key, ELoreRecordKind::Realm, RecordText(P.Key, ELoreRecordKind::Realm)); }
	for (const TPair<FName, FLoreFaction>& P : Factions) { IndexRecord(P.Key, ELoreRecordKind::Faction, RecordText(P.Key, ELoreRecordKind::Faction)); }
	for (const TPair<FName, FLoreEvent>& P : Events) { IndexRecord(P.Key, ELoreRecordKind::Event, RecordText(P.Key, ELoreRecordKind::Event)); }
	for (const TPair<FName, FLoreGlyph>& P : Glyphs) { IndexRecord(P.Key, ELoreRecordKind::Glyph, RecordText(P.Key, ELoreRecordKind::Glyph)); }
}

bool FLoreCodex::RecordMatchesFilters(FName Id, ELoreRecordKind Kind, const FLoreQuery& Q) const
{
	if (Q.Kinds.Num() > 0 && !Q.Kinds.Contains(Kind))
	{
		return false;
	}
	switch (Kind)
	{
	case ELoreRecordKind::Entry:
	{
		const FLoreEntry* E = Entries.Find(Id);
		if (!E) { return false; }
		if (Q.Categories.Num() > 0 && !Q.Categories.Contains(E->Category)) { return false; }
		for (const FName& Tag : Q.RequiredTags) { if (!E->Tags.Contains(Tag)) { return false; } }
		if (E->Era < Q.MinEra || E->Era > Q.MaxEra) { return false; }
		if (!Q.Realm.IsNone() && !E->Links.Contains(Q.Realm) && !E->Tags.Contains(Q.Realm)) { return false; }
		if (!Q.Faction.IsNone() && !E->Links.Contains(Q.Faction) && !E->Tags.Contains(Q.Faction)) { return false; }
		return true;
	}
	case ELoreRecordKind::Realm:
	{
		const FLoreRealm* R = Realms.Find(Id);
		if (!R || Q.RequiredTags.Num() > 0 || Q.Categories.Num() > 0) { return false; }
		if (!Q.Realm.IsNone() && Id != Q.Realm) { return false; }
		if (!Q.Faction.IsNone() && !R->Factions.Contains(Q.Faction)) { return false; }
		return true;
	}
	case ELoreRecordKind::Faction:
	{
		const FLoreFaction* F = Factions.Find(Id);
		if (!F || Q.RequiredTags.Num() > 0 || Q.Categories.Num() > 0) { return false; }
		if (!Q.Faction.IsNone() && Id != Q.Faction) { return false; }
		if (!Q.Realm.IsNone())
		{
			const FLoreRealm* R = Realms.Find(Q.Realm);
			if (F->HomeRealm != Q.Realm && !(R && R->Factions.Contains(Id))) { return false; }
		}
		return true;
	}
	case ELoreRecordKind::Event:
	{
		const FLoreEvent* Ev = Events.Find(Id);
		if (!Ev || Q.RequiredTags.Num() > 0 || Q.Categories.Num() > 0) { return false; }
		if (Ev->Era < Q.MinEra || Ev->Era > Q.MaxEra) { return false; }
		if (!Q.Realm.IsNone() && Ev->Realm != Q.Realm) { return false; }
		if (!Q.Faction.IsNone() && !Ev->Factions.Contains(Q.Faction)) { return false; }
		return true;
	}
	case ELoreRecordKind::Glyph:
	{
		const FLoreGlyph* G = Glyphs.Find(Id);
		if (!G || Q.RequiredTags.Num() > 0 || Q.Categories.Num() > 0) { return false; }
		if (!Q.Realm.IsNone())
		{
			// A glyph belongs to a realm when its school is allowed there.
			const FLoreRealm* R = Realms.Find(Q.Realm);
			if (!R || R->ForbiddenSchools.Contains(G->School) || (R->AllowedSchools.Num() > 0 && !R->AllowedSchools.Contains(G->School)))
			{
				return false;
			}
		}
		if (!Q.Faction.IsNone())
		{
			const FLoreFaction* F = Factions.Find(Q.Faction);
			if (!F || F->School != G->School) { return false; }
		}
		return true;
	}
	}
	return false;
}

float FLoreCodex::RecordWeight(FName Id, ELoreRecordKind Kind) const
{
	switch (Kind)
	{
	case ELoreRecordKind::Entry: if (const FLoreEntry* E = Entries.Find(Id)) { return E->Weight; } break;
	case ELoreRecordKind::Faction: if (const FLoreFaction* F = Factions.Find(Id)) { return 0.75f + F->Influence; } break;
	case ELoreRecordKind::Event: if (const FLoreEvent* Ev = Events.Find(Id)) { return Ev->bMythic ? 1.2f : 1.f; } break;
	default: break;
	}
	return 1.f;
}

TArray<FLoreQueryHit> FLoreCodex::Query(const FLoreQuery& Q) const
{
	TMap<FIndexKey, float> Scores;
	const TArray<FString> Tokens = FLoreText::Tokenize(Q.Text);
	const float RecordCount = FMath::Max(1, RecordLengths.Num());

	if (Tokens.Num() == 0)
	{
		for (const TPair<FIndexKey, int32>& Rec : RecordLengths)
		{
			Scores.Add(Rec.Key, RecordWeight(Rec.Key.Id, Rec.Key.Kind));
		}
	}
	else
	{
		// TF-IDF with length normalisation: rare words that appear densely in a record rank it highest.
		for (const FString& Token : Tokens)
		{
			const TMap<FIndexKey, int32>* Postings = TokenIndex.Find(Token);
			if (!Postings || Postings->Num() == 0)
			{
				continue;
			}
			const float Idf = FMath::Loge(1.f + RecordCount / Postings->Num());
			for (const TPair<FIndexKey, int32>& Post : *Postings)
			{
				const float Tf = Post.Value / FMath::Sqrt(static_cast<float>(RecordLengths.FindRef(Post.Key)));
				Scores.FindOrAdd(Post.Key) += Tf * Idf;
			}
		}
		for (TPair<FIndexKey, float>& S : Scores)
		{
			S.Value *= RecordWeight(S.Key.Id, S.Key.Kind);
		}
	}

	TArray<FLoreQueryHit> Hits;
	for (const TPair<FIndexKey, float>& S : Scores)
	{
		if (!RecordMatchesFilters(S.Key.Id, S.Key.Kind, Q))
		{
			continue;
		}
		FLoreQueryHit& Hit = Hits.AddDefaulted_GetRef();
		Hit.Id = S.Key.Id;
		Hit.Kind = S.Key.Kind;
		Hit.Score = S.Value;
		Hit.Title = RecordTitle(S.Key.Id, S.Key.Kind);
		Hit.Text = RecordText(S.Key.Id, S.Key.Kind);
	}
	Hits.Sort([](const FLoreQueryHit& A, const FLoreQueryHit& B)
	{
		return A.Score != B.Score ? A.Score > B.Score : A.Id.LexicalLess(B.Id);
	});
	if (Q.Limit > 0 && Hits.Num() > Q.Limit)
	{
		Hits.SetNum(Q.Limit);
	}
	return Hits;
}

TArray<FLoreQueryHit> FLoreQuery::Execute(const FLoreCodex& Codex) const
{
	return Codex.Query(*this);
}

TArray<FName> FLoreCodex::Inscribe(const FString& Phrase) const
{
	// Phoneme table, longest first so digraphs win.
	TArray<TPair<FString, FName>> Phonemes;
	for (const TPair<FName, FLoreGlyph>& G : Glyphs)
	{
		// Any glyph that carries a sound is a letter; composed sigils have none.
		if (!G.Value.Phoneme.IsEmpty())
		{
			Phonemes.Emplace(G.Value.Phoneme.ToLower(), G.Key);
		}
	}
	Phonemes.Sort([](const TPair<FString, FName>& A, const TPair<FString, FName>& B)
	{
		return A.Key.Len() != B.Key.Len() ? A.Key.Len() > B.Key.Len() : A.Key < B.Key;
	});

	const FString Lower = Phrase.ToLower();
	TArray<FName> Out;
	int32 i = 0;
	while (i < Lower.Len())
	{
		const TCHAR C = Lower[i];
		if (!FChar::IsAlpha(C) || C == 'a' || C == 'e' || C == 'i' || C == 'o' || C == 'u' || C == 'y')
		{
			++i;
			continue;
		}
		bool bMatched = false;
		for (const TPair<FString, FName>& P : Phonemes)
		{
			if (Lower.Mid(i, P.Key.Len()) == P.Key)
			{
				Out.AddUnique(P.Value);
				i += P.Key.Len();
				bMatched = true;
				break;
			}
		}
		if (!bMatched)
		{
			++i;
		}
	}
	return Out;
}

FString FLoreCodex::Translate(const TArray<FName>& GlyphIds) const
{
	TArray<FString> Parts;
	for (const FName& Id : GlyphIds)
	{
		if (const FLoreGlyph* G = Glyphs.Find(Id))
		{
			Parts.Add(G->Meaning);
		}
	}
	return FString::Join(Parts, TEXT(" / "));
}

TArray<FName> FLoreCodex::FindSigilsIn(const TArray<FName>& GlyphIds) const
{
	TArray<FName> Out;
	for (const TPair<FName, FLoreGlyph>& G : Glyphs)
	{
		if (G.Value.Kind != ELoreGlyphKind::Sigil || G.Value.Composes.Num() == 0)
		{
			continue;
		}
		bool bAll = true;
		for (const FName& Part : G.Value.Composes)
		{
			bAll &= GlyphIds.Contains(Part);
		}
		if (bAll)
		{
			Out.Add(G.Key);
		}
	}
	Out.Sort(FNameLexicalLess());
	return Out;
}

FName FLoreCodex::DominantSchool(const TArray<FName>& GlyphIds) const
{
	TMap<FName, int32> Counts;
	for (const FName& Id : GlyphIds)
	{
		if (const FLoreGlyph* G = Glyphs.Find(Id))
		{
			if (!G->School.IsNone())
			{
				Counts.FindOrAdd(G->School)++;
			}
		}
	}
	FName Best;
	int32 BestCount = 0;
	for (const TPair<FName, int32>& C : Counts)
	{
		if (C.Value > BestCount || (C.Value == BestCount && C.Key.LexicalLess(Best)))
		{
			Best = C.Key;
			BestCount = C.Value;
		}
	}
	return Best;
}

TArray<FString> FLoreCodex::Validate() const
{
	TArray<FString> Issues;
	auto Exists = [this](FName Id)
	{
		return Entries.Contains(Id) || Realms.Contains(Id) || Factions.Contains(Id) || Events.Contains(Id) || Glyphs.Contains(Id);
	};
	for (const TPair<FName, FLoreEntry>& E : Entries)
	{
		for (const FName& L : E.Value.Links)
		{
			if (!Exists(L)) { Issues.Add(FString::Printf(TEXT("entry %s links unknown %s"), *E.Key.ToString(), *L.ToString())); }
		}
	}
	for (const TPair<FName, FLoreRealm>& R : Realms)
	{
		for (const FName& F : R.Value.Factions)
		{
			if (!Factions.Contains(F)) { Issues.Add(FString::Printf(TEXT("realm %s lists unknown faction %s"), *R.Key.ToString(), *F.ToString())); }
		}
		for (const TPair<FName, float>& M : R.Value.Metaphysics)
		{
			if (M.Value < 0.f || M.Value > 1.f) { Issues.Add(FString::Printf(TEXT("realm %s %s=%.3f is outside 0..1"), *R.Key.ToString(), *M.Key.ToString(), M.Value)); }
		}
		if (R.Value.Stability < 0.f || R.Value.Stability > 1.f) { Issues.Add(FString::Printf(TEXT("realm %s stability outside 0..1"), *R.Key.ToString())); }
	}
	for (const TPair<FName, FLoreFaction>& F : Factions)
	{
		if (!F.Value.HomeRealm.IsNone() && !Realms.Contains(F.Value.HomeRealm)) { Issues.Add(FString::Printf(TEXT("faction %s has unknown home realm %s"), *F.Key.ToString(), *F.Value.HomeRealm.ToString())); }
		for (const FName& A : F.Value.Allies) { if (!Factions.Contains(A)) { Issues.Add(FString::Printf(TEXT("faction %s allies unknown %s"), *F.Key.ToString(), *A.ToString())); } }
		for (const FName& A : F.Value.Rivals) { if (!Factions.Contains(A)) { Issues.Add(FString::Printf(TEXT("faction %s rivals unknown %s"), *F.Key.ToString(), *A.ToString())); } }
	}
	for (const TPair<FName, FLoreEvent>& Ev : Events)
	{
		if (!Ev.Value.Realm.IsNone() && !Realms.Contains(Ev.Value.Realm)) { Issues.Add(FString::Printf(TEXT("event %s in unknown realm %s"), *Ev.Key.ToString(), *Ev.Value.Realm.ToString())); }
	}
	TMap<FString, FName> SeenPhonemes;
	for (const TPair<FName, FLoreGlyph>& G : Glyphs)
	{
		for (const FName& Part : G.Value.Composes)
		{
			if (!Glyphs.Contains(Part)) { Issues.Add(FString::Printf(TEXT("sigil %s composes unknown glyph %s"), *G.Key.ToString(), *Part.ToString())); }
		}
		if (!G.Value.Phoneme.IsEmpty())
		{
			const FString P = G.Value.Phoneme.ToLower();
			if (const FName* Other = SeenPhonemes.Find(P)) { Issues.Add(FString::Printf(TEXT("glyphs %s and %s share phoneme '%s'"), *Other->ToString(), *G.Key.ToString(), *P)); }
			SeenPhonemes.Add(P, G.Key);
		}
	}
	return Issues;
}
