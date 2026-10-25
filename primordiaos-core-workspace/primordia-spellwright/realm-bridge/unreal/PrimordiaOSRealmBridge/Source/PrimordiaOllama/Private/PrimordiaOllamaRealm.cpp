#include "PrimordiaOllamaRealm.h"
#include "Interfaces/IPluginManager.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Policies/CondensedJsonPrintPolicy.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

namespace
{
	const TCHAR* LayerKinds[] = { TEXT("ground"), TEXT("ocean"), TEXT("sky"), TEXT("ring"), TEXT("lattice"), TEXT("void"), TEXT("spire_field") };
	const TCHAR* TopologyKinds[] = { TEXT("lattice"), TEXT("small_world"), TEXT("scale_free"), TEXT("toroidal"), TEXT("fractal_tree") };
	const TCHAR* GlyphKinds[] = { TEXT("soul"), TEXT("sigil"), TEXT("ward"), TEXT("gate") };

	struct FParamRange { const TCHAR* Name; double Min; double Max; bool bInt; };
	const FParamRange ParamRanges[] = {
		{ TEXT("roughness"), 0, 1, false }, { TEXT("terrace_count"), 1, 12, true }, { TEXT("wave_height"), 0, 10, false },
		{ TEXT("wave_speed"), 0, 5, false }, { TEXT("star_count"), 0, 5000, true }, { TEXT("thickness"), 0.1, 50, false },
		{ TEXT("tilt_deg"), -90, 90, false }, { TEXT("cell_size"), 1, 50, false }, { TEXT("aperture"), 0, 1, false },
		{ TEXT("max_height"), 1, 200, false },
		// Composition params (PRS-1 §3.3), all optional.
		{ TEXT("monolith_clusters"), 0, 24, true }, { TEXT("cluster_spread"), 1, 40, false }, { TEXT("rubble"), 0, 1, false },
		{ TEXT("islet_count"), 0, 32, true }, { TEXT("band_strength"), 0, 1, false }, { TEXT("band_tilt_deg"), -90, 90, false },
		{ TEXT("keystones"), 0, 24, true }, { TEXT("gap_count"), 0, 6, true }, { TEXT("arc"), 0.05, 1, false },
		{ TEXT("struts"), 0, 1, false }, { TEXT("spire_clusters"), 1, 16, true }, { TEXT("falloff"), 0.25, 4, false },
		{ TEXT("debris"), 0, 1, false },
	};

	TArray<const TCHAR*> ParamsFor(const FString& Kind)
	{
		if (Kind == TEXT("ground")) return { TEXT("roughness"), TEXT("terrace_count"), TEXT("monolith_clusters"), TEXT("cluster_spread"), TEXT("rubble") };
		if (Kind == TEXT("ocean")) return { TEXT("wave_height"), TEXT("wave_speed"), TEXT("islet_count") };
		if (Kind == TEXT("sky")) return { TEXT("star_count"), TEXT("band_strength"), TEXT("band_tilt_deg") };
		if (Kind == TEXT("ring")) return { TEXT("thickness"), TEXT("tilt_deg"), TEXT("keystones"), TEXT("gap_count"), TEXT("arc") };
		if (Kind == TEXT("lattice")) return { TEXT("cell_size"), TEXT("struts") };
		if (Kind == TEXT("void")) return { TEXT("aperture"), TEXT("debris") };
		if (Kind == TEXT("spire_field")) return { TEXT("max_height"), TEXT("spire_clusters"), TEXT("falloff") };
		return {};
	}

	template <int32 N>
	bool OneOf(const FString& Value, const TCHAR* (&Options)[N])
	{
		for (const TCHAR* O : Options)
		{
			if (Value == O) return true;
		}
		return false;
	}

	double R4(double V) { return FMath::RoundToDouble(V * 10000.0) / 10000.0; }

	uint32 Fnv1a(const FString& S)
	{
		uint32 H = 0x811c9dc5u;
		for (const TCHAR C : S)
		{
			H = (H ^ static_cast<uint16>(C)) * 0x01000193u;
		}
		return H;
	}

	/** Collects repair notes while sanitizing values. */
	struct FRepairer
	{
		TArray<FString>& Repairs;

