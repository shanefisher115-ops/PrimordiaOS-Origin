// Onyx: GPU telemetry and realm introspection.
//
// Vulkan side: command-buffer hooks. GpuScope() brackets a pass with two timestamp queries
// on whatever queue it is recorded for; Begin/EndStatistics() wrap a slot's work in a
// pipeline-statistics query. Query pools are per frame slot and are read only once that
// slot's timeline value says the GPU finished, so telemetry never stalls the pipeline
// (the price is that GPU numbers arrive FramesInFlight frames late).
//
// Realm side (the API PrimordiaOS sees):
//   BeginFrame(realm)                 start of a realm tick on the CPU
//   ReportPipelinePressure(id, m)     per-pipeline GPU time vs. its budget
//   ReportActorLoad(id, m)            per-actor GPU cost (see ReportMCPWork)
//   EndFrame(realm, gpuStats)         closes the frame, publishes an OnyxFrame to the sinks
// The JSON form of an OnyxFrame is the PRS-1 `gpu_telemetry` payload (docs/GPU_PIPELINE.md).
#pragma once

#include "MCPTypes.ush"
#include "primordia/gpu/Json.h"
#include "primordia/gpu/VulkanContext.h"

#include <array>
#include <chrono>
#include <map>
#include <string>
#include <utility>
#include <vector>

namespace primordia::gpu
{
using namespace PrimordiaMCP; // the shared GPU contract (MCPTypes.ush)
struct RealmState;

using PipelineId = std::string;
using ActorId = uint32_t;

struct GpuScopeTiming
{
	std::string Name;
	QueueRole Queue = QueueRole::Graphics;
	double Ms = 0.0;
};

/** What the GPU did for one frame slot, resolved from its queries. */
struct GpuStats
{
	uint64_t Tick = 0;
	std::array<double, QueueRoleCount> QueueMs{}; // busy time per queue role (union of its scopes)
	std::vector<GpuScopeTiming> Scopes;
	uint64_t ComputeInvocations = 0;  // pipeline statistics; 0 when the device lacks them
	uint64_t FragmentInvocations = 0;
	uint64_t ClippedPrimitives = 0;
	double MemoryPressure = 0.0;      // max usage / budget over device-local heaps
	uint64_t DeviceLocalUsage = 0;
	uint64_t DeviceLocalBudget = 0;

	double ScopeMs(const std::string& Name) const;
};

struct PipelineMetrics
{
	double GpuMs = 0.0;
	double BudgetMs = 0.0;     // this pipeline's share of the frame budget
	uint64_t Invocations = 0;  // threads launched (dispatch size) or primitives drawn
	uint32_t Dispatches = 0;
	double Saturation() const { return BudgetMs > 0.0 ? GpuMs / BudgetMs : 0.0; }
};

struct ActorMetrics
{
	double GpuUs = 0.0;           // attributed GPU time (estimate, see ReportMCPWork)
	uint32_t TreeNodes = 0;
	uint32_t SigilsScanned = 0;
	uint32_t MemoriesCompared = 0;
	uint32_t EpisodesWritten = 0;
	uint32_t Action = 0;
};

struct SigilMetrics
{
	double GpuUs = 0.0;
	uint32_t Voxels = 0; // field voxels this glyph contributed to
};

struct OnyxFrame
{
	uint64_t Tick = 0;          // the tick whose GPU work these numbers describe
	uint64_t CpuTick = 0;       // the tick the CPU was on when the frame closed
	std::string RealmId;
	double RealmTime = 0.0;
	std::string Device;
	double CpuFrameMs = 0.0;
	double WallFrameMs = 0.0;
	double Fps = 0.0;           // smoothed
	double BudgetMs = 0.0;      // GPU time the frame may take
	double RealmTickGpuMs = 0.0; // MCP compute + transfer
	double RenderGpuMs = 0.0;
	double FrameGpuMs = 0.0;    // busiest queue (queues overlap, so not their sum)
	double Headroom = 0.0;      // 1 - FrameGpuMs / BudgetMs (negative = over budget)
	GpuStats Gpu;
	std::map<PipelineId, PipelineMetrics> Pipelines;
	uint32_t ActorCount = 0;
	double ActorGpuUsTotal = 0.0;
	std::vector<std::pair<ActorId, ActorMetrics>> HottestActors; // top 8 by GpuUs
	std::array<uint32_t, MCP_ACTION_COUNT> Actions{};
	std::vector<SigilMetrics> Sigils;
	uint32_t Structures = 0;
	uint32_t ValidationErrors = 0;
};

class IOnyxSink
{
public:
	virtual ~IOnyxSink() = default;
	virtual void OnOnyxFrame(const OnyxFrame& Frame) = 0;
};

class Onyx
{
public:
	static constexpr uint32_t MaxScopesPerQueue = 32;

	Onyx(VulkanContext& Context, uint32_t FramesInFlight, double BudgetMs);
	~Onyx();
	Onyx(const Onyx&) = delete;
	Onyx& operator=(const Onyx&) = delete;

