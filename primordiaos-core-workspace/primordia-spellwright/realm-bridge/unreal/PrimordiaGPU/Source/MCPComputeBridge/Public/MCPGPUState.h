// MCP's render-thread half: persistent GPU buffers, the per-tick render-graph passes, and
// non-blocking readback. One instance per world, owned by UMCPComputeSubsystem and found by
// the realm renderer through the per-scene registry.
//
// Buffers that a tick reads from the previous tick (terrain, actors, recall) are ping-ponged
// by tick parity; everything else is overwritten in place. The render graph orders this
// tick's passes after the previous frame's readers of the same pooled buffers, so no extra
// double-buffering is needed (unlike the standalone engine, where the renderer runs on its
// own queue).
#pragma once

#include "CoreMinimal.h"
#include "MCPHost.h"
#include "RenderGraphResources.h"
#include "RHIGPUReadback.h"

class FRDGBuilder;
class FSceneInterface;

/** Everything one tick hands from the game thread to the render thread. */
struct FMCPTickInput
{
	PrimordiaMCP::FRealmTickGPU Tick{};
	TArray<PrimordiaMCP::FSigilGPU> Sigils;
	TArray<PrimordiaMCP::FBTNodeGPU> Trees;   // uploaded when bTreesChanged
	TArray<PrimordiaMCP::FActorGPU> Actors;   // uploaded when bActorsChanged (a new population)
	bool bTreesChanged = false;
	bool bActorsChanged = false;
	bool bAsyncCompute = false;
	FTransform RealmToWorld = FTransform::Identity;
	float UnitsPerMeter = 100.f;
};

/** GPU results read back for one tick (latest wins). */
struct FMCPNativeResults
{
	uint64 Tick = 0;
	double RealmTime = 0.0;
	TArray<PrimordiaMCP::FActorGPU> Actors;
	TArray<PrimordiaMCP::FActorCostGPU> Costs;
	TArray<PrimordiaMCP::FRecallGPU> Recall;
	TArray<uint32> SigilVoxels;
	uint32 Structures = 0;
};

class MCPCOMPUTEBRIDGE_API FMCPGPUState : public TSharedFromThis<FMCPGPUState, ESPMode::ThreadSafe>
{
public:
	explicit FMCPGPUState(const PrimordiaMCP::GridConfig& Config);

	/** Render thread: uploads, the seven kernels, and the readback copies for one tick. */
	void ExecuteTick_RenderThread(FRDGBuilder& GraphBuilder, FMCPTickInput&& Input);

	/** What the realm renderer needs to draw this tick's sigil field (render thread). */
	struct FFieldView
	{
		TRefCountPtr<FRDGPooledBuffer> Tick;
		TRefCountPtr<FRDGPooledBuffer> Field;
		FTransform RealmToWorld = FTransform::Identity;
		float UnitsPerMeter = 100.f;
		bool bValid = false;
	};
	FFieldView GetFieldView_RenderThread() const;

	/** Game thread: the newest results not taken yet. */
	bool TakeResults(FMCPNativeResults& Out);
	const PrimordiaMCP::GridConfig& Config() const { return Cfg; }

	/** Per-scene registry (the renderer finds the state of the scene it is drawing). */
	static void Register(const FSceneInterface* Scene, const TSharedPtr<FMCPGPUState, ESPMode::ThreadSafe>& State);
	static void Unregister(const FSceneInterface* Scene);
	static TSharedPtr<FMCPGPUState, ESPMode::ThreadSafe> Find(const FSceneInterface* Scene);
	static void UnregisterState(const FMCPGPUState* State);
	/** Game thread, at engine pre-exit: frees every registered state's GPU resources (pooled
	 *  buffers, readback staging buffers) on the render thread and waits, so none outlives the RHI. */
	static void ReleaseAll();

	/** Render thread: frees the GPU resources (the next tick would allocate them again). */
	void ReleaseResources_RenderThread();

private:
	struct FReadbackSlot
	{
		TUniquePtr<FRHIGPUBufferReadback> Actors;
		TUniquePtr<FRHIGPUBufferReadback> Costs;
		TUniquePtr<FRHIGPUBufferReadback> Recall;
		TUniquePtr<FRHIGPUBufferReadback> SigilCost;
		TUniquePtr<FRHIGPUBufferReadback> Args;
		uint64 Tick = 0;
		double RealmTime = 0.0;
		uint32 ActorCount = 0;
		uint32 SigilCount = 0;
		bool bPending = false;
	};
	static constexpr int32 ReadbackSlots = 3;

	void Allocate(FRDGBuilder& GraphBuilder);
	void PollReadbacks_RenderThread();

	PrimordiaMCP::GridConfig Cfg;
	bool bAllocated = false;
	TRefCountPtr<FRDGPooledBuffer> TickBuf, Structures, StructureArgs, Sigils, Field, SigilCost, BTNodes, ActorCost, Episodes, Memory;
	TRefCountPtr<FRDGPooledBuffer> Terrain[2], Actors[2], Recall[2];
	uint32 ActorCount = 0;
	FReadbackSlot Readbacks[ReadbackSlots];
	FTransform RealmToWorld = FTransform::Identity;
	float UnitsPerMeter = 100.f;
	bool bHasField = false;

	FCriticalSection ResultsLock;
	FMCPNativeResults Latest;
	bool bLatestFresh = false;
};
