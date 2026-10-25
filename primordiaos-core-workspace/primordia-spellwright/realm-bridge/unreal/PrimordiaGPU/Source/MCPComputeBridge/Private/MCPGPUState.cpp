#include "MCPGPUState.h"

#include "MCPShaders.h"
#include "OnyxGPUTimer.h"
#include "RenderGraphBuilder.h"
#include "RenderGraphUtils.h"
#include "RenderingThread.h"
#include "ShaderParameterStruct.h"

#include <atomic>

using namespace PrimordiaMCP;

namespace
{
FCriticalSection RegistryLock;
std::atomic<bool> GShuttingDown{ false }; // set at engine pre-exit: no GPU resources after that
TMap<const FSceneInterface*, TSharedPtr<FMCPGPUState, ESPMode::ThreadSafe>> Registry;

constexpr uint32 MaxTreeNodes = 1024;

uint32 Groups(uint32 Count, uint32 Size)
{
	return (Count + Size - 1) / Size;
}

template <typename T>
TRefCountPtr<FRDGPooledBuffer> MakeStructured(uint32 Count, const TCHAR* Name)
{
	return AllocatePooledBuffer(FRDGBufferDesc::CreateStructuredDesc(sizeof(T), FMath::Max(1u, Count)), Name);
}

/** Uploads Data into Dst through a transient buffer (RDG copies the bytes at graph build time). */
template <typename T>
void Upload(FRDGBuilder& GraphBuilder, FRDGBufferRef Dst, const TArray<T>& Data, const TCHAR* Name)
{
	if (Data.Num() == 0)
	{
		return;
	}
	FRDGBufferRef Staging = CreateStructuredBuffer(GraphBuilder, Name, sizeof(T), Data.Num(), Data.GetData(), Data.Num() * sizeof(T));
	AddCopyBufferPass(GraphBuilder, Dst, 0, Staging, 0, Data.Num() * sizeof(T));
}
} // namespace

FMCPGPUState::FMCPGPUState(const GridConfig& Config) : Cfg(Config)
{
	Cfg.TerrainN = FMath::Max(16u, Cfg.TerrainN / MCP_STRUCTURE_STRIDE * MCP_STRUCTURE_STRIDE);
	Cfg.MaxActors = FMath::Max(1u, Cfg.MaxActors);
}

void FMCPGPUState::Register(const FSceneInterface* Scene, const TSharedPtr<FMCPGPUState, ESPMode::ThreadSafe>& State)
{
	FScopeLock Guard(&RegistryLock);
	Registry.Add(Scene, State);
}

void FMCPGPUState::Unregister(const FSceneInterface* Scene)
{
	FScopeLock Guard(&RegistryLock);
	Registry.Remove(Scene);
}

void FMCPGPUState::UnregisterState(const FMCPGPUState* State)
{
	FScopeLock Guard(&RegistryLock);
	for (auto It = Registry.CreateIterator(); It; ++It)
	{
		if (It->Value.Get() == State)
		{
			It.RemoveCurrent();
		}
	}
}

void FMCPGPUState::ReleaseAll()
{
	GShuttingDown = true;
	TArray<TSharedPtr<FMCPGPUState, ESPMode::ThreadSafe>> States;
	{
		FScopeLock Guard(&RegistryLock);
		Registry.GenerateValueArray(States);
		Registry.Empty();
	}
	for (const TSharedPtr<FMCPGPUState, ESPMode::ThreadSafe>& State : States)
	{
		ENQUEUE_RENDER_COMMAND(MCPReleaseAll)([State](FRHICommandListImmediate&) { State->ReleaseResources_RenderThread(); });
	}
	FlushRenderingCommands();
}

void FMCPGPUState::ReleaseResources_RenderThread()
{
	check(IsInRenderingThread());
	for (FReadbackSlot& S : Readbacks)
	{
		S = FReadbackSlot();
	}
	for (TRefCountPtr<FRDGPooledBuffer>* B : { &TickBuf, &Structures, &StructureArgs, &Sigils, &Field, &SigilCost, &BTNodes, &ActorCost, &Episodes, &Memory,
		&Terrain[0], &Terrain[1], &Actors[0], &Actors[1], &Recall[0], &Recall[1] })
	{
		B->SafeRelease();
	}
	bAllocated = false;
	bHasField = false;
	ActorCount = 0;
}

TSharedPtr<FMCPGPUState, ESPMode::ThreadSafe> FMCPGPUState::Find(const FSceneInterface* Scene)
{
	FScopeLock Guard(&RegistryLock);
	const TSharedPtr<FMCPGPUState, ESPMode::ThreadSafe>* Found = Registry.Find(Scene);
	return Found ? *Found : nullptr;
}

