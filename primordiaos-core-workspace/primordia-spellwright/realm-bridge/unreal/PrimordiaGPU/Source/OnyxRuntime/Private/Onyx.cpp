#include "Onyx.h"

#include "DynamicRHI.h"
#include "EngineGlobals.h"
#include "HAL/PlatformTime.h"
#include "RHIGlobals.h"
#include "RHIStats.h"
#include "RenderTimer.h"

namespace
{
const TCHAR* const ActionNames[] = { TEXT("idle"), TEXT("wander"), TEXT("seek_sigil"), TEXT("flee"), TEXT("rest"), TEXT("commune") };
constexpr int32 ActionCount = UE_ARRAY_COUNT(ActionNames);

double Round3(double V)
{
	return FMath::RoundToDouble(V * 1000.0) / 1000.0;
}
} // namespace

double FOnyxGpuStats::ScopeMs(const FString& Name) const
{
	double Ms = 0.0;
	for (const FOnyxScope& S : Scopes)
	{
		if (S.Name == Name)
		{
			Ms += S.Ms;
		}
	}
	return Ms;
}

FOnyx& FOnyx::Get()
{
	static FOnyx Instance;
	return Instance;
}

void FOnyx::BeginFrame(const FOnyxRealmState& Realm)
{
	FScopeLock Guard(&Lock);
	PreviousStartSeconds = FrameStartSeconds;
	FrameStartSeconds = FPlatformTime::Seconds();
	Pending = FOnyxFrame();
	Pending.Realm = Realm;
	ActorReports.Reset();
}

void FOnyx::ReportPipelinePressure(const FString& PipelineId, const FOnyxPipelineMetrics& Metrics)
{
	FScopeLock Guard(&Lock);
	Pending.Pipelines.Add(PipelineId, Metrics);
}

void FOnyx::ReportActorLoad(uint32 ActorId, const FOnyxActorMetrics& Metrics)
{
	FScopeLock Guard(&Lock);
	ActorReports.Emplace(ActorId, Metrics);
}

void FOnyx::ReportSigilLoad(int32 Index, const FOnyxSigilMetrics& Metrics)
{
	FScopeLock Guard(&Lock);
	if (Pending.Sigils.Num() <= Index)
	{
		Pending.Sigils.SetNum(Index + 1);
	}
	Pending.Sigils[Index] = Metrics;
}

void FOnyx::ReportStructures(int32 Count)
{
	FScopeLock Guard(&Lock);
	Pending.Structures = Count;
}

void FOnyx::ReportGpuScopes(int64 Frame, TArray<FOnyxScope>&& Scopes)
{
	FScopeLock Guard(&Lock);
	if (Frame >= LatestScopesFrame)
	{
		LatestScopesFrame = Frame;
		LatestScopes = MoveTemp(Scopes);
	}
}

void FOnyx::SetMemorySampler(FMemorySampler Sampler, const FString& Device)
{
	FScopeLock Guard(&Lock);
	MemorySampler = MoveTemp(Sampler);
	MemoryDevice = Device;
}

void FOnyx::SetRealmState(const FOnyxRealmState& Realm)
{
	FScopeLock Guard(&Lock);
	RealmState = Realm;
}

FOnyxRealmState FOnyx::GetRealmState() const
{
	FScopeLock Guard(&Lock);
	return RealmState;
}

FOnyxGpuStats FOnyx::SampleGpu() const
{
	FOnyxGpuStats Stats;
	Stats.FrameGpuMs = FPlatformTime::ToMilliseconds(RHIGetGPUFrameCycles());
	Stats.GameThreadMs = FPlatformTime::ToMilliseconds(GGameThreadTime);
	Stats.RenderThreadMs = FPlatformTime::ToMilliseconds(GRenderThreadTime);
	Stats.RHIName = GDynamicRHI ? GDynamicRHI->GetName() : TEXT("none");
	Stats.Device = GRHIAdapterName;

	FMemorySampler Sampler;
	{
		FScopeLock Guard(&Lock);
		Stats.Tick = LatestScopesFrame;
		Stats.Scopes = LatestScopes;
		Sampler = MemorySampler;
		if (!MemoryDevice.IsEmpty())
		{
			Stats.Device = MemoryDevice;
		}
	}
	uint64 Usage = 0, Budget = 0;
	if (Sampler && Sampler(Usage, Budget) && Budget > 0)
	{
		Stats.DeviceLocalUsage = Usage;
		Stats.DeviceLocalBudget = Budget;
	}
	else if (GDynamicRHI)
	{
		// Generic fallback: what the RHI knows about texture memory against total graphics memory.
		FTextureMemoryStats Tex;
		RHIGetTextureMemoryStats(Tex);
		if (Tex.TotalGraphicsMemory > 0)
		{
			Stats.DeviceLocalUsage = Tex.StreamingMemorySize + Tex.NonStreamingMemorySize;
			Stats.DeviceLocalBudget = static_cast<uint64>(Tex.TotalGraphicsMemory);
		}
	}
	Stats.MemoryPressure = Stats.DeviceLocalBudget > 0 ? double(Stats.DeviceLocalUsage) / double(Stats.DeviceLocalBudget) : 0.0;
	return Stats;
}

