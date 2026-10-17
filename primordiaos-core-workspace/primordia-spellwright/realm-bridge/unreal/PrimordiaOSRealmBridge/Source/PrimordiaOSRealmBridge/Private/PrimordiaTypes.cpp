#include "PrimordiaTypes.h"
#include "PrimordiaJson.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

namespace PrimordiaPacketType
{
	struct FEntry { const TCHAR* Name; EPrimordiaPacketType Type; };
	static const FEntry GEntries[] = {
		{ TEXT("hello"), EPrimordiaPacketType::Hello },
		{ TEXT("heart_beat"), EPrimordiaPacketType::HeartBeat },
		{ TEXT("cosmic_web"), EPrimordiaPacketType::CosmicWeb },
		{ TEXT("fate_weave"), EPrimordiaPacketType::FateWeave },
		{ TEXT("soul_unification"), EPrimordiaPacketType::SoulUnification },
		{ TEXT("dream_nebula"), EPrimordiaPacketType::DreamNebula },
		{ TEXT("shadow_inversion"), EPrimordiaPacketType::ShadowInversion },
		{ TEXT("realm_manifest"), EPrimordiaPacketType::RealmManifest },
		{ TEXT("ack"), EPrimordiaPacketType::Ack },
		{ TEXT("pong"), EPrimordiaPacketType::Pong },
	};

	EPrimordiaPacketType FromString(const FString& Name)
	{
		for (const FEntry& E : GEntries)
		{
			if (Name.Equals(E.Name, ESearchCase::CaseSensitive))
			{
				return E.Type;
			}
		}
		return EPrimordiaPacketType::Unknown;
	}

	FString ToString(EPrimordiaPacketType Type)
	{
		for (const FEntry& E : GEntries)
		{
			if (E.Type == Type)
			{
				return E.Name;
			}
		}
		return TEXT("unknown");
	}

	bool IsVisual(EPrimordiaPacketType Type)
	{
		switch (Type)
		{
		case EPrimordiaPacketType::HeartBeat:
		case EPrimordiaPacketType::CosmicWeb:
		case EPrimordiaPacketType::FateWeave:
		case EPrimordiaPacketType::SoulUnification:
		case EPrimordiaPacketType::DreamNebula:
		case EPrimordiaPacketType::ShadowInversion:
			return true;
		default:
			return false;
		}
	}

	bool IsCoalescible(EPrimordiaPacketType Type)
	{
		return IsVisual(Type);
	}
}

bool FPrimordiaPacket::Parse(const FString& Text, FPrimordiaPacket& Out, FString& OutError)
{
	TSharedPtr<FJsonObject> Root;
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Text);
	if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
	{
		OutError = FString::Printf(TEXT("malformed JSON: %s"), *Reader->GetErrorMessage());
		return false;
	}

	const int32 Prs = PrimordiaJson::Int(Root, TEXT("prs"), 0);
	if (Prs != 1)
	{
		OutError = FString::Printf(TEXT("unsupported PRS version %d"), Prs);
		return false;
	}

	Out.TypeName = PrimordiaJson::Str(Root, TEXT("type"));
	Out.Type = PrimordiaPacketType::FromString(Out.TypeName);
	if (Out.Type == EPrimordiaPacketType::Unknown)
	{
		OutError = FString::Printf(TEXT("unknown packet type '%s'"), *Out.TypeName);
		return false;
	}

	Out.Op = PrimordiaJson::Str(Root, TEXT("op")) == TEXT("retire") ? EPrimordiaPacketOp::Retire : EPrimordiaPacketOp::Upsert;
	Out.EntityId = PrimordiaJson::Str(Root, TEXT("id"));
	Out.RealmId = PrimordiaJson::Str(Root, TEXT("realm"));
	Out.Seq = static_cast<int64>(PrimordiaJson::Num(Root, TEXT("seq")));
	Out.SimTime = PrimordiaJson::Num(Root, TEXT("t"));
	Out.TimestampMs = static_cast<int64>(PrimordiaJson::Num(Root, TEXT("ts")));
	Out.ReceivedAt = FPlatformTime::Seconds();
	Out.Payload = PrimordiaJson::Obj(Root, TEXT("payload"));
	if (!Out.Payload.IsValid())
	{
		Out.Payload = MakeShared<FJsonObject>();
	}
	if (Out.EntityId.IsEmpty())
	{
		OutError = TEXT("packet has no id");
		return false;
	}
	return true;
}