		double Num(const TSharedPtr<FJsonObject>& O, const FString& Field, double Default, double Min, double Max, const FString& What, bool bInt = false)
		{
			double V = 0;
			if (!O.IsValid() || !O->TryGetNumberField(Field, V) || !FMath::IsFinite(V))
			{
				if (!What.IsEmpty()) Repairs.Add(What + TEXT(" defaulted"));
				return Default;
			}
			const double In = bInt ? FMath::RoundToDouble(V) : V;
			const double Out = FMath::Clamp(In, Min, Max);
			if (!What.IsEmpty() && Out != In) Repairs.Add(FString::Printf(TEXT("%s clamped %g->%g"), *What, V, Out));
			return bInt ? Out : R4(Out);
		}

		/** [r,g,b] with components clamped to 0..2; false if not a 3-number array. */
		bool Color(const TSharedPtr<FJsonValue>& V, TArray<double>& Out)
		{
			const TArray<TSharedPtr<FJsonValue>>* A = nullptr;
			if (!V.IsValid() || !V->TryGetArray(A) || A->Num() < 3) return false;
			Out.Reset();
			for (int32 i = 0; i < 3; ++i)
			{
				double C = 0;
				if (!(*A)[i]->TryGetNumber(C) || !FMath::IsFinite(C)) return false;
				Out.Add(R4(FMath::Clamp(C, 0.0, 2.0)));
			}
			return true;
		}

		/** Glyph position: x,y within ±60 m, z within -10..60 m. */
		bool Position(const TSharedPtr<FJsonValue>& V, TArray<double>& Out)
		{
			const TArray<TSharedPtr<FJsonValue>>* A = nullptr;
			if (!V.IsValid() || !V->TryGetArray(A) || A->Num() < 3) return false;
			double P[3];
			for (int32 i = 0; i < 3; ++i)
			{
				if (!(*A)[i]->TryGetNumber(P[i]) || !FMath::IsFinite(P[i])) return false;
			}
			Out = { R4(FMath::Clamp(P[0], -60.0, 60.0)), R4(FMath::Clamp(P[1], -60.0, 60.0)), R4(FMath::Clamp(P[2], -10.0, 60.0)) };
			return true;
		}
	};

	TSharedRef<FJsonValueArray> NumberArray(const TArray<double>& Values)
	{
		TArray<TSharedPtr<FJsonValue>> Items;
		for (double V : Values) Items.Add(MakeShared<FJsonValueNumber>(V));
		return MakeShared<FJsonValueArray>(Items);
	}

	TArray<TSharedPtr<FJsonValue>> ArrayField(const TSharedPtr<FJsonObject>& O, const TCHAR* Field)
	{
		const TArray<TSharedPtr<FJsonValue>>* A = nullptr;
		return (O.IsValid() && O->TryGetArrayField(Field, A)) ? *A : TArray<TSharedPtr<FJsonValue>>();
	}

	TSharedPtr<FJsonObject> ObjectField(const TSharedPtr<FJsonObject>& O, const TCHAR* Field)
	{
		const TSharedPtr<FJsonObject>* Found = nullptr;
		return (O.IsValid() && O->TryGetObjectField(Field, Found)) ? *Found : nullptr;
	}
}

bool PrimordiaOllamaRealm::LoadPromptResource(FString& OutSystemPrompt, FString& OutSchemaJson, FString& OutError)
{
	const TSharedPtr<IPlugin> Plugin = IPluginManager::Get().FindPlugin(TEXT("PrimordiaOSRealmBridge"));
	if (!Plugin.IsValid())
	{
		OutError = TEXT("PrimordiaOSRealmBridge plugin not found");
		return false;
	}
	const FString Path = FPaths::Combine(Plugin->GetBaseDir(), TEXT("Resources/Ollama/realm_prompt.json"));
	FString Text;
	if (!FFileHelper::LoadFileToString(Text, *Path))
	{
		OutError = FString::Printf(TEXT("Cannot read %s (packaged builds: stage the plugin's Resources/Ollama folder)"), *Path);
		return false;
	}
	TSharedPtr<FJsonObject> Root;
	if (!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text), Root) || !Root.IsValid())
	{
		OutError = FString::Printf(TEXT("%s is not valid JSON"), *Path);
		return false;
	}
	const TSharedPtr<FJsonObject> Schema = ObjectField(Root, TEXT("schema"));
	if (!Root->TryGetStringField(TEXT("system"), OutSystemPrompt) || !Schema.IsValid())
	{
		OutError = FString::Printf(TEXT("%s needs \"system\" and \"schema\""), *Path);
		return false;
	}
	const TSharedRef<TJsonWriter<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>> Writer = TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&OutSchemaJson);
	FJsonSerializer::Serialize(Schema.ToSharedRef(), Writer);
	return true;
}

