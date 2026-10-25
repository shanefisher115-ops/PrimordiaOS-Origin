#include "OnyxSubsystem.h"

#include "CanvasItem.h"
#include "Debug/DebugDrawService.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Misc/CoreDelegates.h"
#include "OnyxGPUTimer.h"
#include "RenderingThread.h"

void UOnyxSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	BeginFrameHandle = FCoreDelegates::OnBeginFrame.AddUObject(this, &UOnyxSubsystem::HandleBeginFrame);
	EndFrameHandle = FCoreDelegates::OnEndFrame.AddUObject(this, &UOnyxSubsystem::HandleEndFrame);
	// Render thread: read finished timestamp queries (never waits on the GPU).
	EndFrameRTHandle = FCoreDelegates::OnEndFrameRT.AddLambda([]() { FOnyxGPUTimer::Get().ResolveFinishedFrames(); });
	DrawHandle = UDebugDrawService::Register(TEXT("Game"), FDebugDrawDelegate::CreateUObject(this, &UOnyxSubsystem::DrawOverlay));
}

void UOnyxSubsystem::Deinitialize()
{
	FCoreDelegates::OnBeginFrame.Remove(BeginFrameHandle);
	FCoreDelegates::OnEndFrame.Remove(EndFrameHandle);
	FCoreDelegates::OnEndFrameRT.Remove(EndFrameRTHandle);
	UDebugDrawService::Unregister(DrawHandle);
	FlushRenderingCommands(); // no OnEndFrameRT may still be running the lambda
	Super::Deinitialize();
}

void UOnyxSubsystem::HandleBeginFrame()
{
	FOnyx::Get().BeginFrame(FOnyx::Get().GetRealmState());
}

void UOnyxSubsystem::HandleEndFrame()
{
	FOnyx& Onyx = FOnyx::Get();
	Onyx.EndFrame(Onyx.GetRealmState(), Onyx.SampleGpu());
}

FOnyxSummary UOnyxSubsystem::Summarize(const FOnyxFrame& F)
{
	FOnyxSummary S;
	S.Tick = F.Tick;
	S.Fps = static_cast<float>(F.Fps);
	S.FrameGpuMs = static_cast<float>(F.Gpu.FrameGpuMs);
	S.RealmTickGpuMs = static_cast<float>(F.RealmTickGpuMs);
	S.RenderGpuMs = static_cast<float>(F.RenderGpuMs);
	S.BudgetMs = static_cast<float>(F.BudgetMs);
	S.Headroom = static_cast<float>(F.Headroom);
	S.MemoryPressure = static_cast<float>(F.Gpu.MemoryPressure);
	S.ActorCount = F.ActorCount;
	S.ActorGpuUsMean = F.ActorCount ? static_cast<float>(F.ActorGpuUsTotal / F.ActorCount) : 0.f;
	S.Device = F.Gpu.Device;
	for (const FOnyxScope& Scope : F.Gpu.Scopes)
	{
		S.PipelineMs.FindOrAdd(Scope.Name) += static_cast<float>(Scope.Ms);
	}
	return S;
}

FOnyxSummary UOnyxSubsystem::GetSummary() const
{
	return Summarize(FOnyx::Get().LatestFrame());
}

void UOnyxSubsystem::SetOverlayVisible(bool bVisible)
{
	bOverlay = bVisible;
}

void UOnyxSubsystem::DrawOverlay(UCanvas* Canvas, APlayerController*)
{
	if (!bOverlay || !Canvas)
	{
		return;
	}
	const FOnyxFrame F = FOnyx::Get().LatestFrame();
	UFont* Font = GEngine->GetSmallFont();
	float Y = 40.f;
	const float X = 24.f;
	auto Line = [&](const FString& Text, const FLinearColor& Color)
	{
		FCanvasTextItem Item(FVector2D(X, Y), FText::FromString(Text), Font, Color);
		Item.EnableShadow(FLinearColor::Black);
		Canvas->DrawItem(Item);
		Y += 14.f;
	};
	const FLinearColor Ok(0.6f, 0.9f, 1.f);
	const FLinearColor Hot(1.f, 0.45f, 0.3f);
	Line(FString::Printf(TEXT("ONYX  %s  (%s)  realm %s  tick %lld"), *F.Gpu.Device, *F.Gpu.RHIName, *F.Realm.RealmId, F.Tick), Ok);
	Line(FString::Printf(TEXT("GPU %.2f ms / %.2f budget  headroom %.0f%%  |  MCP %.2f ms  render %.2f ms  |  GT %.2f  RT %.2f  |  %.0f fps"),
		F.Gpu.FrameGpuMs, F.BudgetMs, F.Headroom * 100.0, F.RealmTickGpuMs, F.RenderGpuMs, F.Gpu.GameThreadMs, F.Gpu.RenderThreadMs, F.Fps),
		F.Headroom < 0.0 ? Hot : Ok);
	Line(FString::Printf(TEXT("memory %.0f / %.0f MB (%.0f%%)"), F.Gpu.DeviceLocalUsage / 1048576.0, F.Gpu.DeviceLocalBudget / 1048576.0, F.Gpu.MemoryPressure * 100.0),
		F.Gpu.MemoryPressure > 0.9 ? Hot : Ok);

	// Headroom bar: the frame's GPU time against its budget.
	const float BarWidth = 360.f;
	const float Used = static_cast<float>(FMath::Clamp(F.Gpu.FrameGpuMs / FMath::Max(0.1, F.BudgetMs), 0.0, 1.5));
	FCanvasTileItem Back(FVector2D(X, Y + 2.f), FVector2D(BarWidth, 6.f), FLinearColor(0.1f, 0.1f, 0.12f, 0.8f));
	Canvas->DrawItem(Back);
	FCanvasTileItem Fill(FVector2D(X, Y + 2.f), FVector2D(BarWidth * FMath::Min(Used, 1.f), 6.f), Used > 1.f ? Hot : Ok);
	Canvas->DrawItem(Fill);
	Y += 14.f;

	TArray<TPair<FString, FOnyxPipelineMetrics>> Pipelines;
	for (const TPair<FString, FOnyxPipelineMetrics>& P : F.Pipelines)
	{
		Pipelines.Add(P);
	}
	Pipelines.Sort([](const auto& A, const auto& B) { return A.Value.GpuMs > B.Value.GpuMs; });
	for (int32 I = 0; I < FMath::Min(8, Pipelines.Num()); ++I)
	{
		const FOnyxPipelineMetrics& M = Pipelines[I].Value;
		Line(FString::Printf(TEXT("  %-22s %6.3f ms  %5.0f%% of %.2f ms  %llu threads"), *Pipelines[I].Key, M.GpuMs, M.Saturation() * 100.0, M.BudgetMs, M.Invocations),
			M.Saturation() > 1.0 ? Hot : Ok);
	}
	if (F.ActorCount > 0)
	{
		Line(FString::Printf(TEXT("actors %d  mean %.3f us  total %.1f us  structures %d"), F.ActorCount, F.ActorGpuUsTotal / F.ActorCount, F.ActorGpuUsTotal, F.Structures), Ok);
		for (const TPair<uint32, FOnyxActorMetrics>& A : F.HottestActors)
		{
			Line(FString::Printf(TEXT("  actor %-6u %.3f us  %u nodes  %u sigils  %u memories"), A.Key, A.Value.GpuUs, A.Value.TreeNodes, A.Value.SigilsScanned, A.Value.MemoriesCompared), Ok);
		}
	}
}