FPrimordiaPacketInfo FPrimordiaPacketInfo::From(const FPrimordiaPacket& P)
{
	FPrimordiaPacketInfo Info;
	Info.Type = P.Type;
	Info.TypeName = P.TypeName;
	Info.Op = P.Op;
	Info.EntityId = P.EntityId;
	Info.RealmId = P.RealmId;
	Info.Seq = P.Seq;
	Info.SimTime = P.SimTime;
	return Info;
}

uint32 FPrimordiaRealmLayer::StructuralHash() const
{
	uint32 Hash = GetTypeHash(Kind);
	Hash = HashCombine(Hash, GetTypeHash(Altitude));
	Hash = HashCombine(Hash, GetTypeHash(Radius));
	for (const FLinearColor& C : Palette)
	{
		Hash = HashCombine(Hash, GetTypeHash(C));
	}
	TArray<FString> Keys;
	Params.GetKeys(Keys);
	Keys.Sort();
	for (const FString& Key : Keys)
	{
		Hash = HashCombine(Hash, HashCombine(GetTypeHash(Key), GetTypeHash(Params[Key])));
	}
	return Hash;
}

FPrimordiaMetaphysics FPrimordiaMetaphysics::Lerp(const FPrimordiaMetaphysics& A, const FPrimordiaMetaphysics& B, float Alpha)
{
	FPrimordiaMetaphysics M;
	M.Entropy = FMath::Lerp(A.Entropy, B.Entropy, Alpha);
	M.Luminosity = FMath::Lerp(A.Luminosity, B.Luminosity, Alpha);
	M.Coherence = FMath::Lerp(A.Coherence, B.Coherence, Alpha);
	M.Resonance = FMath::Lerp(A.Resonance, B.Resonance, Alpha);
	M.Inversion = FMath::Lerp(A.Inversion, B.Inversion, Alpha);
	M.Lucidity = FMath::Lerp(A.Lucidity, B.Lucidity, Alpha);
	M.TimeDilation = FMath::Lerp(A.TimeDilation, B.TimeDilation, Alpha);
	M.Essence = FLinearColor::LerpUsingHSV(A.Essence, B.Essence, Alpha);
	return M;
}

// ---------------------------------------------------------------------------
// PRS-1 manifest parsing. Validation mirrors node-bridge/src/schemas.js; on
// any error in a required field the whole manifest is rejected (PRS-1 §6.4).
// ---------------------------------------------------------------------------

namespace
{
	// Layer params that are lengths in meters and must be scaled to cm.
	const TCHAR* GLengthParams[] = { TEXT("thickness"), TEXT("cell_size"), TEXT("max_height"), TEXT("wave_height") };

	bool IsLengthParam(const FString& Key)
	{
		for (const TCHAR* Name : GLengthParams)
		{
			if (Key == Name)
			{
				return true;
			}
		}
		return false;
	}

	bool Require(const TSharedPtr<FJsonObject>& O, const TCHAR* Field, const FString& Where, FString& OutError)
	{
		if (!O.IsValid() || !O->HasField(Field))
		{
			OutError = FString::Printf(TEXT("%s.%s: required"), *Where, Field);
			return false;
		}
		return true;
	}
}

