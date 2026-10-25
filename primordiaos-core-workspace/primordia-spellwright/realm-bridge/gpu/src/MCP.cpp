#include "primordia/gpu/MCP.h"

#include "../shaders/Bindings.hlsli"

#include <algorithm>
#include <cstring>

namespace primordia::gpu
{
namespace
{
constexpr uint32_t MaxTreeNodes = 1024;

constexpr VkDeviceSize Align(VkDeviceSize V, VkDeviceSize A = 256)
{
	return (V + A - 1) / A * A;
}

// Staging (host -> device) layout of one slot.
constexpr VkDeviceSize StagingTick = 0;
constexpr VkDeviceSize StagingSigils = Align(StagingTick + sizeof(FRealmTickGPU));
constexpr VkDeviceSize StagingTrees = Align(StagingSigils + sizeof(FSigilGPU) * MCP_MAX_SIGILS);
constexpr VkDeviceSize StagingActors = Align(StagingTrees + sizeof(FBTNodeGPU) * MaxTreeNodes);

struct ReadbackLayout
{
	VkDeviceSize Actors, Costs, Recall, SigilCost, Args, Size;
	explicit ReadbackLayout(uint32_t MaxActors)
	{
		Actors = 0;
		Costs = Align(Actors + sizeof(FActorGPU) * MaxActors);
		Recall = Align(Costs + sizeof(FActorCostGPU) * MaxActors);
		SigilCost = Align(Recall + sizeof(FRecallGPU) * MaxActors);
		Args = Align(SigilCost + sizeof(uint32_t) * MCP_MAX_SIGILS);
		Size = Align(Args + 16);
	}
};

const char* const KernelFiles[] = { "tick_reset", "topology", "structures", "sigil_field", "cognition", "memory_compress", "memory_retrieve" };
const char* const KernelScopes[] = { "mcp.tick_reset", "mcp.topology", "mcp.structures", "mcp.sigil_field", "mcp.cognition", "mcp.memory_compress", "mcp.memory_retrieve" };
// Share of the MCP budget each kernel is expected to use (Onyx reports saturation against it).
const double KernelBudgetShare[] = { 0.01, 0.20, 0.05, 0.25, 0.30, 0.05, 0.14 };
constexpr double MCPBudgetShare = 0.35; // of the frame budget; the renderer gets the rest

uint32_t Groups(uint32_t Count, uint32_t Size)
{
	return (Count + Size - 1) / Size;
}

void ComputeBarrier(VkCommandBuffer Cmd, VkPipelineStageFlags2 DstStage = VK_PIPELINE_STAGE_2_COMPUTE_SHADER_BIT,
	VkAccessFlags2 DstAccess = VK_ACCESS_2_SHADER_STORAGE_READ_BIT | VK_ACCESS_2_SHADER_STORAGE_WRITE_BIT)
{
	VkMemoryBarrier2 Barrier{ VK_STRUCTURE_TYPE_MEMORY_BARRIER_2 };
	Barrier.srcStageMask = VK_PIPELINE_STAGE_2_COMPUTE_SHADER_BIT;
	Barrier.srcAccessMask = VK_ACCESS_2_SHADER_STORAGE_WRITE_BIT;
	Barrier.dstStageMask = DstStage;
	Barrier.dstAccessMask = DstAccess;
	VkDependencyInfo Dep{ VK_STRUCTURE_TYPE_DEPENDENCY_INFO };
	Dep.memoryBarrierCount = 1;
	Dep.pMemoryBarriers = &Barrier;
	vkCmdPipelineBarrier2(Cmd, &Dep);
}

VkSemaphoreSubmitInfo TimelineWait(VkSemaphore S, uint64_t Value, VkPipelineStageFlags2 Stage)
{
	VkSemaphoreSubmitInfo Info{ VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO };
	Info.semaphore = S;
	Info.value = Value;
	Info.stageMask = Stage;
	return Info;
}
} // namespace

MCP::MCP(VulkanContext& Context, Onyx& InTelemetry, const MCPConfig& Config, const std::string& ShaderDir)
	: Ctx(Context), Telemetry(InTelemetry), Cfg(Config)
{
	Cfg.MaxActors = std::max(1u, Cfg.MaxActors);
	Cfg.TerrainN = std::max(16u, Cfg.TerrainN / MCP_STRUCTURE_STRIDE * MCP_STRUCTURE_STRIDE);
	CreateBuffers();
	CreatePipelines(ShaderDir);
	WriteDescriptorSets();
	TransferSem = Ctx.CreateTimeline(0, "mcp.timeline.transfer");
	ComputeSem = Ctx.CreateTimeline(0, "mcp.timeline.compute");
	for (uint32_t I = 0; I < FramesInFlight; ++I)
	{
		Slot& S = Slots[I];
		S.TransferPool = Ctx.CreateCommandPool(QueueRole::Transfer, "mcp.pool.transfer");
		S.ComputePool = Ctx.CreateCommandPool(QueueRole::Compute, "mcp.pool.compute");
		VkCommandBufferAllocateInfo Alloc{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO };
		Alloc.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
		Alloc.commandBufferCount = 1;
		Alloc.commandPool = S.TransferPool;
		PGPU_CHECK(vkAllocateCommandBuffers(Ctx.Device(), &Alloc, &S.TransferCmd));
		Alloc.commandPool = S.ComputePool;
		PGPU_CHECK(vkAllocateCommandBuffers(Ctx.Device(), &Alloc, &S.ComputeCmd));
		S.Staging = Ctx.CreateBuffer(StagingActors + sizeof(FActorGPU) * Cfg.MaxActors, VK_BUFFER_USAGE_TRANSFER_SRC_BIT, MemoryKind::Upload, "mcp.staging");
		S.Readback = Ctx.CreateBuffer(ReadbackLayout(Cfg.MaxActors).Size, VK_BUFFER_USAGE_TRANSFER_DST_BIT, MemoryKind::Readback, "mcp.readback");
	}
}

MCP::~MCP()
{
	vkDeviceWaitIdle(Ctx.Device());
	for (Slot& S : Slots)
	{
		vkDestroyCommandPool(Ctx.Device(), S.TransferPool, nullptr);
		vkDestroyCommandPool(Ctx.Device(), S.ComputePool, nullptr);
		Ctx.DestroyBuffer(S.Staging);
		Ctx.DestroyBuffer(S.Readback);
	}
	for (VkPipeline P : Pipelines)
	{
		vkDestroyPipeline(Ctx.Device(), P, nullptr);
	}
	vkDestroyPipelineLayout(Ctx.Device(), Layout, nullptr);
	vkDestroyDescriptorPool(Ctx.Device(), DescriptorPool, nullptr);
	vkDestroyDescriptorSetLayout(Ctx.Device(), SetLayout, nullptr);
	vkDestroySemaphore(Ctx.Device(), TransferSem, nullptr);
	vkDestroySemaphore(Ctx.Device(), ComputeSem, nullptr);
	for (auto* Group : { &TickBuf, &Terrain, &Structures, &StructureArgs, &Sigils, &Field, &SigilCost, &Actors, &BTNodes, &ActorCost, &Recall })
	{
		for (Buffer& B : *Group)
		{
			Ctx.DestroyBuffer(B);
		}
	}
	Ctx.DestroyBuffer(Episodes);
	Ctx.DestroyBuffer(Memory);
}

void MCP::CreateBuffers()
{
	const VkBufferUsageFlags Storage = VK_BUFFER_USAGE_STORAGE_BUFFER_BIT | VK_BUFFER_USAGE_TRANSFER_DST_BIT | VK_BUFFER_USAGE_TRANSFER_SRC_BIT;
	const VkDeviceSize TerrainBytes = sizeof(FTerrainCellGPU) * Cfg.TerrainN * Cfg.TerrainN;
	const VkDeviceSize FieldBytes = sizeof(FFieldVoxelGPU) * Cfg.FieldN * Cfg.FieldN * Cfg.FieldN;
	for (uint32_t P = 0; P < 2; ++P)
	{
		TickBuf[P] = Ctx.CreateBuffer(sizeof(FRealmTickGPU), Storage, MemoryKind::DeviceLocal, "mcp.tick");
		Terrain[P] = Ctx.CreateBuffer(TerrainBytes, Storage, MemoryKind::DeviceLocal, "mcp.terrain");
		Structures[P] = Ctx.CreateBuffer(sizeof(FStructureGPU) * Cfg.MaxStructures, Storage, MemoryKind::DeviceLocal, "mcp.structures");
		StructureArgs[P] = Ctx.CreateBuffer(16, Storage | VK_BUFFER_USAGE_INDIRECT_BUFFER_BIT, MemoryKind::DeviceLocal, "mcp.structure_args");
		Sigils[P] = Ctx.CreateBuffer(sizeof(FSigilGPU) * MCP_MAX_SIGILS, Storage, MemoryKind::DeviceLocal, "mcp.sigils");
		Field[P] = Ctx.CreateBuffer(FieldBytes, Storage, MemoryKind::DeviceLocal, "mcp.sigil_field");
		SigilCost[P] = Ctx.CreateBuffer(sizeof(uint32_t) * MCP_MAX_SIGILS, Storage, MemoryKind::DeviceLocal, "mcp.sigil_cost");
		Actors[P] = Ctx.CreateBuffer(sizeof(FActorGPU) * Cfg.MaxActors, Storage, MemoryKind::DeviceLocal, "mcp.actors");
		BTNodes[P] = Ctx.CreateBuffer(sizeof(FBTNodeGPU) * MaxTreeNodes, Storage, MemoryKind::DeviceLocal, "mcp.bt_nodes");
		ActorCost[P] = Ctx.CreateBuffer(sizeof(FActorCostGPU) * Cfg.MaxActors, Storage, MemoryKind::DeviceLocal, "mcp.actor_cost");
		Recall[P] = Ctx.CreateBuffer(sizeof(FRecallGPU) * Cfg.MaxActors, Storage, MemoryKind::DeviceLocal, "mcp.recall");
	}
	Episodes = Ctx.CreateBuffer(sizeof(FEpisodeGPU) * Cfg.MaxActors, Storage, MemoryKind::DeviceLocal, "mcp.episodes");
	Memory = Ctx.CreateBuffer(sizeof(FMemoryGPU) * MCP_MEMORY_SLOTS * Cfg.MaxActors, Storage, MemoryKind::DeviceLocal, "mcp.memory");

	// Everything starts zeroed: the first tick reads "last tick's" terrain, recall and actors.
	Ctx.ImmediateSubmit(QueueRole::Compute, [this](VkCommandBuffer Cmd)
	{
		for (auto* Group : { &TickBuf, &Terrain, &Structures, &StructureArgs, &Sigils, &Field, &SigilCost, &Actors, &BTNodes, &ActorCost, &Recall })
		{
			for (Buffer& B : *Group)
			{
				vkCmdFillBuffer(Cmd, B.Handle, 0, VK_WHOLE_SIZE, 0);
			}
		}
		vkCmdFillBuffer(Cmd, Episodes.Handle, 0, VK_WHOLE_SIZE, 0);
		vkCmdFillBuffer(Cmd, Memory.Handle, 0, VK_WHOLE_SIZE, 0);
	});
}

void MCP::CreatePipelines(const std::string& ShaderDir)
{
	std::array<VkDescriptorSetLayoutBinding, MCP_BINDING_COUNT> Bindings{};
	for (uint32_t B = 0; B < MCP_BINDING_COUNT; ++B)
	{
		Bindings[B] = { B, VK_DESCRIPTOR_TYPE_STORAGE_BUFFER, 1, VK_SHADER_STAGE_COMPUTE_BIT, nullptr };
	}
	VkDescriptorSetLayoutCreateInfo SetInfo{ VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO };
	SetInfo.bindingCount = MCP_BINDING_COUNT;
	SetInfo.pBindings = Bindings.data();
	PGPU_CHECK(vkCreateDescriptorSetLayout(Ctx.Device(), &SetInfo, nullptr, &SetLayout));

	VkPipelineLayoutCreateInfo LayoutInfo{ VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO };
	LayoutInfo.setLayoutCount = 1;
	LayoutInfo.pSetLayouts = &SetLayout;
	PGPU_CHECK(vkCreatePipelineLayout(Ctx.Device(), &LayoutInfo, nullptr, &Layout));

	for (uint32_t K = 0; K < KernelCount; ++K)
	{
		VkShaderModule Module = Ctx.LoadShader(ShaderDir + "/" + KernelFiles[K] + ".comp.spv");
		VkComputePipelineCreateInfo Info{ VK_STRUCTURE_TYPE_COMPUTE_PIPELINE_CREATE_INFO };
		Info.stage = { VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO };
		Info.stage.stage = VK_SHADER_STAGE_COMPUTE_BIT;
		Info.stage.module = Module;
		Info.stage.pName = "main";
		Info.layout = Layout;
		PGPU_CHECK(vkCreateComputePipelines(Ctx.Device(), VK_NULL_HANDLE, 1, &Info, nullptr, &Pipelines[K]));
		Ctx.SetName(VK_OBJECT_TYPE_PIPELINE, Pipelines[K], KernelScopes[K]);
		vkDestroyShaderModule(Ctx.Device(), Module, nullptr);
	}

	VkDescriptorPoolSize PoolSize{ VK_DESCRIPTOR_TYPE_STORAGE_BUFFER, MCP_BINDING_COUNT * 2 };
	VkDescriptorPoolCreateInfo PoolInfo{ VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO };
	PoolInfo.maxSets = 2;
	PoolInfo.poolSizeCount = 1;
	PoolInfo.pPoolSizes = &PoolSize;
	PGPU_CHECK(vkCreateDescriptorPool(Ctx.Device(), &PoolInfo, nullptr, &DescriptorPool));
	const VkDescriptorSetLayout Layouts[2] = { SetLayout, SetLayout };
	VkDescriptorSetAllocateInfo Alloc{ VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO };
	Alloc.descriptorPool = DescriptorPool;
	Alloc.descriptorSetCount = 2;
	Alloc.pSetLayouts = Layouts;
	PGPU_CHECK(vkAllocateDescriptorSets(Ctx.Device(), &Alloc, Sets.data()));
}

void MCP::WriteDescriptorSets()
{
	for (uint32_t P = 0; P < 2; ++P)
	{
		const uint32_t Q = 1 - P; // last tick's parity: the "In" side of every ping-pong pair
		const Buffer* Table[MCP_BINDING_COUNT] = {};
		Table[MCP_B_TICK] = &TickBuf[P];
		Table[MCP_B_TERRAIN_IN] = &Terrain[Q];
		Table[MCP_B_TERRAIN_OUT] = &Terrain[P];
		Table[MCP_B_STRUCTURES] = &Structures[P];
		Table[MCP_B_STRUCTURE_ARGS] = &StructureArgs[P];
		Table[MCP_B_SIGILS] = &Sigils[P];
		Table[MCP_B_SIGIL_FIELD] = &Field[P];
		Table[MCP_B_SIGIL_COST] = &SigilCost[P];
		Table[MCP_B_ACTORS_IN] = &Actors[Q];
		Table[MCP_B_ACTORS_OUT] = &Actors[P];
		Table[MCP_B_BT_NODES] = &BTNodes[P];
		Table[MCP_B_ACTOR_COST] = &ActorCost[P];
		Table[MCP_B_EPISODES] = &Episodes;
		Table[MCP_B_MEMORY] = &Memory;
		Table[MCP_B_RECALL_IN] = &Recall[Q];
		Table[MCP_B_RECALL_OUT] = &Recall[P];
		std::array<VkDescriptorBufferInfo, MCP_BINDING_COUNT> Infos{};
		std::array<VkWriteDescriptorSet, MCP_BINDING_COUNT> Writes{};
		for (uint32_t B = 0; B < MCP_BINDING_COUNT; ++B)
		{
			Infos[B] = { Table[B]->Handle, 0, VK_WHOLE_SIZE };
			Writes[B] = { VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET };
			Writes[B].dstSet = Sets[P];
			Writes[B].dstBinding = B;
			Writes[B].descriptorCount = 1;
			Writes[B].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
			Writes[B].pBufferInfo = &Infos[B];
		}
		vkUpdateDescriptorSets(Ctx.Device(), MCP_BINDING_COUNT, Writes.data(), 0, nullptr);
	}
}

void MCP::SubmitActorCognition(const std::vector<FActorGPU>& InActors)
{
	PendingActors.assign(InActors.begin(), InActors.begin() + std::min<size_t>(InActors.size(), Cfg.MaxActors));
	bActorsPending = true;
}

void MCP::SubmitSigilEvaluation(const std::vector<FSigilGPU>& InSigils)
{
	CurrentSigils.assign(InSigils.begin(), InSigils.begin() + std::min<size_t>(InSigils.size(), MCP_MAX_SIGILS));
}

void MCP::SetBehaviorTrees(const std::vector<FBTNodeGPU>& Nodes)
{
	CurrentTrees.assign(Nodes.begin(), Nodes.begin() + std::min<size_t>(Nodes.size(), MaxTreeNodes));
}

MCPResults MCP::ReadSlot(const Slot& S) const
{
	const ReadbackLayout L(Cfg.MaxActors);
	Ctx.Invalidate(S.Readback);
	const auto* Base = static_cast<const uint8_t*>(S.Readback.Mapped);
	MCPResults R;
	R.Tick = S.Tick;
	R.Actors.resize(S.ActorCount);
	R.Costs.resize(S.ActorCount);
	R.Recall.resize(S.ActorCount);
	R.SigilVoxels.resize(S.SigilCount);
	std::memcpy(R.Actors.data(), Base + L.Actors, sizeof(FActorGPU) * S.ActorCount);
	std::memcpy(R.Costs.data(), Base + L.Costs, sizeof(FActorCostGPU) * S.ActorCount);
	std::memcpy(R.Recall.data(), Base + L.Recall, sizeof(FRecallGPU) * S.ActorCount);
	std::memcpy(R.SigilVoxels.data(), Base + L.SigilCost, sizeof(uint32_t) * S.SigilCount);
	uint32_t Args[4];
	std::memcpy(Args, Base + L.Args, sizeof(Args));
	R.Structures = std::min(Args[1], Cfg.MaxStructures);
	for (uint32_t I = 0; I < S.ActorCount; ++I)
	{
		++R.Actions[std::min<uint32_t>(R.Actors[I].State.x, MCP_ACTION_COUNT - 1)];
		R.EpisodesStored += R.Costs[I].Work.w;
	}
	return R;
}

void MCP::ReportPipelines(const Slot& Previous)
{
	const GpuStats& Stats = Telemetry.LatestStats();
	if (Stats.Tick != Previous.Tick || Previous.Tick == 0)
	{
		return;
	}
	const double Budget = Telemetry.BudgetMs() * MCPBudgetShare;
	for (uint32_t K = 0; K < KernelCount; ++K)
	{
		PipelineMetrics M;
		M.GpuMs = Stats.ScopeMs(KernelScopes[K]);
		M.BudgetMs = Budget * KernelBudgetShare[K];
		M.Invocations = Previous.Invocations[K];
		M.Dispatches = 1;
		Telemetry.ReportPipelinePressure(KernelScopes[K], M);
	}
	PipelineMetrics Upload;
	Upload.GpuMs = Stats.ScopeMs("transfer.upload");
	Upload.BudgetMs = Telemetry.BudgetMs() * 0.05;
	Upload.Dispatches = 1;
	Telemetry.ReportPipelinePressure("transfer.upload", Upload);
}

uint64_t MCP::SubmitRealmTick(RealmState& Realm)
{
	const uint64_t K = Submitted + 1;
	Slot& S = Slots[K % FramesInFlight];
	const uint32_t P = static_cast<uint32_t>(K & 1u);

	// Frames-in-flight limit: the slot (and parity buffers) were last used by tick K - 2.
	if (K > FramesInFlight)
	{
		const uint64_t Old = K - FramesInFlight;
		Ctx.WaitTimeline(ComputeSem, Old);
		if (GraphicsSem)
		{
			Ctx.WaitTimeline(GraphicsSem, Old);
		}
		if (Returned < S.Tick)
		{
			Snapshot = ReadSlot(S); // keep the results before the slot is overwritten
		}
	}
	Telemetry.BeginSlot(K % FramesInFlight, K);
	ReportPipelines(S);

	Realm.Tick = K;
	Realm.Time += static_cast<double>(Realm.Dt) * Realm.Meta.TimeDilation;
	if (bActorsPending)
	{
		ActiveActors = static_cast<uint32_t>(PendingActors.size());
	}
	ActiveSigils = static_cast<uint32_t>(CurrentSigils.size());
	const FRealmTickGPU TickData = Realm.BuildTick(Cfg, ActiveActors, ActiveSigils, static_cast<uint32_t>(CurrentTrees.size()));
	Realm.bGenesis = false;

	// --- Staging -----------------------------------------------------------------------
	auto* Staging = static_cast<uint8_t*>(S.Staging.Mapped);
	std::memcpy(Staging + StagingTick, &TickData, sizeof(TickData));
	if (!CurrentSigils.empty())
	{
		std::memcpy(Staging + StagingSigils, CurrentSigils.data(), sizeof(FSigilGPU) * CurrentSigils.size());
	}
	if (!CurrentTrees.empty())
	{
		std::memcpy(Staging + StagingTrees, CurrentTrees.data(), sizeof(FBTNodeGPU) * CurrentTrees.size());
	}
	const bool bUploadActors = bActorsPending && !PendingActors.empty();
	if (bUploadActors)
	{
		std::memcpy(Staging + StagingActors, PendingActors.data(), sizeof(FActorGPU) * PendingActors.size());
	}
	Ctx.Flush(S.Staging);

	// --- Transfer queue: PrimordiaOS -> device ----------------------------------------
	VkCommandBufferBeginInfo Begin{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO };
	Begin.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
	PGPU_CHECK(vkResetCommandBuffer(S.TransferCmd, 0));
	PGPU_CHECK(vkBeginCommandBuffer(S.TransferCmd, &Begin));
	{
		auto Scope = Telemetry.GpuScope(S.TransferCmd, QueueRole::Transfer, K % FramesInFlight, "transfer.upload");
		std::vector<VkBufferCopy> One(1);
		One[0] = { StagingTick, 0, sizeof(FRealmTickGPU) };
		vkCmdCopyBuffer(S.TransferCmd, S.Staging.Handle, TickBuf[P].Handle, 1, One.data());
		if (!CurrentSigils.empty())
		{
			One[0] = { StagingSigils, 0, sizeof(FSigilGPU) * CurrentSigils.size() };
			vkCmdCopyBuffer(S.TransferCmd, S.Staging.Handle, Sigils[P].Handle, 1, One.data());
		}
		if (!CurrentTrees.empty())
		{
			One[0] = { StagingTrees, 0, sizeof(FBTNodeGPU) * CurrentTrees.size() };
			vkCmdCopyBuffer(S.TransferCmd, S.Staging.Handle, BTNodes[P].Handle, 1, One.data());
		}
		if (bUploadActors)
		{
			// A new population enters as "last tick's" actors; its memories start empty.
			One[0] = { StagingActors, 0, sizeof(FActorGPU) * PendingActors.size() };
			vkCmdCopyBuffer(S.TransferCmd, S.Staging.Handle, Actors[1 - P].Handle, 1, One.data());
			vkCmdFillBuffer(S.TransferCmd, Recall[1 - P].Handle, 0, VK_WHOLE_SIZE, 0);
			vkCmdFillBuffer(S.TransferCmd, Memory.Handle, 0, VK_WHOLE_SIZE, 0);
		}
	}
	PGPU_CHECK(vkEndCommandBuffer(S.TransferCmd));

	std::vector<VkSemaphoreSubmitInfo> TransferWaits;
	// Parity-P buffers were last read by frame K - 2; a new population overwrites parity
	// 1 - P, which frame K - 1 reads.
	const uint64_t GraphicsDone = bUploadActors ? K - 1 : (K > 2 ? K - 2 : 0);
	if (GraphicsSem && GraphicsDone > 0)
	{
		TransferWaits.push_back(TimelineWait(GraphicsSem, GraphicsDone, VK_PIPELINE_STAGE_2_ALL_TRANSFER_BIT));
	}
	if (K > 1)
	{
		// Also after compute K - 1, which reads parity 1 - P and is ordered before any new upload.
		TransferWaits.push_back(TimelineWait(ComputeSem, K - 1, VK_PIPELINE_STAGE_2_ALL_TRANSFER_BIT));
	}
	VkSemaphoreSubmitInfo TransferSignal = TimelineWait(TransferSem, K, VK_PIPELINE_STAGE_2_ALL_TRANSFER_BIT);
	VkCommandBufferSubmitInfo TransferCmdInfo{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_SUBMIT_INFO };
	TransferCmdInfo.commandBuffer = S.TransferCmd;
	VkSubmitInfo2 TransferSubmit{ VK_STRUCTURE_TYPE_SUBMIT_INFO_2 };
	TransferSubmit.waitSemaphoreInfoCount = static_cast<uint32_t>(TransferWaits.size());
	TransferSubmit.pWaitSemaphoreInfos = TransferWaits.data();
	TransferSubmit.commandBufferInfoCount = 1;
	TransferSubmit.pCommandBufferInfos = &TransferCmdInfo;
	TransferSubmit.signalSemaphoreInfoCount = 1;
	TransferSubmit.pSignalSemaphoreInfos = &TransferSignal;
	PGPU_CHECK(vkQueueSubmit2(Ctx.Queue(QueueRole::Transfer).Queue, 1, &TransferSubmit, VK_NULL_HANDLE));
	bActorsPending = false;

	// --- Compute queue: the MCP kernels ------------------------------------------------
	const uint32_t SlotIndex = static_cast<uint32_t>(K % FramesInFlight);
	VkCommandBuffer Cmd = S.ComputeCmd;
	PGPU_CHECK(vkResetCommandBuffer(Cmd, 0));
	PGPU_CHECK(vkBeginCommandBuffer(Cmd, &Begin));
	Telemetry.BeginStatistics(Cmd, QueueRole::Compute, SlotIndex);
	vkCmdBindDescriptorSets(Cmd, VK_PIPELINE_BIND_POINT_COMPUTE, Layout, 0, 1, &Sets[P], 0, nullptr);

	const uint32_t N = Cfg.TerrainN;
	const uint32_t Nc = N / MCP_STRUCTURE_STRIDE;
	const uint32_t M = Cfg.FieldN;
	const uint32_t A = ActiveActors;
	// Every pass follows a full barrier, so Onyx can time each kernel on its own.
	auto Dispatch = [&](EKernel Kernel, uint32_t X, uint32_t Y, uint32_t Z, uint64_t ThreadsPerGroup)
	{
		auto Scope = Telemetry.GpuScope(Cmd, QueueRole::Compute, SlotIndex, KernelScopes[Kernel], Kernel != KTickReset);
		vkCmdBindPipeline(Cmd, VK_PIPELINE_BIND_POINT_COMPUTE, Pipelines[Kernel]);
		if (X && Y && Z)
		{
			vkCmdDispatch(Cmd, X, Y, Z);
		}
		S.Invocations[Kernel] = uint64_t(X) * Y * Z * ThreadsPerGroup;
	};

	Dispatch(KTickReset, 1, 1, 1, 64);
	ComputeBarrier(Cmd);
	Dispatch(KTopology, Groups(N, MCP_GROUP_2D), Groups(N, MCP_GROUP_2D), 1, 64);
	ComputeBarrier(Cmd);
	// Structures and the sigil field share no buffers and could overlap without this barrier;
	// it costs about 0.02 ms and buys exact per-kernel timings.
	Dispatch(KStructures, Groups(Nc, MCP_GROUP_2D), Groups(Nc, MCP_GROUP_2D), 1, 64);
	ComputeBarrier(Cmd);
	Dispatch(KSigilField, Groups(M, MCP_GROUP_3D), Groups(M, MCP_GROUP_3D), Groups(M, MCP_GROUP_3D), 64);
	ComputeBarrier(Cmd);
	Dispatch(KCognition, Groups(A, MCP_GROUP_1D), 1, 1, 64);
	ComputeBarrier(Cmd);
	Dispatch(KMemoryCompress, Groups(A, MCP_GROUP_1D), 1, 1, 64);
	ComputeBarrier(Cmd);
	Dispatch(KMemoryRetrieve, A, 1, 1, MCP_MEMORY_SLOTS);
	ComputeBarrier(Cmd, VK_PIPELINE_STAGE_2_COPY_BIT, VK_ACCESS_2_TRANSFER_READ_BIT);

	// Results for the CPU (latest-wins; read by GetGPUResults without waiting).
	{
		auto Scope = Telemetry.GpuScope(Cmd, QueueRole::Compute, SlotIndex, "mcp.readback", true);
		const ReadbackLayout L(Cfg.MaxActors);
		const VkBufferCopy ActorsCopy{ 0, L.Actors, sizeof(FActorGPU) * std::max(1u, A) };
		const VkBufferCopy CostCopy{ 0, L.Costs, sizeof(FActorCostGPU) * std::max(1u, A) };
		const VkBufferCopy RecallCopy{ 0, L.Recall, sizeof(FRecallGPU) * std::max(1u, A) };
		const VkBufferCopy SigilCopy{ 0, L.SigilCost, sizeof(uint32_t) * MCP_MAX_SIGILS };
		const VkBufferCopy ArgsCopy{ 0, L.Args, 16 };
		vkCmdCopyBuffer(Cmd, Actors[P].Handle, S.Readback.Handle, 1, &ActorsCopy);
		vkCmdCopyBuffer(Cmd, ActorCost[P].Handle, S.Readback.Handle, 1, &CostCopy);
		vkCmdCopyBuffer(Cmd, Recall[P].Handle, S.Readback.Handle, 1, &RecallCopy);
		vkCmdCopyBuffer(Cmd, SigilCost[P].Handle, S.Readback.Handle, 1, &SigilCopy);
		vkCmdCopyBuffer(Cmd, StructureArgs[P].Handle, S.Readback.Handle, 1, &ArgsCopy);
	}
	Telemetry.EndStatistics(Cmd, QueueRole::Compute, SlotIndex);
	PGPU_CHECK(vkEndCommandBuffer(Cmd));

	const VkSemaphoreSubmitInfo ComputeWait = TimelineWait(TransferSem, K, VK_PIPELINE_STAGE_2_COMPUTE_SHADER_BIT);
	const VkSemaphoreSubmitInfo ComputeSignal = TimelineWait(ComputeSem, K, VK_PIPELINE_STAGE_2_ALL_COMMANDS_BIT);
	VkCommandBufferSubmitInfo ComputeCmdInfo{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_SUBMIT_INFO };
	ComputeCmdInfo.commandBuffer = Cmd;
	VkSubmitInfo2 ComputeSubmit{ VK_STRUCTURE_TYPE_SUBMIT_INFO_2 };
	ComputeSubmit.waitSemaphoreInfoCount = 1;
	ComputeSubmit.pWaitSemaphoreInfos = &ComputeWait;
	ComputeSubmit.commandBufferInfoCount = 1;
	ComputeSubmit.pCommandBufferInfos = &ComputeCmdInfo;
	ComputeSubmit.signalSemaphoreInfoCount = 1;
	ComputeSubmit.pSignalSemaphoreInfos = &ComputeSignal;
	PGPU_CHECK(vkQueueSubmit2(Ctx.Queue(QueueRole::Compute).Queue, 1, &ComputeSubmit, VK_NULL_HANDLE));

	S.Tick = K;
	S.ActorCount = A;
	S.SigilCount = ActiveSigils;
	Submitted = K;
	return K;
}

std::optional<MCPResults> MCP::GetGPUResults()
{
	// The newest completed tick whose slot has not been reused yet.
	const uint64_t Completed = CompletedTick();
	std::optional<MCPResults> Out;
	if (Completed > Returned && Completed + FramesInFlight > Submitted)
	{
		const Slot& S = Slots[Completed % FramesInFlight];
		if (S.Tick == Completed)
		{
			Out = ReadSlot(S);
		}
	}
	if (!Out && Snapshot && Snapshot->Tick > Returned)
	{
		Out = std::move(Snapshot);
	}
	Snapshot.reset();
	if (Out)
	{
		Returned = Out->Tick;
	}
	return Out;
}

MCP::TickBuffers MCP::OutputsForParity(uint32_t P) const
{
	TickBuffers T;
	T.Tick = &TickBuf[P];
	T.Terrain = &Terrain[P];
	T.Structures = &Structures[P];
	T.StructureArgs = &StructureArgs[P];
	T.Sigils = &Sigils[P];
	T.Field = &Field[P];
	T.Actors = &Actors[P];
	T.Recall = &Recall[P];
	return T;
}

MCP::TickBuffers MCP::Outputs(uint64_t Tick) const
{
	TickBuffers T = OutputsForParity(static_cast<uint32_t>(Tick & 1u));
	const Slot& S = Slots[Tick % FramesInFlight];
	T.ActorCount = S.Tick == Tick ? S.ActorCount : ActiveActors;
	T.SigilCount = S.Tick == Tick ? S.SigilCount : ActiveSigils;
	return T;
}
} // namespace primordia::gpu