void FMCPGPUState::Allocate(FRDGBuilder& GraphBuilder)
{
	const uint32 TerrainCells = Cfg.TerrainN * Cfg.TerrainN;
	const uint32 Voxels = Cfg.FieldN * Cfg.FieldN * Cfg.FieldN;
	TickBuf = MakeStructured<FRealmTickGPU>(1, TEXT("MCP.Tick"));
	Structures = MakeStructured<FStructureGPU>(Cfg.MaxStructures, TEXT("MCP.Structures"));
	StructureArgs = MakeStructured<uint32>(4, TEXT("MCP.StructureArgs"));
	Sigils = MakeStructured<FSigilGPU>(MCP_MAX_SIGILS, TEXT("MCP.Sigils"));
	Field = MakeStructured<FFieldVoxelGPU>(Voxels, TEXT("MCP.SigilField"));
	SigilCost = MakeStructured<uint32>(MCP_MAX_SIGILS, TEXT("MCP.SigilCost"));
	BTNodes = MakeStructured<FBTNodeGPU>(MaxTreeNodes, TEXT("MCP.BTNodes"));
	ActorCost = MakeStructured<FActorCostGPU>(Cfg.MaxActors, TEXT("MCP.ActorCost"));
	Episodes = MakeStructured<FEpisodeGPU>(Cfg.MaxActors, TEXT("MCP.Episodes"));
	Memory = MakeStructured<FMemoryGPU>(Cfg.MaxActors * MCP_MEMORY_SLOTS, TEXT("MCP.Memory"));
	for (int32 P = 0; P < 2; ++P)
	{
		Terrain[P] = MakeStructured<FTerrainCellGPU>(TerrainCells, TEXT("MCP.Terrain"));
		Actors[P] = MakeStructured<FActorGPU>(Cfg.MaxActors, TEXT("MCP.Actors"));
		Recall[P] = MakeStructured<FRecallGPU>(Cfg.MaxActors, TEXT("MCP.Recall"));
	}
	// Everything starts zeroed: the first tick reads "last tick's" terrain, actors and recall.
	for (TRefCountPtr<FRDGPooledBuffer>* B : { &TickBuf, &Structures, &StructureArgs, &Sigils, &Field, &SigilCost, &BTNodes, &ActorCost, &Episodes, &Memory,
		&Terrain[0], &Terrain[1], &Actors[0], &Actors[1], &Recall[0], &Recall[1] })
	{
		AddClearUAVPass(GraphBuilder, GraphBuilder.CreateUAV(GraphBuilder.RegisterExternalBuffer(*B)), 0u);
	}
	for (FReadbackSlot& S : Readbacks)
	{
		S.Actors = MakeUnique<FRHIGPUBufferReadback>(TEXT("MCP.Readback.Actors"));
		S.Costs = MakeUnique<FRHIGPUBufferReadback>(TEXT("MCP.Readback.Costs"));
		S.Recall = MakeUnique<FRHIGPUBufferReadback>(TEXT("MCP.Readback.Recall"));
		S.SigilCost = MakeUnique<FRHIGPUBufferReadback>(TEXT("MCP.Readback.SigilCost"));
		S.Args = MakeUnique<FRHIGPUBufferReadback>(TEXT("MCP.Readback.Args"));
	}
	bAllocated = true;
}

void FMCPGPUState::PollReadbacks_RenderThread()
{
	for (FReadbackSlot& S : Readbacks)
	{
		if (!S.bPending || !S.Actors->IsReady() || !S.Costs->IsReady() || !S.Recall->IsReady() || !S.SigilCost->IsReady() || !S.Args->IsReady())
		{
			continue;
		}
		FMCPNativeResults R;
		R.Tick = S.Tick;
		R.RealmTime = S.RealmTime;
		auto Read = [](FRHIGPUBufferReadback& Readback, auto& Out, uint32 Count)
		{
			using ElementType = typename TRemoveReference<decltype(Out)>::Type::ElementType;
			Out.SetNumUninitialized(Count);
			if (Count > 0)
			{
				const void* Data = Readback.Lock(Count * sizeof(ElementType));
				FMemory::Memcpy(Out.GetData(), Data, Count * sizeof(ElementType));
				Readback.Unlock();
			}
		};
		Read(*S.Actors, R.Actors, S.ActorCount);
		Read(*S.Costs, R.Costs, S.ActorCount);
		Read(*S.Recall, R.Recall, S.ActorCount);
		Read(*S.SigilCost, R.SigilVoxels, S.SigilCount);
		TArray<uint32> Args;
		Read(*S.Args, Args, 4);
		R.Structures = FMath::Min(Args[1], Cfg.MaxStructures);
		S.bPending = false;

		FScopeLock Guard(&ResultsLock);
		if (R.Tick > Latest.Tick)
		{
			Latest = MoveTemp(R);
			bLatestFresh = true;
		}
	}
}