TSharedRef<FJsonObject> PrimordiaOllamaRealm::RepairManifest(const TSharedPtr<FJsonObject>& Raw, uint32 SeedOverride, TArray<FString>& OutRepairs)
{
	FRepairer R{ OutRepairs };

	// Name and seed.
	FString RealmName;
	if (Raw.IsValid()) Raw->TryGetStringField(TEXT("realm_name"), RealmName);
	RealmName = RealmName.TrimStartAndEnd().Left(64);
	if (RealmName.IsEmpty())
	{
		RealmName = TEXT("Unnamed Realm");
		OutRepairs.Add(TEXT("realm_name defaulted"));
	}
	const uint32 Seed = SeedOverride > 0 ? SeedOverride : Fnv1a(RealmName);

	// Metaphysics.
	const TSharedPtr<FJsonObject> M = ObjectField(Raw, TEXT("metaphysics"));
	const TSharedRef<FJsonObject> Meta = MakeShared<FJsonObject>();
	const TPair<const TCHAR*, double> MetaDefaults[] = {
		{ TEXT("entropy"), 0.35 }, { TEXT("luminosity"), 0.7 }, { TEXT("coherence"), 0.6 },
		{ TEXT("resonance"), 0.5 }, { TEXT("inversion"), 0.2 }, { TEXT("lucidity"), 0.55 },
	};
	for (const TPair<const TCHAR*, double>& D : MetaDefaults)
	{
		Meta->SetNumberField(D.Key, R.Num(M, D.Key, D.Value, 0, 1, FString(TEXT("metaphysics.")) + D.Key));
	}
	Meta->SetNumberField(TEXT("time_dilation"), R.Num(M, TEXT("time_dilation"), 1, 0.25, 4, TEXT("metaphysics.time_dilation")));
	TArray<double> Essence;
	if (!R.Color(M.IsValid() ? M->TryGetField(TEXT("essence")) : nullptr, Essence))
	{
		Essence = { 1, 0.42, 0.28 };
		OutRepairs.Add(TEXT("metaphysics.essence defaulted"));
	}
	Meta->SetField(TEXT("essence"), NumberArray(Essence));
	const double Lucidity = Meta->GetNumberField(TEXT("lucidity"));

	// Layers.
	const TArray<TSharedPtr<FJsonValue>> RawLayers = ArrayField(Raw, TEXT("layers"));
	TArray<TSharedPtr<FJsonValue>> Layers;
	int32 Dropped = 0;
	for (const TSharedPtr<FJsonValue>& V : RawLayers)
	{
		const TSharedPtr<FJsonObject> L = V.IsValid() ? V->AsObject() : nullptr;
		FString Kind;
		if (!L.IsValid() || !L->TryGetStringField(TEXT("kind"), Kind) || !OneOf(Kind, LayerKinds) || Layers.Num() >= 8)
		{
			++Dropped;
			continue;
		}
		const int32 i = Layers.Num();
		const FString At = FString::Printf(TEXT("layers[%d]"), i);
		const bool bSky = Kind == TEXT("sky");

		const TSharedRef<FJsonObject> Out = MakeShared<FJsonObject>();
		Out->SetStringField(TEXT("id"), FString::Printf(TEXT("%s-%d"), *Kind, i));
		Out->SetStringField(TEXT("kind"), Kind);
		Out->SetNumberField(TEXT("order"), i);
		Out->SetNumberField(TEXT("altitude"), R.Num(L, TEXT("altitude"), bSky ? 80 : 0, -50, 300, At + TEXT(".altitude")));
		Out->SetNumberField(TEXT("radius"), R.Num(L, TEXT("radius"), bSky ? 180 : 120, 5, 400, At + TEXT(".radius")));
		Out->SetNumberField(TEXT("density"), R.Num(L, TEXT("density"), 0.5, 0, 1, At + TEXT(".density")));

		TArray<TSharedPtr<FJsonValue>> Palette;
		for (const TSharedPtr<FJsonValue>& C : ArrayField(L, TEXT("palette")))
		{
			TArray<double> Rgb;
			if (Palette.Num() < 4 && R.Color(C, Rgb)) Palette.Add(NumberArray(Rgb));
		}
		if (Palette.Num() < 2) OutRepairs.Add(At + TEXT(".palette padded"));
		while (Palette.Num() < 2)
		{
			Palette.Add(NumberArray(Palette.Num() ? TArray<double>{ 0.1, 0.1, 0.12 } : TArray<double>{ 0.5, 0.5, 0.55 }));
		}
		Out->SetArrayField(TEXT("palette"), Palette);

		const TSharedPtr<FJsonObject> P = ObjectField(L, TEXT("params"));
		const TSharedRef<FJsonObject> Params = MakeShared<FJsonObject>();
		for (const TCHAR* Key : ParamsFor(Kind))
		{
			double Value = 0;
			if (P.IsValid() && P->TryGetNumberField(Key, Value) && FMath::IsFinite(Value))
			{
				for (const FParamRange& Range : ParamRanges)
				{
					if (FCString::Strcmp(Range.Name, Key) == 0)
					{
						Params->SetNumberField(Key, R.Num(P, Key, Range.Min, Range.Min, Range.Max, At + TEXT(".params.") + Key, Range.bInt));
					}
				}
			}
		}
		Out->SetObjectField(TEXT("params"), Params);
		Layers.Add(MakeShared<FJsonValueObject>(Out));
	}
	if (Dropped > 0) OutRepairs.Add(FString::Printf(TEXT("dropped %d layer(s)"), Dropped));
	if (Layers.IsEmpty())
	{
		OutRepairs.Add(TEXT("added ground layer"));
		const TSharedRef<FJsonObject> Ground = MakeShared<FJsonObject>();
		Ground->SetStringField(TEXT("id"), TEXT("ground-0"));
		Ground->SetStringField(TEXT("kind"), TEXT("ground"));
		Ground->SetNumberField(TEXT("order"), 0);
		Ground->SetNumberField(TEXT("altitude"), 0);
		Ground->SetNumberField(TEXT("radius"), 120);
		Ground->SetNumberField(TEXT("density"), 0.5);
		TArray<TSharedPtr<FJsonValue>> GroundPalette;
		GroundPalette.Add(NumberArray({ 0.5, 0.5, 0.55 }));
		GroundPalette.Add(NumberArray({ 0.1, 0.1, 0.12 }));
		Ground->SetArrayField(TEXT("palette"), GroundPalette);
		Ground->SetObjectField(TEXT("params"), MakeShared<FJsonObject>());
		Layers.Add(MakeShared<FJsonValueObject>(Ground));
	}

	// Topology.
	const TSharedPtr<FJsonObject> T = ObjectField(Raw, TEXT("topology"));
	FString TopoKind;
	if (!T.IsValid() || !T->TryGetStringField(TEXT("kind"), TopoKind) || !OneOf(TopoKind, TopologyKinds))
	{
		TopoKind = TEXT("small_world");
		OutRepairs.Add(TEXT("topology.kind defaulted"));
	}
	const TSharedRef<FJsonObject> Topology = MakeShared<FJsonObject>();
	Topology->SetStringField(TEXT("kind"), TopoKind);
	Topology->SetNumberField(TEXT("node_count"), R.Num(T, TEXT("node_count"), 48, 16, 128, TEXT("topology.node_count"), true));
	Topology->SetNumberField(TEXT("edge_density"), R.Num(T, TEXT("edge_density"), 0.5, 0, 1, TEXT("topology.edge_density")));
	Topology->SetNumberField(TEXT("radius"), 18);
	Topology->SetField(TEXT("center"), NumberArray({ 0, 0, 22 }));

	// Glyphs: exactly one soul.
	TArray<TSharedPtr<FJsonValue>> Glyphs;
	bool bHasSoul = false;
	int32 Index = 0;
	for (const TSharedPtr<FJsonValue>& V : ArrayField(Raw, TEXT("glyphs")))
	{
		const TSharedPtr<FJsonObject> G = V.IsValid() ? V->AsObject() : nullptr;
		FString Kind;
		if (!G.IsValid() || !G->TryGetStringField(TEXT("kind"), Kind) || !OneOf(Kind, GlyphKinds) || Index >= 8)
		{
			continue;
		}
		const int32 i = Index++;
		const FString At = FString::Printf(TEXT("glyphs[%d]"), i);
		if (Kind == TEXT("soul") && bHasSoul)
		{
			Kind = TEXT("sigil");
			OutRepairs.Add(At + TEXT(" second soul -> sigil"));
		}
		const bool bSoul = Kind == TEXT("soul");
		const TSharedRef<FJsonObject> Out = MakeShared<FJsonObject>();
		Out->SetStringField(TEXT("id"), bSoul ? FString(TEXT("soul")) : FString::Printf(TEXT("%s-%d"), *Kind, i));
		Out->SetStringField(TEXT("kind"), Kind);
		TArray<double> Pos;
		if (!R.Position(G->TryGetField(TEXT("position")), Pos))
		{
			Pos = bSoul ? TArray<double>{ 0, 0, 14 } : TArray<double>{ 0, 30, 8 };
			OutRepairs.Add(At + TEXT(".position defaulted"));
		}
		Out->SetField(TEXT("position"), NumberArray(Pos));
		Out->SetNumberField(TEXT("scale"), R.Num(G, TEXT("scale"), bSoul ? 6 : 4, 1, 10, At + TEXT(".scale")));
		Out->SetNumberField(TEXT("symmetry"), R.Num(G, TEXT("symmetry"), 6, 1, 64, At + TEXT(".symmetry"), true));
		Out->SetNumberField(TEXT("complexity"), R.Num(G, TEXT("complexity"), 0.5, 0, 1, At + TEXT(".complexity")));
		Out->SetNumberField(TEXT("hue"), R.Num(G, TEXT("hue"), 0.6, 0, 1, At + TEXT(".hue")));
		if (bSoul)
		{
			Out->SetStringField(TEXT("bound_to"), TEXT("soul"));
			bHasSoul = true;
		}
		Glyphs.Add(MakeShared<FJsonValueObject>(Out));
	}
	if (!bHasSoul)
	{
		OutRepairs.Add(TEXT("added soul glyph"));
		const TSharedRef<FJsonObject> Soul = MakeShared<FJsonObject>();
		Soul->SetStringField(TEXT("id"), TEXT("soul"));
		Soul->SetStringField(TEXT("kind"), TEXT("soul"));
		Soul->SetField(TEXT("position"), NumberArray({ 0, 0, 14 }));
		Soul->SetNumberField(TEXT("scale"), 6);
		Soul->SetNumberField(TEXT("symmetry"), 6);
		Soul->SetNumberField(TEXT("complexity"), Lucidity);
		Soul->SetNumberField(TEXT("hue"), 0.62);
		Soul->SetStringField(TEXT("bound_to"), TEXT("soul"));
		Glyphs.Insert(MakeShared<FJsonValueObject>(Soul), 0);
	}

	const TSharedRef<FJsonObject> Bounds = MakeShared<FJsonObject>();
	Bounds->SetNumberField(TEXT("radius"), 120);

	const TSharedRef<FJsonObject> Manifest = MakeShared<FJsonObject>();
	Manifest->SetStringField(TEXT("prs"), TEXT("1.0"));
	Manifest->SetStringField(TEXT("realm_id"), FString::Printf(TEXT("realm-llm-%08x"), Seed));
	Manifest->SetStringField(TEXT("realm_name"), RealmName);
	Manifest->SetNumberField(TEXT("seed"), Seed);
	Manifest->SetNumberField(TEXT("revision"), 0);
	Manifest->SetNumberField(TEXT("transition_seconds"), 4);
	Manifest->SetObjectField(TEXT("bounds"), Bounds);
	Manifest->SetArrayField(TEXT("layers"), Layers);
	Manifest->SetObjectField(TEXT("metaphysics"), Meta);
	Manifest->SetObjectField(TEXT("topology"), Topology);
	Manifest->SetArrayField(TEXT("glyphs"), Glyphs);
	return Manifest;
}
