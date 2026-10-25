// Host-side MCP math shared by both hosts (header-only C++17): the standalone Vulkan engine
// (realm-bridge/gpu) and Unreal's MCPComputeBridge build the GPU records with these same
// functions, so one realm produces the same tick, sigils and population on either side.
#pragma once

#include "MCPTypes.ush"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>

namespace PrimordiaMCP
{
/** Same PCG hash as the kernels (MCPCommon.ush). */
inline uint32_t Pcg(uint32_t V)
{
	const uint32_t State = V * 747796405u + 2891336453u;
	const uint32_t Word = ((State >> ((State >> 28u) + 4u)) ^ State) * 277803737u;
	return (Word >> 22u) ^ Word;
}

inline float PcgUnit(uint32_t& State)
{
	State = Pcg(State);
	return static_cast<float>(State >> 8) * (1.f / 16777216.f);
}

/** FNV-1a of the ASCII-upper-cased intent: the same intent gives the same glyph everywhere. */
inline uint32_t IntentHash(const char* Utf8, size_t Length)
{
	uint32_t H = 2166136261u;
	for (size_t I = 0; I < Length; ++I)
	{
		uint8_t C = static_cast<uint8_t>(Utf8[I]);
		if (C >= 'a' && C <= 'z')
		{
			C = static_cast<uint8_t>(C - 'a' + 'A');
		}
		H ^= C;
		H *= 16777619u;
	}
	return H;
}

/** A realm as the kernels need it (PRS-1 metaphysics and ground layer, lengths in meters). */
struct RealmParams
{
	uint32_t Seed = 0x5eed1e55u;
	float Entropy = 0.35f;
	float Luminosity = 0.7f;
	float Coherence = 0.6f;
	float Resonance = 0.5f;
	float Inversion = 0.2f;
	float Lucidity = 0.55f;
	float TimeDilation = 1.f;
	float Essence[3] = { 1.f, 0.42f, 0.28f };
	float GroundRadius = 120.f;
	float TerraceCount = 5.f;
	float Roughness = 0.22f;
};

inline float MaxTerrainHeight(const RealmParams& R)
{
	return 0.12f * R.GroundRadius;
}

inline float SeaLevel(const RealmParams& R)
{
	return 0.15f * MaxTerrainHeight(R);
}

/** Grid and capacity settings shared by the kernels and both hosts. */
struct GridConfig
{
	uint32_t TerrainN = 256;      // height-field cells per side
	uint32_t FieldN = 64;         // sigil-field voxels per side
	uint32_t MaxActors = 4096;
	uint32_t MaxStructures = 1024;
	uint32_t MemoryInterval = 30; // ticks between periodic episode samples
	float RecallMinAge = 1.0f;    // s; younger memories are not recalled
	float CommitSeconds = 0.75f;  // action commitment before an actor may switch
};

struct GlyphParams
{
	uint32_t Kind = MCP_GLYPH_SIGIL;
	float Position[3] = { 0.f, 0.f, 0.f }; // m
	float Diameter = 3.f;                  // m
	uint32_t Symmetry = 6;
	float Complexity = 0.5f;
	float Hue = 0.6f;
	bool bBound = false;
	uint32_t IntentHash = 0;
};

inline FSigilGPU MakeSigil(const GlyphParams& G)
{
	FSigilGPU S{};
	S.PosScale = { G.Position[0], G.Position[1], G.Position[2], G.Diameter };
	S.Shape = { static_cast<float>(G.Symmetry), G.Complexity, G.Hue, static_cast<float>(G.Kind) };
	const float Phase = static_cast<float>(G.IntentHash & 0xFFFFu) / 65535.f * 6.2831853f;
	const float Spin = (G.Kind == MCP_GLYPH_SOUL ? 0.6f : 0.25f) * (((G.IntentHash >> 16) & 1u) ? 1.f : -1.f);
	S.Live = { G.Kind == MCP_GLYPH_SOUL ? 1.4f : 1.f, Phase, G.bBound ? 1.f : 0.f, Spin };
	return S;
}

/** Sigil field box: a cube around the glyphs, padded by their reach (xyz min, voxel size). */
inline float4 FieldBox(const GlyphParams* Glyphs, size_t Count, const RealmParams& R, const GridConfig& C)
{
	if (Count == 0)
	{
		const float Side = 2.f * R.GroundRadius;
		return { -R.GroundRadius, -R.GroundRadius, -0.25f * R.GroundRadius, Side / static_cast<float>(C.FieldN) };
	}
	float Lo[3] = { 1e30f, 1e30f, 1e30f };
	float Hi[3] = { -1e30f, -1e30f, -1e30f };
	for (size_t I = 0; I < Count; ++I)
	{
		const GlyphParams& G = Glyphs[I];
		const float Radius = std::max(0.25f, G.Diameter * 0.5f);
		const float Reach = (Radius * 2.f + 4.f) * 3.f; // matches MCPSigil.ush's potential cutoff
		const float Pad[3] = { Reach, Reach, Reach * 4.f };
		for (int A = 0; A < 3; ++A)
		{
			Lo[A] = std::min(Lo[A], G.Position[A] - Pad[A]);
			Hi[A] = std::max(Hi[A], G.Position[A] + Pad[A]);
		}
	}
	Lo[2] = std::max(Lo[2], -0.25f * MaxTerrainHeight(R) - 2.f); // from the sea floor up
	const float Side = std::max({ Hi[0] - Lo[0], Hi[1] - Lo[1], Hi[2] - Lo[2], 8.f });
	return { (Lo[0] + Hi[0] - Side) * 0.5f, (Lo[1] + Hi[1] - Side) * 0.5f, Lo[2], Side / static_cast<float>(C.FieldN) };
}

/** The per-tick record every kernel reads. Dt is wall time; time dilation is applied here. */
inline FRealmTickGPU BuildTick(const RealmParams& R, const GridConfig& C, const float4& Field, uint64_t Tick, double Time, float Dt,
	uint32_t ActorCount, uint32_t SigilCount, uint32_t BTNodeCount, bool bGenesis)
{
	FRealmTickGPU T{};
	T.Counts = { ActorCount, SigilCount, static_cast<uint32_t>(Tick), R.Seed };
	T.Grid = { C.TerrainN, C.FieldN, MCP_MEMORY_SLOTS, C.MaxStructures };
	T.Time = { static_cast<float>(Time), Dt * R.TimeDilation, R.TimeDilation, C.CommitSeconds };
	T.MetaA = { R.Entropy, R.Luminosity, R.Coherence, R.Resonance };
	T.MetaB = { R.Inversion, R.Lucidity, R.GroundRadius, R.TerraceCount };
	T.Essence = { R.Essence[0], R.Essence[1], R.Essence[2], MaxTerrainHeight(R) };
	T.Field = Field;
	T.Misc = { SeaLevel(R), static_cast<float>(C.MemoryInterval), C.RecallMinAge, R.Roughness };
	T.Flags = { bGenesis ? MCP_FLAG_GENESIS : 0u, BTNodeCount, 0u, 0u };
	return T;
}

/** One actor of a deterministic population: pilgrims, with a warden every fifth. */
inline FActorGPU SpawnActor(const RealmParams& R, uint32_t Index, uint32_t PilgrimRoot, uint32_t WardenRoot)
{
	uint32_t Rng = Pcg(R.Seed ^ Pcg(Index + 0x9E37u));
	const float Angle = 6.2831853f * PcgUnit(Rng);
	const float Reach = std::sqrt(PcgUnit(Rng)) * 0.6f * R.GroundRadius;
	const bool bWarden = Index % 5u == 4u;
	FActorGPU A{};
	A.PosRadius = { std::cos(Angle) * Reach, std::sin(Angle) * Reach, SeaLevel(R) + 1.f, 12.f };
	A.Velocity = { 0.f, 0.f, 0.f, bWarden ? 3.2f : 2.4f + PcgUnit(Rng) };
	A.Drives = { 0.5f + 0.5f * PcgUnit(Rng), PcgUnit(Rng), 0.f, 0.6f * PcgUnit(Rng) };
	A.State = { MCP_ACTION_IDLE, bWarden ? WardenRoot : PilgrimRoot, Pcg(Rng ^ 0xA5A5u), 0u };
	A.Target = { A.PosRadius.x, A.PosRadius.y, 0.f, 10.f }; // free to choose on the first tick
	return A;
}
} // namespace PrimordiaMCP