bool FPrimordiaRealmManifest::FromJson(const TSharedPtr<FJsonObject>& J, float UnitsPerMeter, FPrimordiaRealmManifest& Out, FString& OutError)
{
	using namespace PrimordiaJson;
	for (const TCHAR* Field : { TEXT("prs"), TEXT("realm_name"), TEXT("seed"), TEXT("layers"), TEXT("metaphysics"), TEXT("topology"), TEXT("glyphs") })
	{
		if (!Require(J, Field, TEXT("$"), OutError))
		{
			return false;
		}
	}
	Out = FPrimordiaRealmManifest();
	Out.Prs = Str(J, TEXT("prs"));
	if (!Out.Prs.StartsWith(TEXT("1.")))
	{
		OutError = FString::Printf(TEXT("$.prs: unsupported version '%s'"), *Out.Prs);
		return false;
	}
	Out.RealmName = Str(J, TEXT("realm_name"));
	Out.Seed = static_cast<int64>(Num(J, TEXT("seed")));
	Out.RealmId = Str(J, TEXT("realm_id"), FString::Printf(TEXT("realm-%08llx"), static_cast<uint64>(Out.Seed) & 0xffffffffull));
	Out.Revision = Int(J, TEXT("revision"), 0);
	Out.TransitionSeconds = Num(J, TEXT("transition_seconds"), 4.0);
	Out.BoundsRadius = Num(Obj(J, TEXT("bounds")), TEXT("radius"), 120.0) * UnitsPerMeter;

	if (const TArray<TSharedPtr<FJsonValue>>* Layers = Arr(J, TEXT("layers")))
	{
		for (int32 i = 0; i < Layers->Num(); ++i)
		{
			const TSharedPtr<FJsonObject> L = (*Layers)[i]->AsObject();
			const FString Where = FString::Printf(TEXT("$.layers[%d]"), i);
			for (const TCHAR* Field : { TEXT("id"), TEXT("kind"), TEXT("order"), TEXT("altitude"), TEXT("radius"), TEXT("density") })
			{
				if (!Require(L, Field, Where, OutError))
				{
					return false;
				}
			}
			FPrimordiaRealmLayer& Layer = Out.Layers.AddDefaulted_GetRef();
			Layer.Id = Str(L, TEXT("id"));
			Layer.Kind = FName(*Str(L, TEXT("kind")));
			Layer.Order = Int(L, TEXT("order"));
			Layer.Altitude = Num(L, TEXT("altitude")) * UnitsPerMeter;
			Layer.Radius = Num(L, TEXT("radius")) * UnitsPerMeter;
			Layer.Density = FMath::Clamp<float>(Num(L, TEXT("density")), 0.f, 1.f);
			if (const TArray<TSharedPtr<FJsonValue>>* Palette = Arr(L, TEXT("palette")))
			{
				for (const TSharedPtr<FJsonValue>& C : *Palette)
				{
					Layer.Palette.Add(ColorFromValue(C));
				}
			}
			if (const TSharedPtr<FJsonObject> Params = Obj(L, TEXT("params")))
			{
				for (const TPair<FString, TSharedPtr<FJsonValue>>& Pair : Params->Values)
				{
					double V = 0;
					if (Pair.Value.IsValid() && Pair.Value->TryGetNumber(V))
					{
						Layer.Params.Add(Pair.Key, IsLengthParam(Pair.Key) ? V * UnitsPerMeter : V);
					}
				}
			}
		}
		Out.Layers.Sort([](const FPrimordiaRealmLayer& A, const FPrimordiaRealmLayer& B) { return A.Order < B.Order; });
	}

	{
		const TSharedPtr<FJsonObject> M = Obj(J, TEXT("metaphysics"));
		for (const TCHAR* Field : { TEXT("entropy"), TEXT("luminosity"), TEXT("coherence"), TEXT("resonance"), TEXT("inversion"), TEXT("lucidity"), TEXT("time_dilation"), TEXT("essence") })
		{
			if (!Require(M, Field, TEXT("$.metaphysics"), OutError))
			{
				return false;
			}
		}
		FPrimordiaMetaphysics& Meta = Out.Metaphysics;
		Meta.Entropy = FMath::Clamp<float>(Num(M, TEXT("entropy")), 0.f, 1.f);
		Meta.Luminosity = FMath::Clamp<float>(Num(M, TEXT("luminosity")), 0.f, 1.f);
		Meta.Coherence = FMath::Clamp<float>(Num(M, TEXT("coherence")), 0.f, 1.f);
		Meta.Resonance = FMath::Clamp<float>(Num(M, TEXT("resonance")), 0.f, 1.f);
		Meta.Inversion = FMath::Clamp<float>(Num(M, TEXT("inversion")), 0.f, 1.f);
		Meta.Lucidity = FMath::Clamp<float>(Num(M, TEXT("lucidity")), 0.f, 1.f);
		Meta.TimeDilation = FMath::Clamp<float>(Num(M, TEXT("time_dilation"), 1.0), 0.05f, 8.f);
		Meta.Essence = Color(M, TEXT("essence"), Meta.Essence);
	}

	{
		const TSharedPtr<FJsonObject> T = Obj(J, TEXT("topology"));
		for (const TCHAR* Field : { TEXT("kind"), TEXT("node_count"), TEXT("edge_density"), TEXT("radius") })
		{
			if (!Require(T, Field, TEXT("$.topology"), OutError))
			{
				return false;
			}
		}
		Out.Topology.Kind = FName(*Str(T, TEXT("kind")));
		Out.Topology.NodeCount = FMath::Clamp(Int(T, TEXT("node_count")), 1, 4096);
		Out.Topology.EdgeDensity = FMath::Clamp<float>(Num(T, TEXT("edge_density")), 0.f, 1.f);
		Out.Topology.RadiusMeters = Num(T, TEXT("radius"));
		Out.Topology.CenterMeters = Vec(T, TEXT("center"), FVector(0, 0, 22));
	}

	if (const TArray<TSharedPtr<FJsonValue>>* Glyphs = Arr(J, TEXT("glyphs")))
	{
		for (int32 i = 0; i < Glyphs->Num(); ++i)
		{
			const TSharedPtr<FJsonObject> G = (*Glyphs)[i]->AsObject();
			const FString Where = FString::Printf(TEXT("$.glyphs[%d]"), i);
			for (const TCHAR* Field : { TEXT("id"), TEXT("kind"), TEXT("position"), TEXT("scale"), TEXT("symmetry"), TEXT("complexity"), TEXT("hue") })
			{
				if (!Require(G, Field, Where, OutError))
				{
					return false;
				}
			}
			FPrimordiaGlyphSpec& Glyph = Out.Glyphs.AddDefaulted_GetRef();
			Glyph.Id = Str(G, TEXT("id"));
			Glyph.Kind = FName(*Str(G, TEXT("kind")));
			Glyph.Position = Vec(G, TEXT("position"), FVector::ZeroVector, UnitsPerMeter);
			Glyph.Scale = Num(G, TEXT("scale"), 3.0) * UnitsPerMeter;
			Glyph.Symmetry = FMath::Clamp(Int(G, TEXT("symmetry"), 6), 1, 64);
			Glyph.Complexity = FMath::Clamp<float>(Num(G, TEXT("complexity")), 0.f, 1.f);
			Glyph.Hue = FMath::Frac(Num(G, TEXT("hue")));
			Glyph.BoundTo = Str(G, TEXT("bound_to"));
			Glyph.Intent = Str(G, TEXT("intent"));
		}
	}

	if (Out.Layers.Num() == 0)
	{
		OutError = TEXT("$.layers: a realm needs at least one layer");
		return false;
	}
	Out.SourceJson = ToString(J);
	return true;
}

bool FPrimordiaRealmManifest::FromJsonString(const FString& Text, float UnitsPerMeter, FPrimordiaRealmManifest& Out, FString& OutError)
{
	const TSharedPtr<FJsonObject> J = PrimordiaJson::Parse(Text);
	if (!J.IsValid())
	{
		OutError = TEXT("malformed JSON");
		return false;
	}
	// Accept either a bare manifest or a whole realm_manifest envelope.
	if (const TSharedPtr<FJsonObject> Payload = PrimordiaJson::Obj(J, TEXT("payload")))
	{
		return FromJson(Payload, UnitsPerMeter, Out, OutError);
	}
	return FromJson(J, UnitsPerMeter, Out, OutError);
}
