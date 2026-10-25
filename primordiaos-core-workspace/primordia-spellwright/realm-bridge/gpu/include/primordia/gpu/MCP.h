// MCP: the GPU-accelerated message, cognition and world-simulation pipeline.
//
// Message-passing API (called by the realm loop on behalf of PrimordiaOS):
//   SubmitActorCognition(actors)   replace the actor population (uploaded with the next tick)
//   SubmitSigilEvaluation(sigils)  replace the glyph set
//   SetBehaviorTrees(nodes)        replace the compiled behavior trees
//   SubmitRealmTick(realm)         record + submit one tick; returns its tick id
//   GetGPUResults()                newest completed tick's results, never blocks
//
// One tick, on three queues:
//   transfer: tick record, sigils, trees (and a new population) -> device buffers
//             waits graphics(k - 2): those parity buffers were last read by frame k - 2
//             signals transfer(k)
//   compute:  tick_reset -> topology -> structures -> sigil_field -> cognition
//             -> memory_compress -> memory_retrieve -> copy results to readback
//             waits transfer(k), signals compute(k)
//   graphics: the renderer draws tick k after waiting compute(k), signals graphics(k)
// Every buffer a tick writes and the renderer reads exists twice (tick parity), so compute
// for tick k + 1 overlaps rendering of tick k. Two frames are in flight.
#pragma once

#include "MCPTypes.ush"
#include "primordia/gpu/Onyx.h"
#include "primordia/gpu/RealmState.h"
#include "primordia/gpu/VulkanContext.h"

#include <array>
#include <optional>
#include <string>
#include <vector>

namespace primordia::gpu
{
struct MCPResults
{
	uint64_t Tick = 0;
	double RealmTime = 0.0;
	std::vector<FActorGPU> Actors;
	std::vector<FActorCostGPU> Costs;
	std::vector<FRecallGPU> Recall;
	std::vector<uint32_t> SigilVoxels; // per sigil, field voxels it contributed to
	uint32_t Structures = 0;           // spires grown (clamped to the budget)
	std::array<uint32_t, MCP_ACTION_COUNT> Actions{};
	uint32_t EpisodesStored = 0;
};

class MCP
{
public:
	static constexpr uint32_t FramesInFlight = 2;

	MCP(VulkanContext& Context, Onyx& Telemetry, const MCPConfig& Config, const std::string& ShaderDir);
	~MCP();
	MCP(const MCP&) = delete;
	MCP& operator=(const MCP&) = delete;

	// --- Message-passing API ---------------------------------------------------------
	void SubmitActorCognition(const std::vector<FActorGPU>& Actors);
	void SubmitSigilEvaluation(const std::vector<FSigilGPU>& Sigils);
	void SetBehaviorTrees(const std::vector<FBTNodeGPU>& Nodes);
	/** Advances Realm.Tick/Time, records and submits the tick. May wait on the host for the
	 *  tick FramesInFlight back to finish (that is the frames-in-flight limit). */
	uint64_t SubmitRealmTick(RealmState& Realm);
	std::optional<MCPResults> GetGPUResults();

	// --- For the renderer and tests ----------------------------------------------------
	struct TickBuffers
	{
		const Buffer* Tick = nullptr;
		const Buffer* Terrain = nullptr;
		const Buffer* Structures = nullptr;
		const Buffer* StructureArgs = nullptr;
		const Buffer* Sigils = nullptr;
		const Buffer* Field = nullptr;
		const Buffer* Actors = nullptr;
		const Buffer* Recall = nullptr;
		uint32_t ActorCount = 0;
		uint32_t SigilCount = 0;
	};
	/** The buffers tick `Tick` writes (valid to read once compute(Tick) has signaled). */
	TickBuffers Outputs(uint64_t Tick) const;
	/** Parity p's output buffers, for building descriptor sets once at startup. */
	TickBuffers OutputsForParity(uint32_t Parity) const;
	VkSemaphore ComputeTimeline() const { return ComputeSem; }
	VkSemaphore TransferTimeline() const { return TransferSem; }
	/** The renderer's timeline; MCP waits on it before overwriting buffers a frame still reads. */
	void SetGraphicsTimeline(VkSemaphore Graphics) { GraphicsSem = Graphics; }
	const MCPConfig& Config() const { return Cfg; }
	uint64_t SubmittedTick() const { return Submitted; }
	uint64_t CompletedTick() const { return Ctx.TimelineValue(ComputeSem); }
	uint32_t ActorCount() const { return ActiveActors; }
	uint32_t SigilCount() const { return ActiveSigils; }
	/** Host wait until compute has finished tick `Tick`. */
	void WaitTick(uint64_t Tick) const { Ctx.WaitTimeline(ComputeSem, Tick); }

private:
	enum EKernel : uint32_t
	{
		KTickReset,
		KTopology,
		KStructures,
		KSigilField,
		KCognition,
		KMemoryCompress,
		KMemoryRetrieve,
		KernelCount
	};
	struct Slot
	{
		VkCommandPool TransferPool = VK_NULL_HANDLE;
		VkCommandPool ComputePool = VK_NULL_HANDLE;
		VkCommandBuffer TransferCmd = VK_NULL_HANDLE;
		VkCommandBuffer ComputeCmd = VK_NULL_HANDLE;
		Buffer Staging;
		Buffer Readback;
		uint64_t Tick = 0;
		uint32_t ActorCount = 0;
		uint32_t SigilCount = 0;
		std::array<uint64_t, KernelCount> Invocations{};
	};

	void CreateBuffers();
	void CreatePipelines(const std::string& ShaderDir);
	void WriteDescriptorSets();
	MCPResults ReadSlot(const Slot& S) const;
	void ReportPipelines(const Slot& Previous);

	VulkanContext& Ctx;
	Onyx& Telemetry;
	MCPConfig Cfg;

	// Parity-buffered tick outputs ([p] = written by ticks with (tick & 1) == p).
	std::array<Buffer, 2> TickBuf, Terrain, Structures, StructureArgs, Sigils, Field, SigilCost, Actors, BTNodes, ActorCost, Recall;
	Buffer Episodes; // compute-only scratch, single
	Buffer Memory;   // compute-only memory rings, single
	std::array<Slot, FramesInFlight> Slots;

	VkDescriptorSetLayout SetLayout = VK_NULL_HANDLE;
	VkPipelineLayout Layout = VK_NULL_HANDLE;
	VkDescriptorPool DescriptorPool = VK_NULL_HANDLE;
	std::array<VkDescriptorSet, 2> Sets{};
	std::array<VkPipeline, KernelCount> Pipelines{};

	VkSemaphore TransferSem = VK_NULL_HANDLE;
	VkSemaphore ComputeSem = VK_NULL_HANDLE;
	VkSemaphore GraphicsSem = VK_NULL_HANDLE;

	std::vector<FActorGPU> PendingActors;
	bool bActorsPending = false;
	std::vector<FSigilGPU> CurrentSigils;
	std::vector<FBTNodeGPU> CurrentTrees;
	uint32_t ActiveActors = 0;
	uint32_t ActiveSigils = 0;
	uint64_t Submitted = 0;
	uint64_t Returned = 0;
	std::optional<MCPResults> Snapshot;
};
} // namespace primordia::gpu
