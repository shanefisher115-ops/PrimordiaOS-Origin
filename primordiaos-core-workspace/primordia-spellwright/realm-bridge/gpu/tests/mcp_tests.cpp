// GPU tests for the MCP kernels and Onyx, run on the real device with the validation layer
// (including synchronization validation) enabled. Each test compares what the GPU did with
// a CPU reference or an invariant; any validation error fails the run.
//   primordia_gpu_tests [--shaders DIR] [--no-validation]
#include "MCPBehaviorTree.h"
#include "primordia/gpu/MCP.h"
#include "primordia/gpu/Onyx.h"
#include "primordia/gpu/RealmState.h"
#include "primordia/gpu/VulkanContext.h"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <functional>
#include <string>
#include <vector>

#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#endif

using namespace primordia::gpu;

namespace
{
int Failures = 0;
int Checks = 0;

#define EXPECT(Cond, ...)                                                       \
	do                                                                          \
	{                                                                           \
		++Checks;                                                               \
		if (!(Cond))                                                            \
		{                                                                       \
			++Failures;                                                         \
			std::fprintf(stderr, "  FAIL %s:%d: %s  ", __FILE__, __LINE__, #Cond); \
			std::fprintf(stderr, __VA_ARGS__);                                  \
			std::fprintf(stderr, "\n");                                         \
		}                                                                       \
	} while (0)

uint32_t Pcg(uint32_t V)
{
	const uint32_t State = V * 747796405u + 2891336453u;
	const uint32_t Word = ((State >> ((State >> 28u) + 4u)) ^ State) * 277803737u;
	return (Word >> 22u) ^ Word;
}

float Unit(uint32_t& S)
{
	S = Pcg(S);
	return static_cast<float>(S >> 8) * (1.f / 16777216.f);
}

std::string ExeDirectory()
{
#ifdef _WIN32
	char Path[MAX_PATH];
	const DWORD Len = GetModuleFileNameA(nullptr, Path, MAX_PATH);
	std::string S(Path, Len);
	return S.substr(0, S.find_last_of("\\/"));
#else
	return ".";
#endif
}

struct Fixture
{
	VulkanContext& Ctx;
	std::string Shaders;
};

/** Runs ticks until compute finished `Ticks` of them; returns the last results. */
MCPResults RunTicks(MCP& Compute, RealmState& Realm, uint32_t Ticks)
{
	for (uint32_t I = 0; I < Ticks; ++I)
	{
		Compute.SubmitRealmTick(Realm);
	}
	Compute.WaitTick(Compute.SubmittedTick());
	auto R = Compute.GetGPUResults();
	return R ? *R : MCPResults{};
}

void TestBehaviorTreeCompiler()
{
	std::printf("behavior-tree compiler\n");
	using N = PrimordiaMCP::BTNode;
	PrimordiaMCP::BTCompiler C;
	const uint32_t Root = C.Compile(N::Selector({
		N::Sequence({ N::Greater(MCP_IN_FEAR, 0.5f), N::Do(MCP_ACTION_FLEE) }),
		N::Sequence({ N::Less(MCP_IN_ENERGY, 0.2f), N::Greater(MCP_IN_CURIOSITY, 0.1f), N::Do(MCP_ACTION_REST) }),
		N::Do(MCP_ACTION_WANDER),
	}));
	EXPECT(C.Error().empty(), "%s", C.Error().c_str());
	float In[MCP_IN_COUNT] = {};
	In[MCP_IN_FEAR] = 0.9f;
	EXPECT(PrimordiaMCP::EvaluateCPU(C.Nodes(), Root, In) == MCP_ACTION_FLEE, "fear wins");
	In[MCP_IN_FEAR] = 0.f;
	In[MCP_IN_ENERGY] = 0.1f;
	In[MCP_IN_CURIOSITY] = 0.5f;
	EXPECT(PrimordiaMCP::EvaluateCPU(C.Nodes(), Root, In) == MCP_ACTION_REST, "tired and curious rests");
	In[MCP_IN_CURIOSITY] = 0.f;
	uint32_t Visited = 0;
	EXPECT(PrimordiaMCP::EvaluateCPU(C.Nodes(), Root, In, &Visited) == MCP_ACTION_WANDER, "sequence failure falls through");
	EXPECT(Visited == 4, "visited %u nodes (fear, energy, curiosity, wander)", Visited);
	PrimordiaMCP::BTCompiler Bad;
	Bad.Compile(N::Do(99));
	EXPECT(!Bad.Error().empty(), "invalid action is reported");
}

void TestCognitionMatchesCpu(Fixture& F)
{
	std::printf("cognition: GPU decisions match the CPU reference walk\n");
	Onyx Telemetry(F.Ctx, MCP::FramesInFlight, 16.7);
	MCPConfig Config;
	Config.TerrainN = 64;
	Config.FieldN = 16;
	MCP Compute(F.Ctx, Telemetry, Config, F.Shaders);
	PrimordiaMCP::DefaultTrees Trees;
	Compute.SetBehaviorTrees(Trees.Compiler.Nodes());

	RealmState Realm = DefaultRealm();
	Realm.Glyphs.clear(); // no sigils: attraction and repulsion are exactly zero
	Realm.Dt = 0.f;       // drives do not move this tick, so the CPU knows every input
	Compute.SubmitSigilEvaluation(Realm.BuildSigils());

	const uint32_t Count = 4096;
	std::vector<FActorGPU> Actors(Count);
	uint32_t Rng = 12345u;
	for (uint32_t I = 0; I < Count; ++I)
	{
		FActorGPU& A = Actors[I];
		A.PosRadius = { (Unit(Rng) - 0.5f) * 100.f, (Unit(Rng) - 0.5f) * 100.f, Realm.SeaLevel() + 1.f, 10.f };
		A.Velocity = { 0, 0, 0, 2.f };
		A.Drives = { Unit(Rng), Unit(Rng), Unit(Rng), Unit(Rng) };
		A.State = { MCP_ACTION_IDLE, I % 3 == 0 ? Trees.Warden : Trees.Pilgrim, Pcg(I), 0 };
		A.Target = { 0, 0, 0, 10.f }; // past the commitment window: free to switch
	}
	Compute.SubmitActorCognition(Actors);
	const MCPResults R = RunTicks(Compute, Realm, 1);
	EXPECT(R.Actors.size() == Count, "got %zu actors back", R.Actors.size());

	uint32_t Mismatches = 0;
	uint32_t Histogram[MCP_ACTION_COUNT] = {};
	const FRealmTickGPU T = Realm.BuildTick(Config, Count, 0, static_cast<uint32_t>(Trees.Compiler.Nodes().size()));
	for (uint32_t I = 0; I < std::min<size_t>(Count, R.Actors.size()); ++I)
	{
		const FActorGPU& A = Actors[I];
		float In[MCP_IN_COUNT] = {};
		In[MCP_IN_ENERGY] = A.Drives.x;
		In[MCP_IN_CURIOSITY] = A.Drives.y;
		In[MCP_IN_FEAR] = A.Drives.z;
		In[MCP_IN_DEVOTION] = A.Drives.w;
		In[MCP_IN_ENTROPY] = T.MetaA.x;
		In[MCP_IN_COHERENCE] = T.MetaA.z;
		In[MCP_IN_ALTITUDE] = std::clamp((A.PosRadius.z - T.Misc.x) / std::max(0.001f, T.Essence.w - T.Misc.x), 0.f, 1.f);
		uint32_t S = A.State.z ^ Pcg(1u); // the kernel's per-tick stream (tick 1)
		In[MCP_IN_RANDOM] = Unit(S);
		const uint32_t Expected = PrimordiaMCP::EvaluateCPU(Trees.Compiler.Nodes(), A.State.y, In);
		const uint32_t Got = R.Actors[I].State.x;
		++Histogram[std::min<uint32_t>(Got, MCP_ACTION_COUNT - 1)];
		if (Got != Expected && ++Mismatches <= 5)
		{
			std::fprintf(stderr, "  actor %u: gpu %u cpu %u (drives %.3f %.3f %.3f %.3f)\n", I, Got, Expected, A.Drives.x, A.Drives.y, A.Drives.z, A.Drives.w);
		}
		const uint32_t Nodes = R.Costs[I].Work.x;
		uint32_t CpuNodes = 0;
		PrimordiaMCP::EvaluateCPU(Trees.Compiler.Nodes(), A.State.y, In, &CpuNodes);
		if (Nodes != CpuNodes && ++Mismatches <= 5)
		{
			std::fprintf(stderr, "  actor %u: gpu visited %u nodes, cpu %u\n", I, Nodes, CpuNodes);
		}
	}
	EXPECT(Mismatches == 0, "%u of %u actors disagree", Mismatches, Count);
	std::printf("  actions: idle %u wander %u seek %u flee %u rest %u commune %u\n", Histogram[0], Histogram[1], Histogram[2], Histogram[3], Histogram[4], Histogram[5]);
	EXPECT(Histogram[MCP_ACTION_FLEE] > 0 && Histogram[MCP_ACTION_REST] > 0 && Histogram[MCP_ACTION_WANDER] > 0, "random drives reach several branches");
}

void TestMemoryRoundTrip(Fixture& F)
{
	std::printf("world memory: int8 compression and recall\n");
	Onyx Telemetry(F.Ctx, MCP::FramesInFlight, 16.7);
	MCPConfig Config;
	Config.TerrainN = 64;
	Config.FieldN = 16;
	Config.MemoryInterval = 1; // every tick is remembered
	Config.RecallMinAge = 0.f; // and immediately recallable
	MCP Compute(F.Ctx, Telemetry, Config, F.Shaders);
	PrimordiaMCP::DefaultTrees Trees;
	Compute.SetBehaviorTrees(Trees.Compiler.Nodes());
	RealmState Realm = DefaultRealm();
	Realm.Glyphs.clear();
	Realm.Dt = 0.f; // a frozen world: every new episode equals the stored ones
	Compute.SubmitSigilEvaluation(Realm.BuildSigils());
	const std::vector<FActorGPU> Actors = SpawnPopulation(Realm, 512, Trees.Pilgrim, Trees.Warden);
	Compute.SubmitActorCognition(Actors);

	const MCPResults R = RunTicks(Compute, Realm, 4);
	EXPECT(R.Actors.size() == 512, "actors %zu", R.Actors.size());
	uint32_t Written = 0, Weak = 0;
	double MinSim = 1.0;
	for (size_t I = 0; I < R.Actors.size(); ++I)
	{
		Written += R.Actors[I].State.w;
		const float Sim = R.Recall[I].Value.x;
		MinSim = std::min<double>(MinSim, Sim);
		if (Sim < 0.995f)
		{
			++Weak;
		}
		const float StoredFear = R.Recall[I].Value.y;
		if (std::abs(StoredFear - R.Actors[I].Drives.z) > 0.01f && Weak < 3)
		{
			std::fprintf(stderr, "  actor %zu: recalled fear %.4f, actual %.4f\n", I, StoredFear, R.Actors[I].Drives.z);
		}
	}
	EXPECT(Written == 512 * 4, "memories written %u (one per actor per tick)", Written);
	EXPECT(R.EpisodesStored == 512, "episodes stored this tick %u", R.EpisodesStored);
	EXPECT(Weak == 0, "%u actors recalled with similarity < 0.995 (min %.5f): quantization lost too much", Weak, MinSim);
	std::printf("  min recall similarity %.5f across %zu actors\n", MinSim, R.Actors.size());
}

void TestRealmTick(Fixture& F)
{
	std::printf("realm tick: topology, structures, sigil field, Onyx timings\n");
	Onyx Telemetry(F.Ctx, MCP::FramesInFlight, 16.7);
	MCPConfig Config;
	MCP Compute(F.Ctx, Telemetry, Config, F.Shaders);
	PrimordiaMCP::DefaultTrees Trees;
	Compute.SetBehaviorTrees(Trees.Compiler.Nodes());
	RealmState Realm = DefaultRealm();
	Realm.Dt = 1.f / 60.f;
	Compute.SubmitSigilEvaluation(Realm.BuildSigils());
	Compute.SubmitActorCognition(SpawnPopulation(Realm, 2048, Trees.Pilgrim, Trees.Warden));

	MCPResults R;
	for (int Batch = 0; Batch < 6; ++Batch)
	{
		Telemetry.BeginFrame(Realm);
		R = RunTicks(Compute, Realm, 10);
		Telemetry.EndFrame(Realm, Telemetry.LatestStats());
	}
	EXPECT(R.Structures > 0 && R.Structures <= Config.MaxStructures, "structures %u", R.Structures);
	EXPECT(R.SigilVoxels.size() == Realm.Glyphs.size(), "sigil cost entries %zu", R.SigilVoxels.size());
	for (size_t S = 0; S < R.SigilVoxels.size(); ++S)
	{
		EXPECT(R.SigilVoxels[S] > 0, "glyph %s touched no voxels", Realm.Glyphs[S].Id.c_str());
	}
	uint32_t NonFinite = 0, OffGround = 0;
	for (const FActorGPU& A : R.Actors)
	{
		if (!std::isfinite(A.PosRadius.x) || !std::isfinite(A.PosRadius.y) || !std::isfinite(A.PosRadius.z))
		{
			++NonFinite;
		}
		if (std::hypot(A.PosRadius.x, A.PosRadius.y) > Realm.GroundRadius * 0.951f)
		{
			++OffGround;
		}
	}
	EXPECT(NonFinite == 0, "%u actors with non-finite positions", NonFinite);
	EXPECT(OffGround == 0, "%u actors left the ground disc", OffGround);
	std::printf("  after %llu ticks: wander %u seek %u flee %u rest %u commune %u idle %u, %u spires\n",
		static_cast<unsigned long long>(Realm.Tick), R.Actions[1], R.Actions[2], R.Actions[3], R.Actions[4], R.Actions[5], R.Actions[0], R.Structures);

	const GpuStats& Stats = Telemetry.LatestStats();
	for (const char* Scope : { "mcp.topology", "mcp.structures", "mcp.sigil_field", "mcp.cognition", "mcp.memory_compress", "mcp.memory_retrieve" })
	{
		bool bFound = false;
		for (const GpuScopeTiming& T : Stats.Scopes)
		{
			bFound |= T.Name == Scope && T.Ms >= 0.0;
		}
		EXPECT(bFound, "Onyx resolved no timing for %s", Scope);
	}
	EXPECT(Stats.QueueMs[static_cast<uint32_t>(QueueRole::Compute)] > 0.0, "compute queue time");
	std::printf("  compute %.3f ms  (", Stats.QueueMs[static_cast<uint32_t>(QueueRole::Compute)]);
	for (const GpuScopeTiming& T : Stats.Scopes)
	{
		std::printf("%s %.3f  ", T.Name.c_str(), T.Ms);
	}
	std::printf(")\n  memory pressure %.3f, compute invocations %llu\n", Stats.MemoryPressure, static_cast<unsigned long long>(Stats.ComputeInvocations));
	if (F.Ctx.Caps().bPipelineStatistics)
	{
		EXPECT(Stats.ComputeInvocations > 0, "pipeline statistics counted no compute invocations");
	}

	// Per-actor attribution adds back up to the kernels it was taken from.
	Telemetry.BeginFrame(Realm);
	Telemetry.ReportMCPWork(Stats, R.Actors, R.Costs, R.SigilVoxels);
	Telemetry.EndFrame(Realm, Stats);
	const double Kernels = (Stats.ScopeMs("mcp.cognition") + Stats.ScopeMs("mcp.memory_retrieve") + Stats.ScopeMs("mcp.memory_compress")) * 1000.0;
	const double Attributed = Telemetry.LastFrame().ActorGpuUsTotal;
	EXPECT(std::abs(Attributed - Kernels) <= std::max(0.5, Kernels * 0.02), "attributed %.3f us of %.3f us", Attributed, Kernels);
}
} // namespace

int main(int Argc, char** Argv)
{
	std::string Shaders = ExeDirectory() + "/shaders";
	bool bValidation = true;
	for (int I = 1; I < Argc; ++I)
	{
		const std::string A = Argv[I];
		if (A == "--shaders" && I + 1 < Argc)
		{
			Shaders = Argv[++I];
		}
		else if (A == "--no-validation")
		{
			bValidation = false;
		}
	}
	try
	{
		TestBehaviorTreeCompiler();
		ContextOptions Options;
		Options.bValidation = bValidation;
		VulkanContext Ctx(Options);
		std::printf("device: %s (compute family %u%s, transfer family %u%s)\n", Ctx.DeviceName().c_str(),
			Ctx.Queue(QueueRole::Compute).Family, Ctx.Queue(QueueRole::Compute).bSeparateFamily ? " async" : "",
			Ctx.Queue(QueueRole::Transfer).Family, Ctx.Queue(QueueRole::Transfer).bSeparateFamily ? " dma" : "");
		Fixture F{ Ctx, Shaders };
		TestCognitionMatchesCpu(F);
		TestMemoryRoundTrip(F);
		TestRealmTick(F);
		vkDeviceWaitIdle(Ctx.Device());
		EXPECT(Ctx.ValidationErrors() == 0, "%u validation errors", Ctx.ValidationErrors());
		std::printf("validation: %u errors, %u warnings\n", Ctx.ValidationErrors(), Ctx.ValidationWarnings());
	}
	catch (const std::exception& E)
	{
		std::fprintf(stderr, "fatal: %s\n", E.what());
		return 1;
	}
	std::printf("%d checks, %d failed\n", Checks, Failures);
	return Failures == 0 ? 0 : 1;
}
