#include "MCPComputeSubsystem.h"

#include "Engine/World.h"
#include "MCPCognitionComponent.h"
#include "Onyx.h"
#include "RenderGraphBuilder.h"
#include "RenderingThread.h"
#include "SceneInterface.h"

using namespace PrimordiaMCP;

namespace
{
const TCHAR* const KernelScopes[] = { TEXT("mcp.tick_reset"), TEXT("mcp.topology"), TEXT("mcp.structures"), TEXT("mcp.sigil_field"),
	TEXT("mcp.cognition"), TEXT("mcp.memory_compress"), TEXT("mcp.memory_retrieve") };
// Share of the MCP budget each kernel is expected to use (same split as the standalone engine).
const double KernelBudgetShare[] = { 0.01, 0.20, 0.05, 0.25, 0.30, 0.05, 0.14 };

uint32 KindOf(EMCPGlyphKind Kind)
{
	switch (Kind)
	{
	case EMCPGlyphKind::Soul: return MCP_GLYPH_SOUL;
	case EMCPGlyphKind::Ward: return MCP_GLYPH_WARD;
	case EMCPGlyphKind::Gate: return MCP_GLYPH_GATE;
	default: return MCP_GLYPH_SIGIL;
	}
}

uint32 Groups(uint32 Count, uint32 Size)
{
	return (Count + Size - 1) / Size;
}
} // namespace

UMCPComputeSubsystem* UMCPComputeSubsystem::Get(const UObject* WorldContextObject)
{
	const UWorld* World = WorldContextObject ? WorldContextObject->GetWorld() : nullptr;
	return World ? World->GetSubsystem<UMCPComputeSubsystem>() : nullptr;
}

bool UMCPComputeSubsystem::DoesSupportWorldType(const EWorldType::Type WorldType) const
{
	return WorldType == EWorldType::Game || WorldType == EWorldType::PIE || WorldType == EWorldType::Editor;
}

void UMCPComputeSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	const UMCPSettings* Settings = GetDefault<UMCPSettings>();
	Grid.TerrainN = static_cast<uint32>(Settings->TerrainResolution);
	Grid.FieldN = static_cast<uint32>(Settings->FieldResolution);
	Grid.MaxActors = static_cast<uint32>(Settings->MaxActors);
	Grid.MaxStructures = static_cast<uint32>(Settings->MaxStructures);
	Grid.MemoryInterval = static_cast<uint32>(Settings->MemoryIntervalTicks);
	Grid.RecallMinAge = Settings->RecallMinAgeSeconds;
	Grid.CommitSeconds = Settings->CommitSeconds;
	CrowdSize = Settings->CrowdSize;
	BudgetShare = Settings->BudgetShare;
	bAsyncCompute = Settings->bAsyncCompute;
	if (!Trees.Compiler.Error().empty())
	{
		UE_LOG(LogTemp, Error, TEXT("MCP default behavior trees: %hs"), Trees.Compiler.Error().c_str());
	}
	if (Settings->bEnabled)
	{
		GPU = MakeShared<FMCPGPUState, ESPMode::ThreadSafe>(Grid);
		Grid = GPU->Config(); // normalized (terrain resolution rounded to the structure stride)
	}
}

void UMCPComputeSubsystem::Deinitialize()
{
	if (UWorld* World = GetWorld(); World && World->Scene)
	{
		FMCPGPUState::Unregister(World->Scene);
	}
	if (GPU)
	{
		// The pooled GPU buffers are released on the render thread, after any queued tick.
		ENQUEUE_RENDER_COMMAND(MCPRelease)([State = MoveTemp(GPU)](FRHICommandListImmediate&) mutable { State.Reset(); });
	}
	Super::Deinitialize();
}

TStatId UMCPComputeSubsystem::GetStatId() const
{
	RETURN_QUICK_DECLARE_CYCLE_STAT(UMCPComputeSubsystem, STATGROUP_Tickables);
}

