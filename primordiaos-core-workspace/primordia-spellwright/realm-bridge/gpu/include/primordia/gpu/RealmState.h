// The realm as the GPU engine sees it: a PRS-1 manifest reduced to what the MCP kernels and
// the renderer consume, plus the running tick clock. PrimordiaOS stays the author: this state
// is (re)built from the manifests and metaphysics the realm bridge sends.
#pragma once

#include "MCPHost.h"
#include "MCPTypes.ush"
#include "primordia/gpu/Json.h"

#include <cstdint>
#include <string>
#include <vector>

namespace primordia::gpu
{
using namespace PrimordiaMCP;

struct Metaphysics
{
	float Entropy = 0.35f;
	float Luminosity = 0.7f;
	float Coherence = 0.6f;
	float Resonance = 0.5f;
	float Inversion = 0.2f;
	float Lucidity = 0.55f;
	float TimeDilation = 1.f;
	float Essence[3] = { 1.f, 0.42f, 0.28f };

	/** Reads a PRS-1 metaphysics object; absent fields keep their current value. */
	void Apply(const Json& J);
};

struct GlyphSpec
{
	std::string Id;
	uint32_t Kind = MCP_GLYPH_SIGIL;
	float Position[3] = { 0, 0, 0 };
	float Scale = 3.f; // diameter, m
	uint32_t Symmetry = 6;
	float Complexity = 0.5f;
	float Hue = 0.6f;
	bool bBound = false;
	std::string Intent;
};

/** Grid and capacity settings (shared with Unreal: Shaders/Shared/MCPHost.h). */
using MCPConfig = PrimordiaMCP::GridConfig;

struct RealmState
{
	std::string RealmId = "realm-5eed1e55";
	std::string RealmName = "Lumenne Hollow";
	uint32_t Seed = 0x5eed1e55u;
	uint32_t Revision = 0;
	Metaphysics Meta;
	float GroundRadius = 120.f;
	float TerraceCount = 5.f;
	float Roughness = 0.22f;
	float BoundsRadius = 120.f;
	std::vector<GlyphSpec> Glyphs;

	// Running clock (advanced by the realm loop).
	uint64_t Tick = 0;      // last tick submitted (ticks start at 1)
	double Time = 0.0;      // realm time, s (dilated)
	float Dt = 1.f / 60.f;  // wall dt of the current tick, s
	bool bGenesis = true;   // next tick snaps the terrain to its target

	/** The realm in the shared host form (MCPHost.h). */
	RealmParams Params() const;
	std::vector<GlyphParams> GlyphParamsList() const;
	float MaxTerrainHeight() const { return PrimordiaMCP::MaxTerrainHeight(Params()); }
	float SeaLevel() const { return PrimordiaMCP::SeaLevel(Params()); }

	/** Replaces the realm from a PRS-1 manifest. A different realm_id restarts genesis. */
	bool ApplyManifest(const Json& Manifest, std::string& Error);

	/** The glyphs as sigil-evaluator records (intent -> deterministic phase). */
	std::vector<FSigilGPU> BuildSigils() const;
	/** The per-tick record every kernel reads. */
	FRealmTickGPU BuildTick(const MCPConfig& Config, uint32_t ActorCount, uint32_t SigilCount, uint32_t BTNodeCount) const;
	/** Sigil field box: a cube around the glyphs, padded by their reach (xyz min, voxel size). */
	float4 FieldBox(const MCPConfig& Config) const;
};

/** FNV-1a of the upper-cased intent: the same intent gives the same glyph everywhere. */
uint32_t IntentHash(const std::string& Intent);

/** A deterministic population: pilgrims and (every fifth) wardens scattered over the ground. */
std::vector<FActorGPU> SpawnPopulation(const RealmState& Realm, uint32_t Count, uint32_t PilgrimRoot, uint32_t WardenRoot);

/** The reference realm used when no manifest has arrived: examples/genesis-5eed1e55 plus one ward. */
RealmState DefaultRealm();
} // namespace primordia::gpu
