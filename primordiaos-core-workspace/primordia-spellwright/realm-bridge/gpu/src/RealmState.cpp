#include "primordia/gpu/RealmState.h"

#include <algorithm>
#include <cctype>
#include <cmath>

namespace primordia::gpu
{
namespace
{
float Clamp01(double V)
{
	return static_cast<float>(std::clamp(V, 0.0, 1.0));
}

uint32_t KindFromString(const std::string& Kind)
{
	if (Kind == "soul") return MCP_GLYPH_SOUL;
	if (Kind == "ward") return MCP_GLYPH_WARD;
	if (Kind == "gate") return MCP_GLYPH_GATE;
	return MCP_GLYPH_SIGIL;
}

} // namespace

void Metaphysics::Apply(const Json& J)
{
	Entropy = Clamp01(J.Get("entropy", Entropy));
	Luminosity = Clamp01(J.Get("luminosity", Luminosity));
	Coherence = Clamp01(J.Get("coherence", Coherence));
	Resonance = Clamp01(J.Get("resonance", Resonance));
	Inversion = Clamp01(J.Get("inversion", Inversion));
	Lucidity = Clamp01(J.Get("lucidity", Lucidity));
	TimeDilation = static_cast<float>(std::clamp(J.Get("time_dilation", TimeDilation), 0.05, 8.0));
	const Json& E = J["essence"];
	if (E.IsArray() && E.Size() == 3)
	{
		for (int I = 0; I < 3; ++I)
		{
			Essence[I] = static_cast<float>(std::clamp(E[I].Number(Essence[I]), 0.0, 64.0));
		}
	}
}

bool RealmState::ApplyManifest(const Json& M, std::string& Error)
{
	// PRS-1 §3.2: reject, never partially apply, a manifest missing a required field.
	for (const char* Field : { "prs", "realm_name", "seed", "layers", "metaphysics", "topology", "glyphs" })
	{
		if (M[Field].IsNull())
		{
			Error = std::string("manifest is missing ") + Field;
			return false;
		}
	}
	if (M["prs"].String().rfind("1.", 0) != 0)
	{
		Error = "unsupported PRS version " + M["prs"].String();
		return false;
	}
	const Json& Layers = M["layers"];
	if (!Layers.IsArray() || Layers.Size() == 0)
	{
		Error = "manifest has no layers";
		return false;
	}

	const uint32_t NewSeed = static_cast<uint32_t>(static_cast<int64_t>(M.Get("seed", 0)) & 0xFFFFFFFFll);
	char DefaultId[32];
	std::snprintf(DefaultId, sizeof(DefaultId), "realm-%08x", NewSeed);
	const std::string NewId = M.GetString("realm_id", DefaultId);
	if (NewId != RealmId || NewSeed != Seed)
	{
		bGenesis = true; // a different realm: rebuild its ground from scratch
	}
	RealmId = NewId;
	RealmName = M.GetString("realm_name", RealmName);
	Seed = NewSeed;
	Revision = static_cast<uint32_t>(M.Get("revision", 0));
	BoundsRadius = static_cast<float>(M["bounds"].Get("radius", 120.0));
	Meta.Apply(M["metaphysics"]);

	for (const Json& L : Layers.Items())
	{
		if (L.GetString("kind") == "ground")
		{
			GroundRadius = static_cast<float>(std::clamp(L.Get("radius", GroundRadius), 8.0, 4000.0));
			TerraceCount = static_cast<float>(std::clamp(L["params"].Get("terrace_count", TerraceCount), 1.0, 12.0));
			Roughness = Clamp01(L["params"].Get("roughness", Roughness));
		}
	}

	Glyphs.clear();
	for (const Json& G : M["glyphs"].Items())
	{
		if (Glyphs.size() >= MCP_MAX_SIGILS)
		{
			break; // the evaluator's per-group counters cap glyphs at MCP_MAX_SIGILS
		}
		GlyphSpec S;
		S.Id = G.GetString("id");
		S.Kind = KindFromString(G.GetString("kind", "sigil"));
		const Json& P = G["position"];
		for (int I = 0; I < 3; ++I)
		{
			S.Position[I] = static_cast<float>(P[I].Number(0.0));
		}
		S.Scale = static_cast<float>(std::clamp(G.Get("scale", 3.0), 0.1, 200.0));
		S.Symmetry = static_cast<uint32_t>(std::clamp(G.Get("symmetry", 6.0), 1.0, 64.0));
		S.Complexity = Clamp01(G.Get("complexity", 0.5));
		S.Hue = static_cast<float>(G.Get("hue", 0.6) - std::floor(G.Get("hue", 0.6)));
		S.bBound = !G.GetString("bound_to").empty();
		S.Intent = G.GetString("intent", S.Id);
		Glyphs.push_back(std::move(S));
	}
	return true;
}

uint32_t IntentHash(const std::string& Intent)
{
	return PrimordiaMCP::IntentHash(Intent.data(), Intent.size());
}

RealmParams RealmState::Params() const
{
	RealmParams P;
	P.Seed = Seed;
	P.Entropy = Meta.Entropy;
	P.Luminosity = Meta.Luminosity;
	P.Coherence = Meta.Coherence;
	P.Resonance = Meta.Resonance;
	P.Inversion = Meta.Inversion;
	P.Lucidity = Meta.Lucidity;
	P.TimeDilation = Meta.TimeDilation;
	for (int I = 0; I < 3; ++I)
	{
		P.Essence[I] = Meta.Essence[I];
	}
	P.GroundRadius = GroundRadius;
	P.TerraceCount = TerraceCount;
	P.Roughness = Roughness;
	return P;
}

std::vector<GlyphParams> RealmState::GlyphParamsList() const
{
	std::vector<GlyphParams> Out;
	Out.reserve(Glyphs.size());
	for (const GlyphSpec& G : Glyphs)
	{
		GlyphParams P;
		P.Kind = G.Kind;
		for (int I = 0; I < 3; ++I)
		{
			P.Position[I] = G.Position[I];
		}
		P.Diameter = G.Scale;
		P.Symmetry = G.Symmetry;
		P.Complexity = G.Complexity;
		P.Hue = G.Hue;
		P.bBound = G.bBound;
		P.IntentHash = IntentHash(G.Intent.empty() ? G.Id : G.Intent);
		Out.push_back(P);
	}
	return Out;
}

std::vector<FSigilGPU> RealmState::BuildSigils() const
{
	std::vector<FSigilGPU> Out;
	for (const GlyphParams& G : GlyphParamsList())
	{
		Out.push_back(PrimordiaMCP::MakeSigil(G));
	}
	return Out;
}

float4 RealmState::FieldBox(const MCPConfig& Config) const
{
	const std::vector<GlyphParams> G = GlyphParamsList();
	return PrimordiaMCP::FieldBox(G.data(), G.size(), Params(), Config);
}

FRealmTickGPU RealmState::BuildTick(const MCPConfig& Config, uint32_t ActorCount, uint32_t SigilCount, uint32_t BTNodeCount) const
{
	return PrimordiaMCP::BuildTick(Params(), Config, FieldBox(Config), Tick, Time, Dt, ActorCount, SigilCount, BTNodeCount, bGenesis);
}

std::vector<FActorGPU> SpawnPopulation(const RealmState& Realm, uint32_t Count, uint32_t PilgrimRoot, uint32_t WardenRoot)
{
	const RealmParams P = Realm.Params();
	std::vector<FActorGPU> Actors(Count);
	for (uint32_t I = 0; I < Count; ++I)
	{
		Actors[I] = PrimordiaMCP::SpawnActor(P, I, PilgrimRoot, WardenRoot);
	}
	return Actors;
}

RealmState DefaultRealm()
{
	RealmState R;
	auto Add = [&R](const char* Id, uint32_t Kind, float X, float Y, float Z, float Scale, uint32_t Symmetry, float Complexity, float Hue, const char* Intent)
	{
		GlyphSpec G;
		G.Id = Id;
		G.Kind = Kind;
		G.Position[0] = X;
		G.Position[1] = Y;
		G.Position[2] = Z;
		G.Scale = Scale;
		G.Symmetry = Symmetry;
		G.Complexity = Complexity;
		G.Hue = Hue;
		G.bBound = Kind == MCP_GLYPH_SOUL;
		G.Intent = Intent;
		R.Glyphs.push_back(G);
	};
	Add("soul", MCP_GLYPH_SOUL, 0.f, 0.f, 14.f, 6.f, 6, 0.5f, 0.62f, "LUMENNE HOLLOW");
	Add("sigil-0", MCP_GLYPH_GATE, -3.805f, -31.773f, 10.92f, 3.07f, 3, 0.4f, 0.635f, "RETURN THE DAWN OF LUMENNE");
	Add("sigil-1", MCP_GLYPH_GATE, 17.32f, 26.91f, 12.61f, 4.08f, 8, 0.33f, 0.454f, "CROSS THE DAWN OF LUMENNE");
	// Not in the genesis example: a ward, so the reference realm exercises fear and flight.
	Add("ward-0", MCP_GLYPH_WARD, 34.f, -12.f, 9.5f, 5.f, 5, 0.7f, 0.02f, "GUARD THE DREAM OF LUMENNE");
	return R;
}
} // namespace primordia::gpu