void UMCPComputeSubsystem::SubmitRealmTick(const FMCPRealmTick& Realm)
{
	const uint32 Seed = static_cast<uint32>(Realm.Seed & 0xFFFFFFFFll);
	if (!bHasRealm || Realm.RealmId != RealmId || Seed != Params.Seed)
	{
		bGenesis = true; // a different realm: rebuild its ground from scratch
	}
	RealmId = Realm.RealmId;
	Params.Seed = Seed;
	Params.Entropy = Realm.Entropy;
	Params.Luminosity = Realm.Luminosity;
	Params.Coherence = Realm.Coherence;
	Params.Resonance = Realm.Resonance;
	Params.Inversion = Realm.Inversion;
	Params.Lucidity = Realm.Lucidity;
	Params.TimeDilation = FMath::Clamp(Realm.TimeDilation, 0.05f, 8.f);
	Params.Essence[0] = Realm.Essence.R;
	Params.Essence[1] = Realm.Essence.G;
	Params.Essence[2] = Realm.Essence.B;
	Params.GroundRadius = FMath::Max(8.f, Realm.GroundRadiusMeters);
	Params.TerraceCount = FMath::Clamp(Realm.TerraceCount, 1.f, 12.f);
	Params.Roughness = FMath::Clamp(Realm.Roughness, 0.f, 1.f);
	const bool bFirst = !bHasRealm;
	bHasRealm = true;
	if (bFirst && Population.Num() == 0 && SubmittedActors.Num() == 0)
	{
		SpawnCrowd(CrowdSize);
	}
	else if (bGenesis)
	{
		RebuildPopulation(); // respawn the crowd for the new ground
	}
}

void UMCPComputeSubsystem::SubmitActorCognition(const TArray<FMCPActorState>& InActors)
{
	SubmittedActors = InActors;
	CrowdSize = 0;
	RebuildPopulation();
}

void UMCPComputeSubsystem::SubmitSigilEvaluation(const TArray<FMCPSigil>& InSigils)
{
	Glyphs.Reset();
	SigilRecords.Reset();
	for (const FMCPSigil& S : InSigils)
	{
		if (Glyphs.Num() >= static_cast<int32>(MCP_MAX_SIGILS))
		{
			break;
		}
		GlyphParams G;
		G.Kind = KindOf(S.Kind);
		G.Position[0] = S.PositionMeters.X;
		G.Position[1] = S.PositionMeters.Y;
		G.Position[2] = S.PositionMeters.Z;
		G.Diameter = FMath::Max(0.1f, S.DiameterMeters);
		G.Symmetry = static_cast<uint32>(FMath::Clamp(S.Symmetry, 1, 64));
		G.Complexity = FMath::Clamp(S.Complexity, 0.f, 1.f);
		G.Hue = FMath::Frac(S.Hue);
		G.bBound = S.bBound;
		const FTCHARToUTF8 Utf8(S.Intent.IsEmpty() ? *S.Id : *S.Intent);
		G.IntentHash = IntentHash(Utf8.Get(), Utf8.Length());
		Glyphs.Add(G);
		SigilRecords.Add(MakeSigil(G));
	}
}

void UMCPComputeSubsystem::SpawnCrowd(int32 Count)
{
	SubmittedActors.Reset();
	CrowdSize = FMath::Clamp(Count, 0, static_cast<int32>(Grid.MaxActors));
	RebuildPopulation();
}

void UMCPComputeSubsystem::SetQuality(float Scale)
{
	const float Clamped = FMath::Clamp(Scale, 0.05f, 1.f);
	if (!FMath::IsNearlyEqual(Clamped, Quality, 1e-3f))
	{
		Quality = Clamped;
		bPopulationDirty = true; // same minds, fewer of them: keep their GPU state
	}
}

void UMCPComputeSubsystem::SetRealmTransform(const FTransform& InRealmToWorld, float InUnitsPerMeter)
{
	RealmXform = InRealmToWorld;
	UnitsPerMeter = FMath::Max(0.01f, InUnitsPerMeter);
}

FVector UMCPComputeSubsystem::RealmToWorld(const FVector& RealmMeters) const
{
	return RealmXform.TransformPosition(RealmMeters * UnitsPerMeter);
}

FVector UMCPComputeSubsystem::WorldToRealm(const FVector& WorldLocation) const
{
	return RealmXform.InverseTransformPosition(WorldLocation) / UnitsPerMeter;
}

