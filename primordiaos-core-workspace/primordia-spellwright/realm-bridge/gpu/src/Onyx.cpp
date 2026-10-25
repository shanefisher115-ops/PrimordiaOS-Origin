#include "primordia/gpu/Onyx.h"

#include "primordia/gpu/RealmState.h"

#include <algorithm>
#include <cmath>
#include <numeric>

namespace primordia::gpu
{
namespace
{
const char* const ActionNames[MCP_ACTION_COUNT] = { "idle", "wander", "seek_sigil", "flee", "rest", "commune" };

double Round3(double V)
{
	return std::round(V * 1000.0) / 1000.0;
}
} // namespace

double GpuStats::ScopeMs(const std::string& Name) const
{
	double Ms = 0.0;
	for (const GpuScopeTiming& S : Scopes)
	{
		if (S.Name == Name)
		{
			Ms += S.Ms;
		}
	}
	return Ms;
}

Onyx::Onyx(VulkanContext& Context, uint32_t FramesInFlight, double BudgetMs)
	: Ctx(Context), Slots(FramesInFlight), FrameBudgetMs(BudgetMs)
{
	Pools.resize(size_t(Slots) * QueueRoleCount);
	SlotTick.assign(Slots, 0);
	for (uint32_t Slot = 0; Slot < Slots; ++Slot)
	{
		for (uint32_t R = 0; R < QueueRoleCount; ++R)
		{
			const QueueRole Role = static_cast<QueueRole>(R);
			SlotQueue& SQ = Pools[PoolIndex(Slot, Role)];
			if (Ctx.Queue(Role).TimestampValidBits > 0)
			{
				VkQueryPoolCreateInfo Info{ VK_STRUCTURE_TYPE_QUERY_POOL_CREATE_INFO };
				Info.queryType = VK_QUERY_TYPE_TIMESTAMP;
				Info.queryCount = MaxScopesPerQueue * 2;
				PGPU_CHECK(vkCreateQueryPool(Ctx.Device(), &Info, nullptr, &SQ.Timestamps));
				vkResetQueryPool(Ctx.Device(), SQ.Timestamps, 0, Info.queryCount);
			}
			if (Ctx.Caps().bPipelineStatistics && Role != QueueRole::Transfer)
			{
				VkQueryPoolCreateInfo Info{ VK_STRUCTURE_TYPE_QUERY_POOL_CREATE_INFO };
				Info.queryType = VK_QUERY_TYPE_PIPELINE_STATISTICS;
				Info.queryCount = 1;
				Info.pipelineStatistics = Role == QueueRole::Compute
					? VK_QUERY_PIPELINE_STATISTIC_COMPUTE_SHADER_INVOCATIONS_BIT
					: VK_QUERY_PIPELINE_STATISTIC_CLIPPING_PRIMITIVES_BIT | VK_QUERY_PIPELINE_STATISTIC_FRAGMENT_SHADER_INVOCATIONS_BIT;
				PGPU_CHECK(vkCreateQueryPool(Ctx.Device(), &Info, nullptr, &SQ.Statistics));
				vkResetQueryPool(Ctx.Device(), SQ.Statistics, 0, 1);
			}
		}
	}
	Pending.Device = Ctx.DeviceName();
}

Onyx::~Onyx()
{
	for (SlotQueue& SQ : Pools)
	{
		if (SQ.Timestamps)
		{
			vkDestroyQueryPool(Ctx.Device(), SQ.Timestamps, nullptr);
		}
		if (SQ.Statistics)
		{
			vkDestroyQueryPool(Ctx.Device(), SQ.Statistics, nullptr);
		}
	}
}

void Onyx::PrepareSlot(uint32_t Slot)
{
	for (uint32_t R = 0; R < QueueRoleCount; ++R)
	{
		SlotQueue& SQ = Pools[PoolIndex(Slot, static_cast<QueueRole>(R))];
		if (SQ.Timestamps)
		{
			vkResetQueryPool(Ctx.Device(), SQ.Timestamps, 0, MaxScopesPerQueue * 2);
		}
		if (SQ.Statistics)
		{
			vkResetQueryPool(Ctx.Device(), SQ.Statistics, 0, 1);
		}
		SQ.Names.clear();
		SQ.AfterBarrier.clear();
		SQ.bStatisticsWritten = false;
	}
}

void Onyx::BeginSlot(uint32_t Slot, uint64_t Tick)
{
	if (SlotTick[Slot] == Tick)
	{
		return;
	}
	if (SlotTick[Slot] != 0)
	{
		Latest = ResolveSlot(Slot, SlotTick[Slot]);
	}
	PrepareSlot(Slot);
	SlotTick[Slot] = Tick;
}

void Onyx::WriteTimestamp(VkCommandBuffer Cmd, uint32_t Pool, uint32_t Query, VkPipelineStageFlags2 Stage)
{
	vkCmdWriteTimestamp2(Cmd, Stage, Pools[Pool].Timestamps, Query);
}

Onyx::Scope::~Scope()
{
	if (Owner)
	{
		// End: once everything recorded inside the scope has finished.
		Owner->WriteTimestamp(Cmd, Pool, Query + 1, VK_PIPELINE_STAGE_2_ALL_COMMANDS_BIT);
	}
}

Onyx::Scope Onyx::GpuScope(VkCommandBuffer Cmd, QueueRole Queue, uint32_t Slot, const char* Name, bool bAfterBarrier)
{
	const uint32_t Pool = PoolIndex(Slot, Queue);
	SlotQueue& SQ = Pools[Pool];
	if (!SQ.Timestamps || SQ.Names.size() >= MaxScopesPerQueue)
	{
		return Scope();
	}
	const uint32_t Query = static_cast<uint32_t>(SQ.Names.size()) * 2;
	SQ.Names.emplace_back(Name);
	SQ.AfterBarrier.push_back(bAfterBarrier);
	// Begin: when the command processor reaches it (after any barrier recorded before it).
	WriteTimestamp(Cmd, Pool, Query, VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT);
	return Scope(this, Cmd, Pool, Query);
}

void Onyx::BeginStatistics(VkCommandBuffer Cmd, QueueRole Queue, uint32_t Slot)
{
	SlotQueue& SQ = Pools[PoolIndex(Slot, Queue)];
	if (SQ.Statistics)
	{
		vkCmdBeginQuery(Cmd, SQ.Statistics, 0, 0);
	}
}

void Onyx::EndStatistics(VkCommandBuffer Cmd, QueueRole Queue, uint32_t Slot)
{
	SlotQueue& SQ = Pools[PoolIndex(Slot, Queue)];
	if (SQ.Statistics)
	{
		vkCmdEndQuery(Cmd, SQ.Statistics, 0);
		SQ.bStatisticsWritten = true;
	}
}

GpuStats Onyx::ResolveSlot(uint32_t Slot, uint64_t Tick)
{
	GpuStats Stats;
	Stats.Tick = Tick;
	const double PeriodNs = Ctx.TimestampPeriodNs();
	for (uint32_t R = 0; R < QueueRoleCount; ++R)
	{
		const QueueRole Role = static_cast<QueueRole>(R);
		SlotQueue& SQ = Pools[PoolIndex(Slot, Role)];
		const uint32_t Bits = Ctx.Queue(Role).TimestampValidBits;
		const uint64_t Mask = Bits >= 64 ? ~0ull : (1ull << Bits) - 1ull;
		if (SQ.Timestamps && !SQ.Names.empty())
		{
			const uint32_t Count = static_cast<uint32_t>(SQ.Names.size()) * 2;
			std::vector<uint64_t> Data(size_t(Count) * 2);
			std::vector<std::pair<uint64_t, uint64_t>> Intervals;
			const VkResult Res = vkGetQueryPoolResults(Ctx.Device(), SQ.Timestamps, 0, Count, Data.size() * sizeof(uint64_t), Data.data(),
				2 * sizeof(uint64_t), VK_QUERY_RESULT_64_BIT | VK_QUERY_RESULT_WITH_AVAILABILITY_BIT);
			if (Res == VK_SUCCESS || Res == VK_NOT_READY)
			{
				for (size_t I = 0; I < SQ.Names.size(); ++I)
				{
					const uint64_t Begin = Data[I * 4 + 0];
					uint64_t End = Data[I * 4 + 2];
					if (Data[I * 4 + 1] == 0 || Data[I * 4 + 3] == 0)
					{
						continue; // not written this frame
					}
					const bool bNextAfterBarrier = I + 1 < SQ.Names.size() && SQ.AfterBarrier[I + 1] && Data[(I + 1) * 4 + 1] != 0;
					if (bNextAfterBarrier && ((Data[(I + 1) * 4] - Begin) & Mask) < ((End - Begin) & Mask))
					{
						End = Data[(I + 1) * 4]; // drained by the barrier before the next scope began
					}
					const double Ms = static_cast<double>((End - Begin) & Mask) * PeriodNs * 1e-6;
					Stats.Scopes.push_back({ SQ.Names[I], Role, Ms });
					Intervals.emplace_back((Begin - Data[0]) & Mask, (End - Data[0]) & Mask);
				}
				// Queue busy time is the union of its scopes: scopes may overlap (pipelined
				// work), so summing them would count the same nanoseconds twice.
				std::sort(Intervals.begin(), Intervals.end());
				uint64_t Busy = 0, RunBegin = 0, RunEnd = 0;
				bool bRun = false;
				for (const auto& [B, E] : Intervals)
				{
					if (!bRun || B > RunEnd)
					{
						Busy += bRun ? RunEnd - RunBegin : 0;
						RunBegin = B;
						RunEnd = E;
						bRun = true;
					}
					else
					{
						RunEnd = std::max(RunEnd, E);
					}
				}
				Busy += bRun ? RunEnd - RunBegin : 0;
				Stats.QueueMs[R] = static_cast<double>(Busy) * PeriodNs * 1e-6;
			}
		}
		if (SQ.Statistics && SQ.bStatisticsWritten)
		{
			uint64_t Data[3] = {};
			const uint32_t Values = Role == QueueRole::Compute ? 1 : 2;
			const VkResult Res = vkGetQueryPoolResults(Ctx.Device(), SQ.Statistics, 0, 1, sizeof(uint64_t) * (Values + 1), Data,
				sizeof(uint64_t) * (Values + 1), VK_QUERY_RESULT_64_BIT | VK_QUERY_RESULT_WITH_AVAILABILITY_BIT);
			if (Res == VK_SUCCESS && Data[Values] != 0)
			{
				if (Role == QueueRole::Compute)
				{
					Stats.ComputeInvocations = Data[0];
				}
				else
				{
					// Results come in ascending bit order: clipping primitives, then fragment invocations.
					Stats.ClippedPrimitives = Data[0];
					Stats.FragmentInvocations = Data[1];
				}
			}
		}
	}
	for (const VulkanContext::HeapBudget& H : Ctx.HeapBudgets())
	{
		if (H.bDeviceLocal && H.Budget > 0)
		{
			Stats.DeviceLocalUsage += H.Usage;
			Stats.DeviceLocalBudget += H.Budget;
			Stats.MemoryPressure = std::max(Stats.MemoryPressure, static_cast<double>(H.Usage) / static_cast<double>(H.Budget));
		}
	}
	return Stats;
}

void Onyx::BeginFrame(const RealmState& Realm)
{
	PreviousStart = FrameStart;
	FrameStart = std::chrono::steady_clock::now();
	Pending = OnyxFrame{};
	Pending.Device = Ctx.DeviceName();
	Pending.CpuTick = Realm.Tick;
	ActorReports.clear();
}

void Onyx::ReportPipelinePressure(const PipelineId& Id, const PipelineMetrics& Metrics)
{
	Pending.Pipelines[Id] = Metrics;
}

void Onyx::ReportActorLoad(ActorId Id, const ActorMetrics& Metrics)
{
	ActorReports.emplace_back(Id, Metrics);
}

void Onyx::ReportSigilLoad(uint32_t Index, const SigilMetrics& Metrics)
{
	if (Pending.Sigils.size() <= Index)
	{
		Pending.Sigils.resize(Index + 1);
	}
	Pending.Sigils[Index] = Metrics;
}

void Onyx::ReportMCPWork(const GpuStats& Stats, const std::vector<FActorGPU>& Actors, const std::vector<FActorCostGPU>& Costs, const std::vector<uint32_t>& SigilVoxels)
{
	const size_t Count = std::min(Actors.size(), Costs.size());
	double CognitionWork = 0.0, MemoryWork = 0.0, EpisodeWork = 0.0;
	for (size_t I = 0; I < Count; ++I)
	{
		CognitionWork += std::max(1u, Costs[I].Work.x + Costs[I].Work.y);
		MemoryWork += Costs[I].Work.z;
		EpisodeWork += Costs[I].Work.w;
	}
	const double CognitionUs = Stats.ScopeMs("mcp.cognition") * 1000.0;
	const double RetrieveUs = Stats.ScopeMs("mcp.memory_retrieve") * 1000.0;
	const double CompressUs = Stats.ScopeMs("mcp.memory_compress") * 1000.0;
	for (size_t I = 0; I < Count; ++I)
	{
		const FActorCostGPU& C = Costs[I];
		ActorMetrics M;
		M.TreeNodes = C.Work.x;
		M.SigilsScanned = C.Work.y;
		M.MemoriesCompared = C.Work.z;
		M.EpisodesWritten = C.Work.w;
		M.Action = Actors[I].State.x;
		M.GpuUs = CognitionUs * std::max(1u, C.Work.x + C.Work.y) / std::max(1.0, CognitionWork)
			+ (MemoryWork > 0.0 ? RetrieveUs * C.Work.z / MemoryWork : RetrieveUs / std::max<size_t>(1, Count))
			+ (EpisodeWork > 0.0 ? CompressUs * C.Work.w / EpisodeWork : CompressUs / std::max<size_t>(1, Count));
		ReportActorLoad(static_cast<ActorId>(I), M);
	}
	const double SigilUs = Stats.ScopeMs("mcp.sigil_field") * 1000.0;
	const double Voxels = std::accumulate(SigilVoxels.begin(), SigilVoxels.end(), 0.0);
	for (size_t S = 0; S < SigilVoxels.size(); ++S)
	{
		ReportSigilLoad(static_cast<uint32_t>(S), { Voxels > 0.0 ? SigilUs * SigilVoxels[S] / Voxels : 0.0, SigilVoxels[S] });
	}
}

void Onyx::EndFrame(const RealmState& Realm, const GpuStats& Stats)
{
	const auto Now = std::chrono::steady_clock::now();
	Pending.Tick = Stats.Tick;
	Pending.RealmId = Realm.RealmId;
	Pending.RealmTime = Realm.Time;
	Pending.CpuFrameMs = std::chrono::duration<double, std::milli>(Now - FrameStart).count();
	if (bHasPrevious)
	{
		Pending.WallFrameMs = std::chrono::duration<double, std::milli>(FrameStart - PreviousStart).count();
		const double Instant = Pending.WallFrameMs > 0.0 ? 1000.0 / Pending.WallFrameMs : 0.0;
		Pending.Fps = Last.Fps > 0.0 ? Last.Fps + (Instant - Last.Fps) * 0.1 : Instant;
	}
	bHasPrevious = true;
	Pending.Gpu = Stats;
	Pending.BudgetMs = FrameBudgetMs;
	const double Graphics = Stats.QueueMs[static_cast<uint32_t>(QueueRole::Graphics)];
	const double Compute = Stats.QueueMs[static_cast<uint32_t>(QueueRole::Compute)];
	const double Transfer = Stats.QueueMs[static_cast<uint32_t>(QueueRole::Transfer)];
	Pending.RealmTickGpuMs = Compute + Transfer;
	Pending.RenderGpuMs = Graphics;
	// Queues run concurrently, so the frame costs its busiest queue, unless compute had to
	// share the graphics queue, in which case the two serialize.
	const bool bShared = Ctx.Queue(QueueRole::Compute).Queue == Ctx.Queue(QueueRole::Graphics).Queue;
	Pending.FrameGpuMs = bShared ? Graphics + Compute : std::max({ Graphics, Compute, Transfer });
	Pending.Headroom = FrameBudgetMs > 0.0 ? 1.0 - Pending.FrameGpuMs / FrameBudgetMs : 0.0;

	Pending.ActorCount = static_cast<uint32_t>(ActorReports.size());
	for (const auto& [Id, M] : ActorReports)
	{
		Pending.ActorGpuUsTotal += M.GpuUs;
		if (M.Action < MCP_ACTION_COUNT)
		{
			++Pending.Actions[M.Action];
		}
	}
	std::vector<std::pair<ActorId, ActorMetrics>> Hottest = ActorReports;
	const size_t Keep = std::min<size_t>(8, Hottest.size());
	std::partial_sort(Hottest.begin(), Hottest.begin() + Keep, Hottest.end(), [](const auto& A, const auto& B) { return A.second.GpuUs > B.second.GpuUs; });
	Hottest.resize(Keep);
	Pending.HottestActors = std::move(Hottest);
	Pending.ValidationErrors = Ctx.ValidationErrors();

	Last = Pending;
	for (IOnyxSink* Sink : Sinks)
	{
		Sink->OnOnyxFrame(Last);
	}
}

Json Onyx::ToJson(const OnyxFrame& F)
{
	Json Queues;
	for (uint32_t R = 0; R < QueueRoleCount; ++R)
	{
		Queues.Set(QueueRoleName(static_cast<QueueRole>(R)), Round3(F.Gpu.QueueMs[R]));
	}
	Json Gpu;
	Gpu.Set("frame_ms", Round3(F.FrameGpuMs));
	Gpu.Set("realm_tick_ms", Round3(F.RealmTickGpuMs));
	Gpu.Set("render_ms", Round3(F.RenderGpuMs));
	Gpu.Set("budget_ms", Round3(F.BudgetMs));
	Gpu.Set("headroom", Round3(F.Headroom));
	Gpu.Set("memory_pressure", Round3(F.Gpu.MemoryPressure));
	Gpu.Set("device_local_mb", Round3(F.Gpu.DeviceLocalUsage / 1048576.0));
	Gpu.Set("device_budget_mb", Round3(F.Gpu.DeviceLocalBudget / 1048576.0));
	Gpu.Set("compute_invocations", F.Gpu.ComputeInvocations);
	Gpu.Set("fragment_invocations", F.Gpu.FragmentInvocations);
	Gpu.Set("queues", Queues);

	Json Scopes;
	for (const GpuScopeTiming& S : F.Gpu.Scopes)
	{
		Scopes.Set(S.Name, Round3(S.Ms));
	}
	Gpu.Set("scopes", Scopes);

	Json Pipelines = Json(Json::Object{});
	for (const auto& [Id, M] : F.Pipelines)
	{
		Json P;
		P.Set("ms", Round3(M.GpuMs));
		P.Set("budget_ms", Round3(M.BudgetMs));
		P.Set("saturation", Round3(M.Saturation()));
		P.Set("invocations", M.Invocations);
		P.Set("dispatches", M.Dispatches);
		Pipelines.Set(Id, P);
	}

	Json Hottest = Json(Json::Array{});
	for (const auto& [Id, M] : F.HottestActors)
	{
		Json A;
		A.Set("id", Id);
		A.Set("gpu_us", Round3(M.GpuUs));
		A.Set("nodes", M.TreeNodes);
		A.Set("sigils", M.SigilsScanned);
		A.Set("memories", M.MemoriesCompared);
		A.Set("action", ActionNames[std::min<uint32_t>(M.Action, MCP_ACTION_COUNT - 1)]);
		Hottest.Push(A);
	}
	Json Actions;
	for (uint32_t A = 0; A < MCP_ACTION_COUNT; ++A)
	{
		Actions.Set(ActionNames[A], F.Actions[A]);
	}
	Json Actors;
	Actors.Set("count", F.ActorCount);
	Actors.Set("gpu_us_total", Round3(F.ActorGpuUsTotal));
	Actors.Set("gpu_us_mean", Round3(F.ActorCount ? F.ActorGpuUsTotal / F.ActorCount : 0.0));
	Actors.Set("hottest", Hottest);
	Actors.Set("actions", Actions);

	Json Sigils = Json(Json::Array{});
	for (size_t S = 0; S < F.Sigils.size(); ++S)
	{
		Json G;
		G.Set("index", static_cast<uint32_t>(S));
		G.Set("gpu_us", Round3(F.Sigils[S].GpuUs));
		G.Set("voxels", F.Sigils[S].Voxels);
		Sigils.Push(G);
	}

	Json Out;
	Out.Set("tick", F.Tick);
	Out.Set("cpu_tick", F.CpuTick);
	Out.Set("realm_id", F.RealmId);
	Out.Set("realm_time", Round3(F.RealmTime));
	Out.Set("device", F.Device);
	Out.Set("fps", Round3(F.Fps));
	Out.Set("cpu_ms", Round3(F.CpuFrameMs));
	Out.Set("gpu", Gpu);
	Out.Set("pipelines", Pipelines);
	Out.Set("actors", Actors);
	Out.Set("sigils", Sigils);
	Out.Set("structures", F.Structures);
	Out.Set("validation_errors", F.ValidationErrors);
	return Out;
}
} // namespace primordia::gpu