void FOnyx::EndFrame(const FOnyxRealmState& Realm, const FOnyxGpuStats& Stats)
{
	FOnyxFrame Frame;
	{
		FScopeLock Guard(&Lock);
		const double Now = FPlatformTime::Seconds();
		Pending.Tick = Realm.Tick;
		Pending.Realm = Realm;
		Pending.Gpu = Stats;
		Pending.BudgetMs = BudgetMs;
		Pending.CpuFrameMs = (Now - FrameStartSeconds) * 1000.0;
		if (PreviousStartSeconds > 0.0)
		{
			const double Wall = FrameStartSeconds - PreviousStartSeconds;
			const double Instant = Wall > 0.0 ? 1.0 / Wall : 0.0;
			Pending.Fps = Last.Fps > 0.0 ? Last.Fps + (Instant - Last.Fps) * 0.1 : Instant;
		}
		for (const FOnyxScope& S : Stats.Scopes)
		{
			if (S.Name.StartsWith(TEXT("mcp.")))
			{
				Pending.RealmTickGpuMs += S.Ms;
			}
		}
		Pending.RenderGpuMs = FMath::Max(0.0, Stats.FrameGpuMs - Pending.RealmTickGpuMs);
		Pending.Headroom = BudgetMs > 0.0 ? 1.0 - Stats.FrameGpuMs / BudgetMs : 0.0;

		Pending.ActorCount = ActorReports.Num();
		Pending.Actions.Init(0, ActionCount);
		for (const TPair<uint32, FOnyxActorMetrics>& A : ActorReports)
		{
			Pending.ActorGpuUsTotal += A.Value.GpuUs;
			if (A.Value.Action < ActionCount)
			{
				++Pending.Actions[A.Value.Action];
			}
		}
		ActorReports.Sort([](const TPair<uint32, FOnyxActorMetrics>& A, const TPair<uint32, FOnyxActorMetrics>& B) { return A.Value.GpuUs > B.Value.GpuUs; });
		Pending.HottestActors.Append(ActorReports.GetData(), FMath::Min(8, ActorReports.Num()));
		Last = Pending;
		Frame = Last;
	}
	FrameEvent.Broadcast(Frame);
}

FOnyxFrame FOnyx::LatestFrame() const
{
	FScopeLock Guard(&Lock);
	return Last;
}