int32 UMCPComputeSubsystem::RegisterAgent(UMCPCognitionComponent* Agent)
{
	Agents.AddUnique(Agent);
	RebuildPopulation();
	return Agents.IndexOfByKey(Agent);
}

void UMCPComputeSubsystem::UnregisterAgent(UMCPCognitionComponent* Agent)
{
	if (Agents.Remove(Agent) > 0)
	{
		RebuildPopulation();
	}
}

void UMCPComputeSubsystem::RebuildPopulation()
{
	Agents.RemoveAll([](const TWeakObjectPtr<UMCPCognitionComponent>& A) { return !A.IsValid(); });
	Population.Reset();
	auto FromState = [this](const FMCPActorState& S, uint32 Index)
	{
		FActorGPU A = SpawnActor(Params, Index, Trees.Pilgrim, Trees.Warden);
		A.PosRadius = { static_cast<float>(S.PositionMeters.X), static_cast<float>(S.PositionMeters.Y), static_cast<float>(S.PositionMeters.Z), A.PosRadius.w };
		A.Velocity.w = S.MaxSpeed;
		A.Drives = { S.Energy, S.Curiosity, S.Fear, S.Devotion };
		A.State.y = S.Archetype == EMCPArchetype::Warden ? Trees.Warden : Trees.Pilgrim;
		A.Target = { A.PosRadius.x, A.PosRadius.y, 0.f, 10.f };
		return A;
	};
	for (const TWeakObjectPtr<UMCPCognitionComponent>& Agent : Agents)
	{
		Population.Add(FromState(Agent->MakeInitialState(*this), Population.Num()));
	}
	for (const FMCPActorState& S : SubmittedActors)
	{
		Population.Add(FromState(S, Population.Num()));
	}
	for (int32 I = 0; I < CrowdSize; ++I)
	{
		Population.Add(SpawnActor(Params, Population.Num(), Trees.Pilgrim, Trees.Warden));
	}
	Population.SetNum(FMath::Min<int32>(Population.Num(), Grid.MaxActors));
	bPopulationDirty = true;
	bFreshPopulation = true;
}

TArray<FActorGPU> UMCPComputeSubsystem::ActivePopulation() const
{
	// The simulated share of the population. Survivors keep their latest GPU state, so a
	// quality change does not teleport anyone back to where they spawned.
	const int32 Active = FMath::Clamp(FMath::RoundToInt(Population.Num() * Quality), FMath::Min(1, Population.Num()), Population.Num());
	TArray<FActorGPU> Out(Population.GetData(), Active);
	if (!bFreshPopulation)
	{
		for (int32 I = 0; I < Out.Num() && I < LatestNative.Actors.Num(); ++I)
		{
			Out[I] = LatestNative.Actors[I];
		}
	}
	return Out;
}

void UMCPComputeSubsystem::Tick(float DeltaTime)
{
	if (!GPU)
	{
		return;
	}
	if (UWorld* World = GetWorld(); World && World->Scene && !FMCPGPUState::Find(World->Scene))
	{
		FMCPGPUState::Register(World->Scene, GPU);
	}
	ConsumeResults();
	if (LatestNative.Tick > 0)
	{
		ReportToOnyx(LatestNative); // every frame: Onyx collects a fresh report per frame
	}
	if (bHasRealm)
	{
		DispatchTick(FMath::Clamp(DeltaTime, 1.f / 480.f, 0.1f));
	}
}