bool FMCPGPUState::TakeResults(FMCPNativeResults& Out)
{
	FScopeLock Guard(&ResultsLock);
	if (!bLatestFresh)
	{
		return false;
	}
	Out = Latest;
	bLatestFresh = false;
	return true;
}

FMCPGPUState::FFieldView FMCPGPUState::GetFieldView_RenderThread() const
{
	FFieldView View;
	View.Tick = TickBuf;
	View.Field = Field;
	View.RealmToWorld = RealmToWorld;
	View.UnitsPerMeter = UnitsPerMeter;
	View.bValid = bHasField;
	return View;
}

void FMCPGPUState::ExecuteTick_RenderThread(FRDGBuilder& GraphBuilder, FMCPTickInput&& Input)
{
	check(IsInRenderingThread());
	if (GShuttingDown)
	{
		return;
	}
	if (!bAllocated)
	{
		Allocate(GraphBuilder);
	}
	PollReadbacks_RenderThread();

	const uint64 TickIndex = Input.Tick.Counts.z;
	const uint32 P = static_cast<uint32>(TickIndex & 1u);
	const uint32 Q = 1u - P;
	RealmToWorld = Input.RealmToWorld;
	UnitsPerMeter = Input.UnitsPerMeter;

	FRDGBufferRef RTick = GraphBuilder.RegisterExternalBuffer(TickBuf);
	FRDGBufferRef RTerrainIn = GraphBuilder.RegisterExternalBuffer(Terrain[Q]);
	FRDGBufferRef RTerrainOut = GraphBuilder.RegisterExternalBuffer(Terrain[P]);
	FRDGBufferRef RStructures = GraphBuilder.RegisterExternalBuffer(Structures);
	FRDGBufferRef RArgs = GraphBuilder.RegisterExternalBuffer(StructureArgs);
	FRDGBufferRef RSigils = GraphBuilder.RegisterExternalBuffer(Sigils);
	FRDGBufferRef RField = GraphBuilder.RegisterExternalBuffer(Field);
	FRDGBufferRef RSigilCost = GraphBuilder.RegisterExternalBuffer(SigilCost);
	FRDGBufferRef RActorsIn = GraphBuilder.RegisterExternalBuffer(Actors[Q]);
	FRDGBufferRef RActorsOut = GraphBuilder.RegisterExternalBuffer(Actors[P]);
	FRDGBufferRef RTrees = GraphBuilder.RegisterExternalBuffer(BTNodes);
	FRDGBufferRef RCost = GraphBuilder.RegisterExternalBuffer(ActorCost);
	FRDGBufferRef REpisodes = GraphBuilder.RegisterExternalBuffer(Episodes);
	FRDGBufferRef RMemory = GraphBuilder.RegisterExternalBuffer(Memory);
	FRDGBufferRef RRecallIn = GraphBuilder.RegisterExternalBuffer(Recall[Q]);
	FRDGBufferRef RRecallOut = GraphBuilder.RegisterExternalBuffer(Recall[P]);

	// --- PrimordiaOS -> GPU ---------------------------------------------------------------
	if (Input.bActorsChanged)
	{
		// A new population enters as "last tick's" actors, with empty memories.
		Input.Actors.SetNum(FMath::Min<int32>(Input.Actors.Num(), Cfg.MaxActors));
		ActorCount = Input.Actors.Num();
		Upload(GraphBuilder, RActorsIn, Input.Actors, TEXT("MCP.Upload.Actors"));
		AddClearUAVPass(GraphBuilder, GraphBuilder.CreateUAV(RRecallIn), 0u);
		AddClearUAVPass(GraphBuilder, GraphBuilder.CreateUAV(RMemory), 0u);
	}
	Input.Tick.Counts.x = ActorCount; // the population the GPU actually holds
	TArray<FRealmTickGPU> TickData;
	TickData.Add(Input.Tick);
	Upload(GraphBuilder, RTick, TickData, TEXT("MCP.Upload.Tick"));
	if (Input.Sigils.Num() > static_cast<int32>(MCP_MAX_SIGILS))
	{
		Input.Sigils.SetNum(MCP_MAX_SIGILS);
	}
	Upload(GraphBuilder, RSigils, Input.Sigils, TEXT("MCP.Upload.Sigils"));
	if (Input.bTreesChanged)
	{
		Input.Trees.SetNum(FMath::Min<int32>(Input.Trees.Num(), MaxTreeNodes));
		Upload(GraphBuilder, RTrees, Input.Trees, TEXT("MCP.Upload.Trees"));
	}

	// --- The kernels ------------------------------------------------------------------------
	const ERDGPassFlags Flags = Input.bAsyncCompute ? ERDGPassFlags::AsyncCompute : ERDGPassFlags::Compute;
	const bool bTimed = !Input.bAsyncCompute; // timestamps live on the graphics pipe only
	FGlobalShaderMap* ShaderMap = GetGlobalShaderMap(GMaxRHIFeatureLevel);
	FOnyxGPUTimer& Timer = FOnyxGPUTimer::Get();
	// Each stamp waits for the buffer the previous kernel wrote (see FOnyxGPUTimer).
	auto Stamp = [&](const TCHAR* Name, FRDGBufferRef After)
	{
		if (bTimed)
		{
			Timer.Stamp(GraphBuilder, Name, After);
		}
	};
	const uint32 N = Cfg.TerrainN;
	const uint32 Nc = N / MCP_STRUCTURE_STRIDE;
	const uint32 M = Cfg.FieldN;
	const uint32 A = ActorCount;

	Stamp(TEXT("mcp.tick_reset"), RTick);
	{
		auto* Params = GraphBuilder.AllocParameters<FMCPTickResetCS::FParameters>();
		Params->StructureArgs = GraphBuilder.CreateUAV(RArgs);
		Params->SigilCost = GraphBuilder.CreateUAV(RSigilCost);
		FComputeShaderUtils::AddPass(GraphBuilder, RDG_EVENT_NAME("MCP.TickReset"), Flags, TShaderMapRef<FMCPTickResetCS>(ShaderMap), Params, FIntVector(1, 1, 1));
	}
	Stamp(TEXT("mcp.topology"), RArgs);
	{
		auto* Params = GraphBuilder.AllocParameters<FMCPTopologyCS::FParameters>();
		Params->TickBuffer = GraphBuilder.CreateSRV(RTick);
		Params->TerrainIn = GraphBuilder.CreateSRV(RTerrainIn);
		Params->TerrainOut = GraphBuilder.CreateUAV(RTerrainOut);
		FComputeShaderUtils::AddPass(GraphBuilder, RDG_EVENT_NAME("MCP.Topology"), Flags, TShaderMapRef<FMCPTopologyCS>(ShaderMap), Params,
			FIntVector(Groups(N, MCP_GROUP_2D), Groups(N, MCP_GROUP_2D), 1));
	}
	Stamp(TEXT("mcp.structures"), RTerrainOut);
	{
		auto* Params = GraphBuilder.AllocParameters<FMCPStructuresCS::FParameters>();
		Params->TickBuffer = GraphBuilder.CreateSRV(RTick);
		Params->TerrainCurrent = GraphBuilder.CreateSRV(RTerrainOut);
		Params->Structures = GraphBuilder.CreateUAV(RStructures);
		Params->StructureArgs = GraphBuilder.CreateUAV(RArgs);
		FComputeShaderUtils::AddPass(GraphBuilder, RDG_EVENT_NAME("MCP.Structures"), Flags, TShaderMapRef<FMCPStructuresCS>(ShaderMap), Params,
			FIntVector(Groups(Nc, MCP_GROUP_2D), Groups(Nc, MCP_GROUP_2D), 1));
	}
	Stamp(TEXT("mcp.sigil_field"), RStructures);
	{
		auto* Params = GraphBuilder.AllocParameters<FMCPSigilFieldCS::FParameters>();
		Params->TickBuffer = GraphBuilder.CreateSRV(RTick);
		Params->Sigils = GraphBuilder.CreateSRV(RSigils);
		Params->SigilFieldOut = GraphBuilder.CreateUAV(RField);
		Params->SigilCost = GraphBuilder.CreateUAV(RSigilCost);
		FComputeShaderUtils::AddPass(GraphBuilder, RDG_EVENT_NAME("MCP.SigilField"), Flags, TShaderMapRef<FMCPSigilFieldCS>(ShaderMap), Params,
			FIntVector(Groups(M, MCP_GROUP_3D), Groups(M, MCP_GROUP_3D), Groups(M, MCP_GROUP_3D)));
	}
	if (A > 0)
	{
		Stamp(TEXT("mcp.cognition"), RField);
		{
			auto* Params = GraphBuilder.AllocParameters<FMCPCognitionCS::FParameters>();
			Params->TickBuffer = GraphBuilder.CreateSRV(RTick);
			Params->TerrainCurrent = GraphBuilder.CreateSRV(RTerrainOut);
			Params->SigilFieldCurrent = GraphBuilder.CreateSRV(RField);
			Params->Sigils = GraphBuilder.CreateSRV(RSigils);
			Params->ActorsIn = GraphBuilder.CreateSRV(RActorsIn);
			Params->ActorsOut = GraphBuilder.CreateUAV(RActorsOut);
			Params->BTNodes = GraphBuilder.CreateSRV(RTrees);
			Params->RecallIn = GraphBuilder.CreateSRV(RRecallIn);
			Params->ActorCost = GraphBuilder.CreateUAV(RCost);
			Params->EpisodesOut = GraphBuilder.CreateUAV(REpisodes);
			FComputeShaderUtils::AddPass(GraphBuilder, RDG_EVENT_NAME("MCP.Cognition"), Flags, TShaderMapRef<FMCPCognitionCS>(ShaderMap), Params,
				FIntVector(Groups(A, MCP_GROUP_1D), 1, 1));
		}
		Stamp(TEXT("mcp.memory_compress"), REpisodes);
		{
			auto* Params = GraphBuilder.AllocParameters<FMCPMemoryCompressCS::FParameters>();
			Params->TickBuffer = GraphBuilder.CreateSRV(RTick);
			Params->EpisodesIn = GraphBuilder.CreateSRV(REpisodes);
			Params->ActorsOut = GraphBuilder.CreateUAV(RActorsOut);
			Params->Memory = GraphBuilder.CreateUAV(RMemory);
			Params->ActorCost = GraphBuilder.CreateUAV(RCost);
			FComputeShaderUtils::AddPass(GraphBuilder, RDG_EVENT_NAME("MCP.MemoryCompress"), Flags, TShaderMapRef<FMCPMemoryCompressCS>(ShaderMap), Params,
				FIntVector(Groups(A, MCP_GROUP_1D), 1, 1));
		}
		Stamp(TEXT("mcp.memory_retrieve"), RMemory);
		{
			auto* Params = GraphBuilder.AllocParameters<FMCPMemoryRetrieveCS::FParameters>();
			Params->TickBuffer = GraphBuilder.CreateSRV(RTick);
			Params->EpisodesIn = GraphBuilder.CreateSRV(REpisodes);
			Params->ActorsCurrent = GraphBuilder.CreateSRV(RActorsOut);
			Params->MemoryCurrent = GraphBuilder.CreateSRV(RMemory);
			Params->RecallOut = GraphBuilder.CreateUAV(RRecallOut);
			Params->ActorCost = GraphBuilder.CreateUAV(RCost);
			FComputeShaderUtils::AddPass(GraphBuilder, RDG_EVENT_NAME("MCP.MemoryRetrieve"), Flags, TShaderMapRef<FMCPMemoryRetrieveCS>(ShaderMap), Params,
				FIntVector(static_cast<int32>(A), 1, 1));
		}
	}
	if (bTimed)
	{
		Timer.Close(GraphBuilder, A > 0 ? RRecallOut : RField);
	}

	// --- GPU -> game thread (read a few frames later, never waited on) ----------------------
	FReadbackSlot& Slot = Readbacks[TickIndex % ReadbackSlots];
	if (!Slot.bPending) // a slot still in flight is skipped rather than overwritten
	{
		Slot.Tick = TickIndex;
		Slot.RealmTime = Input.Tick.Time.x;
		Slot.ActorCount = A;
		Slot.SigilCount = FMath::Min<uint32>(Input.Tick.Counts.y, MCP_MAX_SIGILS);
		AddEnqueueCopyPass(GraphBuilder, Slot.Actors.Get(), RActorsOut, FMath::Max(1u, A) * sizeof(FActorGPU));
		AddEnqueueCopyPass(GraphBuilder, Slot.Costs.Get(), RCost, FMath::Max(1u, A) * sizeof(FActorCostGPU));
		AddEnqueueCopyPass(GraphBuilder, Slot.Recall.Get(), RRecallOut, FMath::Max(1u, A) * sizeof(FRecallGPU));
		AddEnqueueCopyPass(GraphBuilder, Slot.SigilCost.Get(), RSigilCost, MCP_MAX_SIGILS * sizeof(uint32));
		AddEnqueueCopyPass(GraphBuilder, Slot.Args.Get(), RArgs, 4 * sizeof(uint32));
		Slot.bPending = true;
	}
	bHasField = true;
}