	// --- Telemetry API --------------------------------------------------------------
	void BeginFrame(const RealmState& Realm);
	void EndFrame(const RealmState& Realm, const GpuStats& Stats);
	void ReportPipelinePressure(const PipelineId& Id, const PipelineMetrics& Metrics);
	void ReportActorLoad(ActorId Id, const ActorMetrics& Metrics);
	void ReportSigilLoad(uint32_t Index, const SigilMetrics& Metrics);
	void ReportStructures(uint32_t Count) { Pending.Structures = Count; }

	/** Turns one tick's GPU timings and MCP work counters into per-actor and per-sigil cost.
	 *  The GPU cannot time one thread, so each kernel's measured time is shared out in
	 *  proportion to the work each actor (or sigil) did in it: tree nodes and sigils scanned
	 *  for cognition, memories compared for retrieval, episodes written for compression,
	 *  voxels touched for the sigil field. */
	void ReportMCPWork(const GpuStats& Stats, const std::vector<FActorGPU>& Actors, const std::vector<FActorCostGPU>& Costs, const std::vector<uint32_t>& SigilVoxels);

	void AddSink(IOnyxSink* Sink) { Sinks.push_back(Sink); }
	const OnyxFrame& LastFrame() const { return Last; }
	double BudgetMs() const { return FrameBudgetMs; }
	void SetBudgetMs(double Ms) { FrameBudgetMs = Ms; }
	static Json ToJson(const OnyxFrame& Frame);

	// --- Vulkan command-buffer hooks -----------------------------------------------
	/** Host: claims frame slot Slot for Tick. The first call for a new tick resolves the slot's
	 *  previous tick (see LatestStats) and recycles its queries; later calls for the same tick
	 *  do nothing, so MCP and the renderer can both call it. The caller guarantees the slot's
	 *  previous GPU work has completed on every queue (a timeline wait). */
	void BeginSlot(uint32_t Slot, uint64_t Tick);
	/** The most recently resolved slot: GPU numbers for tick (current - FramesInFlight). */
	const GpuStats& LatestStats() const { return Latest; }

	class Scope
	{
	public:
		Scope() = default;
		Scope(Onyx* InOwner, VkCommandBuffer InCmd, uint32_t InPool, uint32_t InQuery) : Owner(InOwner), Cmd(InCmd), Pool(InPool), Query(InQuery) {}
		Scope(Scope&& O) noexcept { *this = std::move(O); }
		Scope& operator=(Scope&& O) noexcept
		{
			std::swap(Owner, O.Owner);
			std::swap(Cmd, O.Cmd);
			std::swap(Pool, O.Pool);
			std::swap(Query, O.Query);
			return *this;
		}
		Scope(const Scope&) = delete;
		~Scope();

	private:
		Onyx* Owner = nullptr;
		VkCommandBuffer Cmd = VK_NULL_HANDLE;
		uint32_t Pool = 0;
		uint32_t Query = 0;
	};

	/** Brackets the commands recorded during the returned object's lifetime.
	 *  bAfterBarrier: this scope starts right after a barrier that drained the previous scope
	 *  on the same queue. Then the previous scope cannot have ended later than this one began,
	 *  and Onyx clamps it: some drivers write end-of-pipe timestamps late, which would
	 *  otherwise move the next pass's time into the previous pass. */
	[[nodiscard]] Scope GpuScope(VkCommandBuffer Cmd, QueueRole Queue, uint32_t Slot, const char* Name, bool bAfterBarrier = false);
	void BeginStatistics(VkCommandBuffer Cmd, QueueRole Queue, uint32_t Slot);
	void EndStatistics(VkCommandBuffer Cmd, QueueRole Queue, uint32_t Slot);

	/** Host: reads a completed slot's queries and the memory budget. */
	GpuStats ResolveSlot(uint32_t Slot, uint64_t Tick);
	uint32_t FramesInFlight() const { return Slots; }

private:
	struct SlotQueue
	{
		VkQueryPool Timestamps = VK_NULL_HANDLE;
		VkQueryPool Statistics = VK_NULL_HANDLE;
		std::vector<std::string> Names;
		std::vector<bool> AfterBarrier;
		bool bStatisticsWritten = false;
	};
	void PrepareSlot(uint32_t Slot);
	uint32_t PoolIndex(uint32_t Slot, QueueRole Queue) const { return Slot * QueueRoleCount + static_cast<uint32_t>(Queue); }
	void WriteTimestamp(VkCommandBuffer Cmd, uint32_t Pool, uint32_t Query, VkPipelineStageFlags2 Stage);

	VulkanContext& Ctx;
	uint32_t Slots;
	double FrameBudgetMs;
	std::vector<SlotQueue> Pools; // [slot][queue role]
	std::vector<uint64_t> SlotTick; // tick each slot was last claimed for (0 = never)
	GpuStats Latest;
	std::vector<IOnyxSink*> Sinks;
	OnyxFrame Pending;
	OnyxFrame Last;
	std::vector<std::pair<ActorId, ActorMetrics>> ActorReports;
	std::chrono::steady_clock::time_point FrameStart;
	std::chrono::steady_clock::time_point PreviousStart;
	bool bHasPrevious = false;
};
} // namespace primordia::gpu