void UMCPComputeSubsystem::DispatchTick(float DeltaTime)
{
	++TickIndex;
	RealmTime += static_cast<double>(DeltaTime) * Params.TimeDilation;

	FMCPTickInput Input;
	if (bPopulationDirty)
	{
		Input.Actors = ActivePopulation();
		Input.bActorsChanged = true;
		bPopulationDirty = false;
		bFreshPopulation = false;
	}
	const std::vector<FBTNodeGPU>& Nodes = Trees.Compiler.Nodes();
	if (!bTreesUploaded)
	{
		Input.Trees.Append(Nodes.data(), static_cast<int32>(Nodes.size()));
		Input.bTreesChanged = true;
		bTreesUploaded = true;
	}
	const uint32 ActorCount = Input.bActorsChanged ? Input.Actors.Num() : static_cast<uint32>(LatestNative.Actors.Num());
	Input.Tick = BuildTick(Params, Grid, FieldBox(Glyphs.GetData(), Glyphs.Num(), Params, Grid), TickIndex, RealmTime, DeltaTime,
		ActorCount, SigilRecords.Num(), static_cast<uint32>(Nodes.size()), bGenesis);
	bGenesis = false;
	Input.Sigils = SigilRecords;
	Input.bAsyncCompute = bAsyncCompute;
	Input.RealmToWorld = RealmXform;
	Input.UnitsPerMeter = UnitsPerMeter;

	ENQUEUE_RENDER_COMMAND(MCPTick)([State = GPU, Input = MoveTemp(Input)](FRHICommandListImmediate& RHICmdList) mutable
	{
		FRDGBuilder GraphBuilder(RHICmdList, RDG_EVENT_NAME("MCP.RealmTick"));
		State->ExecuteTick_RenderThread(GraphBuilder, MoveTemp(Input));
		GraphBuilder.Execute();
	});

	FOnyxRealmState Realm;
	Realm.RealmId = RealmId;
	Realm.Tick = static_cast<int64>(TickIndex);
	Realm.RealmTime = RealmTime;
	Realm.ActorCount = static_cast<int32>(ActorCount);
	Realm.SigilCount = SigilRecords.Num();
	FOnyx::Get().SetRealmState(Realm);
}

FMCPResults UMCPComputeSubsystem::ToBlueprint(const FMCPNativeResults& R)
{
	FMCPResults Out;
	Out.Tick = static_cast<int64>(R.Tick);
	Out.RealmTime = static_cast<float>(R.RealmTime);
	Out.Structures = static_cast<int32>(R.Structures);
	Out.ActionCounts.Init(0, MCP_ACTION_COUNT);
	Out.Actors.SetNum(R.Actors.Num());
	for (int32 I = 0; I < R.Actors.Num(); ++I)
	{
		const FActorGPU& A = R.Actors[I];
		FMCPActorResult& O = Out.Actors[I];
		O.Index = I;
		O.PositionMeters = FVector(A.PosRadius.x, A.PosRadius.y, A.PosRadius.z);
		O.VelocityMetersPerSecond = FVector(A.Velocity.x, A.Velocity.y, A.Velocity.z);
		const uint32 Action = FMath::Min<uint32>(A.State.x, MCP_ACTION_COUNT - 1);
		O.Action = static_cast<EMCPAction>(Action);
		++Out.ActionCounts[Action];
		O.Energy = A.Drives.x;
		O.Curiosity = A.Drives.y;
		O.Fear = A.Drives.z;
		O.Devotion = A.Drives.w;
		O.MemoriesWritten = static_cast<int32>(A.State.w);
		if (R.Recall.IsValidIndex(I))
		{
			O.RecallSimilarity = R.Recall[I].Value.x;
			O.RecalledFear = R.Recall[I].Value.y;
			O.RecallAgeSeconds = R.Recall[I].Value.z;
		}
	}
	for (uint32 V : R.SigilVoxels)
	{
		Out.SigilVoxels.Add(static_cast<int32>(V));
	}
	return Out;
}

void UMCPComputeSubsystem::ConsumeResults()
{
	FMCPNativeResults Fresh;
	if (!GPU->TakeResults(Fresh))
	{
		return;
	}
	LatestNative = MoveTemp(Fresh);
	Latest = ToBlueprint(LatestNative);
	for (int32 I = 0; I < Agents.Num(); ++I)
	{
		if (UMCPCognitionComponent* Agent = Agents[I].Get(); Agent && Latest.Actors.IsValidIndex(I))
		{
			Agent->ApplyResult(Latest.Actors[I], *this);
		}
	}
	OnResultsNative.Broadcast(Latest);
	OnResults.Broadcast(Latest);
}