TSharedRef<FJsonObject> FOnyx::ToJson(const FOnyxFrame& F)
{
	TSharedRef<FJsonObject> Scopes = MakeShared<FJsonObject>();
	for (const FOnyxScope& S : F.Gpu.Scopes)
	{
		Scopes->SetNumberField(S.Name, Round3(S.Ms));
	}
	TSharedRef<FJsonObject> Gpu = MakeShared<FJsonObject>();
	Gpu->SetNumberField(TEXT("frame_ms"), Round3(F.Gpu.FrameGpuMs));
	Gpu->SetNumberField(TEXT("realm_tick_ms"), Round3(F.RealmTickGpuMs));
	Gpu->SetNumberField(TEXT("render_ms"), Round3(F.RenderGpuMs));
	Gpu->SetNumberField(TEXT("budget_ms"), Round3(FMath::Max(0.1, F.BudgetMs)));
	Gpu->SetNumberField(TEXT("headroom"), Round3(FMath::Clamp(F.Headroom, -1000.0, 1.0)));
	Gpu->SetNumberField(TEXT("memory_pressure"), Round3(FMath::Clamp(F.Gpu.MemoryPressure, 0.0, 8.0)));
	Gpu->SetNumberField(TEXT("device_local_mb"), Round3(F.Gpu.DeviceLocalUsage / 1048576.0));
	Gpu->SetNumberField(TEXT("device_budget_mb"), Round3(F.Gpu.DeviceLocalBudget / 1048576.0));
	Gpu->SetNumberField(TEXT("game_thread_ms"), Round3(F.Gpu.GameThreadMs));
	Gpu->SetNumberField(TEXT("render_thread_ms"), Round3(F.Gpu.RenderThreadMs));
	Gpu->SetStringField(TEXT("rhi"), F.Gpu.RHIName);
	Gpu->SetObjectField(TEXT("scopes"), Scopes);

	TSharedRef<FJsonObject> Pipelines = MakeShared<FJsonObject>();
	for (const TPair<FString, FOnyxPipelineMetrics>& P : F.Pipelines)
	{
		TSharedRef<FJsonObject> M = MakeShared<FJsonObject>();
		M->SetNumberField(TEXT("ms"), Round3(P.Value.GpuMs));
		M->SetNumberField(TEXT("budget_ms"), Round3(P.Value.BudgetMs));
		M->SetNumberField(TEXT("saturation"), Round3(P.Value.Saturation()));
		M->SetNumberField(TEXT("invocations"), double(P.Value.Invocations));
		M->SetNumberField(TEXT("dispatches"), P.Value.Dispatches);
		Pipelines->SetObjectField(P.Key, M);
	}

	TArray<TSharedPtr<FJsonValue>> Hottest;
	for (const TPair<uint32, FOnyxActorMetrics>& A : F.HottestActors)
	{
		TSharedRef<FJsonObject> J = MakeShared<FJsonObject>();
		J->SetNumberField(TEXT("id"), A.Key);
		J->SetNumberField(TEXT("gpu_us"), Round3(A.Value.GpuUs));
		J->SetNumberField(TEXT("nodes"), A.Value.TreeNodes);
		J->SetNumberField(TEXT("sigils"), A.Value.SigilsScanned);
		J->SetNumberField(TEXT("memories"), A.Value.MemoriesCompared);
		J->SetStringField(TEXT("action"), ActionNames[FMath::Min<int32>(A.Value.Action, ActionCount - 1)]);
		Hottest.Add(MakeShared<FJsonValueObject>(J));
	}
	TSharedRef<FJsonObject> Actions = MakeShared<FJsonObject>();
	for (int32 A = 0; A < ActionCount; ++A)
	{
		Actions->SetNumberField(ActionNames[A], F.Actions.IsValidIndex(A) ? F.Actions[A] : 0);
	}
	TSharedRef<FJsonObject> Actors = MakeShared<FJsonObject>();
	Actors->SetNumberField(TEXT("count"), F.ActorCount);
	Actors->SetNumberField(TEXT("gpu_us_total"), Round3(F.ActorGpuUsTotal));
	Actors->SetNumberField(TEXT("gpu_us_mean"), Round3(F.ActorCount ? F.ActorGpuUsTotal / F.ActorCount : 0.0));
	Actors->SetArrayField(TEXT("hottest"), Hottest);
	Actors->SetObjectField(TEXT("actions"), Actions);

	TArray<TSharedPtr<FJsonValue>> Sigils;
	for (int32 S = 0; S < F.Sigils.Num(); ++S)
	{
		TSharedRef<FJsonObject> J = MakeShared<FJsonObject>();
		J->SetNumberField(TEXT("index"), S);
		J->SetNumberField(TEXT("gpu_us"), Round3(F.Sigils[S].GpuUs));
		J->SetNumberField(TEXT("voxels"), F.Sigils[S].Voxels);
		Sigils.Add(MakeShared<FJsonValueObject>(J));
	}

	TSharedRef<FJsonObject> Out = MakeShared<FJsonObject>();
	Out->SetNumberField(TEXT("tick"), double(FMath::Max<int64>(0, F.Tick)));
	Out->SetStringField(TEXT("realm_id"), F.Realm.RealmId);
	Out->SetNumberField(TEXT("realm_time"), Round3(F.Realm.RealmTime));
	Out->SetStringField(TEXT("device"), F.Gpu.Device);
	Out->SetNumberField(TEXT("fps"), Round3(F.Fps));
	Out->SetNumberField(TEXT("cpu_ms"), Round3(F.CpuFrameMs));
	Out->SetObjectField(TEXT("gpu"), Gpu);
	Out->SetObjectField(TEXT("pipelines"), Pipelines);
	Out->SetObjectField(TEXT("actors"), Actors);
	Out->SetArrayField(TEXT("sigils"), Sigils);
	Out->SetNumberField(TEXT("structures"), F.Structures);
	return Out;
}
