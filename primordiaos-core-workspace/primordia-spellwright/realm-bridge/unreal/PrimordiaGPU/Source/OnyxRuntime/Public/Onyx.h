// Onyx: GPU telemetry and realm introspection (Unreal side).
//
// The same API and JSON shape as the standalone engine's Onyx (realm-bridge/gpu), so
// PrimordiaOS treats Unreal and the Vulkan sidecar alike:
//   FOnyx::Get().BeginFrame(RealmState)                  game thread, frame start
//   FOnyx::Get().ReportPipelinePressure(Id, Metrics)     any thread (MCP kernels, render passes)
//   FOnyx::Get().ReportActorLoad(ActorId, Metrics)       any thread (MCP cost attribution)
//   FOnyx::Get().EndFrame(RealmState, GpuStats)          game thread, frame end -> OnFrame
// GPU time comes from three sources: the RHI's whole-frame GPU time, render-graph timestamp
// scopes (FOnyxGPUTimer) resolved a few frames late, and a memory sampler (Vulkan
// VK_EXT_memory_budget when VulkanRealmRenderer registers one, RHI texture stats otherwise).
#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"
#include "HAL/CriticalSection.h"

struct FOnyxRealmState
{
	FString RealmId;
	int64 Tick = 0;
	double RealmTime = 0.0;
	int32 ActorCount = 0;
	int32 SigilCount = 0;
};

struct FOnyxScope
{
	FString Name;
	double Ms = 0.0;
};

struct ONYXRUNTIME_API FOnyxGpuStats
{
	int64 Tick = 0;               // render frame the scopes describe (lags the game thread)
	double FrameGpuMs = 0.0;      // RHI whole-frame GPU time
	double GameThreadMs = 0.0;
	double RenderThreadMs = 0.0;
	TArray<FOnyxScope> Scopes;    // render-graph scopes (mcp.*, render.*)
	double MemoryPressure = 0.0;  // usage / budget of device-local memory
	uint64 DeviceLocalUsage = 0;
	uint64 DeviceLocalBudget = 0;
	FString Device;
	FString RHIName;

	double ScopeMs(const FString& Name) const;
};

struct FOnyxPipelineMetrics
{
	double GpuMs = 0.0;
	double BudgetMs = 0.0;
	uint64 Invocations = 0;
	uint32 Dispatches = 0;
	double Saturation() const { return BudgetMs > 0.0 ? GpuMs / BudgetMs : 0.0; }
};

struct FOnyxActorMetrics
{
	double GpuUs = 0.0;
	uint32 TreeNodes = 0;
	uint32 SigilsScanned = 0;
	uint32 MemoriesCompared = 0;
	uint32 EpisodesWritten = 0;
	uint8 Action = 0;
};

struct FOnyxSigilMetrics
{
	double GpuUs = 0.0;
	uint32 Voxels = 0;
};

struct FOnyxFrame
{
	int64 Tick = 0;
	FOnyxRealmState Realm;
	FOnyxGpuStats Gpu;
	double CpuFrameMs = 0.0;
	double Fps = 0.0;
	double BudgetMs = 0.0;
	double RealmTickGpuMs = 0.0; // sum of mcp.* scopes
	double RenderGpuMs = 0.0;    // frame GPU time minus MCP
	double Headroom = 0.0;
	TMap<FString, FOnyxPipelineMetrics> Pipelines;
	int32 ActorCount = 0;
	double ActorGpuUsTotal = 0.0;
	TArray<TPair<uint32, FOnyxActorMetrics>> HottestActors;
	TArray<int32> Actions; // per MCP action
	TArray<FOnyxSigilMetrics> Sigils;
	int32 Structures = 0;
};

DECLARE_MULTICAST_DELEGATE_OneParam(FOnyxFrameEvent, const FOnyxFrame&);

class ONYXRUNTIME_API FOnyx
{
public:
	static FOnyx& Get();

	// --- Telemetry API -------------------------------------------------------------------
	void BeginFrame(const FOnyxRealmState& Realm);
	void EndFrame(const FOnyxRealmState& Realm, const FOnyxGpuStats& Stats);
	void ReportPipelinePressure(const FString& PipelineId, const FOnyxPipelineMetrics& Metrics);
	void ReportActorLoad(uint32 ActorId, const FOnyxActorMetrics& Metrics);
	void ReportSigilLoad(int32 Index, const FOnyxSigilMetrics& Metrics);
	void ReportStructures(int32 Count);

	/** Render thread: timestamp scopes of a finished frame (from FOnyxGPUTimer). */
	void ReportGpuScopes(int64 Frame, TArray<FOnyxScope>&& Scopes);
	/** Game thread: current GPU statistics (frame time, latest scopes, memory). */
	FOnyxGpuStats SampleGpu() const;

	/** A better memory source than the RHI's texture statistics (VulkanRealmRenderer sets one). */
	using FMemorySampler = TFunction<bool(uint64& OutUsage, uint64& OutBudget)>;
	void SetMemorySampler(FMemorySampler Sampler, const FString& Device);

	/** The realm the frame is about (MCPComputeBridge keeps it current). */
	void SetRealmState(const FOnyxRealmState& Realm);
	FOnyxRealmState GetRealmState() const;

	FOnyxFrame LatestFrame() const;
	FOnyxFrameEvent& OnFrame() { return FrameEvent; }

	double GetBudgetMs() const { return BudgetMs; }
	void SetBudgetMs(double Ms) { BudgetMs = FMath::Max(1.0, Ms); }

	/** The PRS-1 gpu_telemetry payload (docs/GPU_PIPELINE.md), minus "type"/"source". */
	static TSharedRef<FJsonObject> ToJson(const FOnyxFrame& Frame);

private:
	mutable FCriticalSection Lock;
	FOnyxFrame Pending;
	FOnyxFrame Last;
	TArray<TPair<uint32, FOnyxActorMetrics>> ActorReports;
	TArray<FOnyxScope> LatestScopes;
	int64 LatestScopesFrame = 0;
	FMemorySampler MemorySampler;
	FString MemoryDevice;
	FOnyxRealmState RealmState;
	FOnyxFrameEvent FrameEvent;
	double FrameStartSeconds = 0.0;
	double PreviousStartSeconds = 0.0;
	double BudgetMs = 1000.0 / 60.0;
};