void UMCPComputeSubsystem::ReportToOnyx(const FMCPNativeResults& R)
{
	FOnyx& Onyx = FOnyx::Get();
	const FOnyxGpuStats Stats = Onyx.SampleGpu();
	const double Budget = Onyx.GetBudgetMs() * BudgetShare;
	const uint32 A = static_cast<uint32>(R.Actors.Num());
	const uint32 N = Grid.TerrainN;
	const uint32 Nc = N / MCP_STRUCTURE_STRIDE;
	const uint32 M = Grid.FieldN;
	const uint64 Invocations[] = { 64, uint64(Groups(N, 8)) * Groups(N, 8) * 64, uint64(Groups(Nc, 8)) * Groups(Nc, 8) * 64,
		uint64(Groups(M, 4)) * Groups(M, 4) * Groups(M, 4) * 64, uint64(Groups(A, 64)) * 64, uint64(Groups(A, 64)) * 64, uint64(A) * MCP_MEMORY_SLOTS };
	for (int32 K = 0; K < UE_ARRAY_COUNT(KernelScopes); ++K)
	{
		FOnyxPipelineMetrics P;
		P.GpuMs = Stats.ScopeMs(KernelScopes[K]);
		P.BudgetMs = Budget * KernelBudgetShare[K];
		P.Invocations = Invocations[K];
		P.Dispatches = 1;
		Onyx.ReportPipelinePressure(KernelScopes[K], P);
	}

	// Per-actor cost: each kernel's measured time shared out by the work each actor did in it
	// (same attribution as the standalone engine's Onyx::ReportMCPWork).
	double CognitionWork = 0.0, MemoryWork = 0.0, EpisodeWork = 0.0;
	for (const FActorCostGPU& C : R.Costs)
	{
		CognitionWork += FMath::Max(1u, C.Work.x + C.Work.y);
		MemoryWork += C.Work.z;
		EpisodeWork += C.Work.w;
	}
	const double CognitionUs = Stats.ScopeMs(TEXT("mcp.cognition")) * 1000.0;
	const double RetrieveUs = Stats.ScopeMs(TEXT("mcp.memory_retrieve")) * 1000.0;
	const double CompressUs = Stats.ScopeMs(TEXT("mcp.memory_compress")) * 1000.0;
	const double Count = FMath::Max(1.0, double(R.Costs.Num()));
	for (int32 I = 0; I < R.Costs.Num() && I < R.Actors.Num(); ++I)
	{
		const FActorCostGPU& C = R.Costs[I];
		FOnyxActorMetrics Metrics;
		Metrics.TreeNodes = C.Work.x;
		Metrics.SigilsScanned = C.Work.y;
		Metrics.MemoriesCompared = C.Work.z;
		Metrics.EpisodesWritten = C.Work.w;
		Metrics.Action = static_cast<uint8>(FMath::Min<uint32>(R.Actors[I].State.x, MCP_ACTION_COUNT - 1));
		Metrics.GpuUs = CognitionUs * FMath::Max(1u, C.Work.x + C.Work.y) / FMath::Max(1.0, CognitionWork)
			+ (MemoryWork > 0.0 ? RetrieveUs * C.Work.z / MemoryWork : RetrieveUs / Count)
			+ (EpisodeWork > 0.0 ? CompressUs * C.Work.w / EpisodeWork : CompressUs / Count);
		Onyx.ReportActorLoad(static_cast<uint32>(I), Metrics);
	}
	const double SigilUs = Stats.ScopeMs(TEXT("mcp.sigil_field")) * 1000.0;
	double Voxels = 0.0;
	for (uint32 V : R.SigilVoxels)
	{
		Voxels += V;
	}
	for (int32 S = 0; S < R.SigilVoxels.Num(); ++S)
	{
		Onyx.ReportSigilLoad(S, { Voxels > 0.0 ? SigilUs * R.SigilVoxels[S] / Voxels : 0.0, R.SigilVoxels[S] });
	}
	Onyx.ReportStructures(static_cast<int32>(R.Structures));
}

bool UMCPComputeSubsystem::GetGPUResults(FMCPResults& OutResults) const
{
	if (Latest.Tick == 0)
	{
		return false;
	}
	OutResults = Latest;
	return true;
}
