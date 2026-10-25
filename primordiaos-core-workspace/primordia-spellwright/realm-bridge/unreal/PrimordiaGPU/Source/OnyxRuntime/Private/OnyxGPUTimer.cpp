#include "OnyxGPUTimer.h"

#include "Onyx.h"
#include "RenderGraphBuilder.h"
#include "RHICommandList.h"
#include "DynamicRHI.h"

FOnyxGPUTimer& FOnyxGPUTimer::Get()
{
	static FOnyxGPUTimer Instance;
	return Instance;
}

FOnyxGPUTimer::FFrameStamps& FOnyxGPUTimer::CurrentFrame()
{
	const uint64 Frame = GFrameNumberRenderThread;
	if (Frames.Num() == 0 || Frames.Last().Frame != Frame)
	{
		FFrameStamps& New = Frames.AddDefaulted_GetRef();
		New.Frame = Frame;
	}
	return Frames.Last();
}

void FOnyxGPUTimer::AddStamp(FRDGBuilder& GraphBuilder, FString&& Name)
{
	check(IsInRenderingThread());
	if (!GSupportsTimestampRenderQueries)
	{
		return;
	}
	if (!Pool.IsValid())
	{
		Pool = RHICreateRenderQueryPool(RQT_AbsoluteTime);
	}
	FFrameStamps& Frame = CurrentFrame();
	FStamp& Stamp = Frame.Stamps.AddDefaulted_GetRef();
	Stamp.Name = MoveTemp(Name);
	Stamp.Query = MakeShared<FRHIPooledRenderQuery>(Pool->AllocateQuery());
	FRHIRenderQuery* Query = Stamp.Query->GetQuery();
	GraphBuilder.AddPass(RDG_EVENT_NAME("Onyx.Stamp"), ERDGPassFlags::None | ERDGPassFlags::NeverCull,
		[Query](FRHICommandListImmediate& RHICmdList)
		{
			RHICmdList.EndRenderQuery(Query);
		});
}

void FOnyxGPUTimer::Stamp(FRDGBuilder& GraphBuilder, const TCHAR* Name)
{
	AddStamp(GraphBuilder, FString(Name));
}

void FOnyxGPUTimer::Close(FRDGBuilder& GraphBuilder)
{
	AddStamp(GraphBuilder, FString());
}

void FOnyxGPUTimer::ResolveFinishedFrames()
{
	check(IsInRenderingThread());
	// Frames are read oldest first; a frame whose queries are not all available yet stops the
	// walk (later frames cannot be ready before it). Never waits.
	while (Frames.Num() > 0 && Frames[0].Frame + 2 <= GFrameNumberRenderThread)
	{
		FFrameStamps& F = Frames[0];
		TArray<uint64> Times;
		Times.SetNum(F.Stamps.Num());
		bool bReady = true;
		for (int32 I = 0; I < F.Stamps.Num() && bReady; ++I)
		{
			bReady = RHIGetRenderQueryResult(F.Stamps[I].Query->GetQuery(), Times[I], false);
		}
		if (!bReady)
		{
			if (Frames[0].Frame + 8 < GFrameNumberRenderThread)
			{
				Frames.RemoveAt(0); // lost (device reset, query pool recycled): drop it
				continue;
			}
			break;
		}
		TArray<FOnyxScope> Scopes;
		for (int32 I = 0; I + 1 < F.Stamps.Num(); ++I)
		{
			if (F.Stamps[I].Name.IsEmpty())
			{
				continue; // a Close: no interval starts here
			}
			// RQT_AbsoluteTime results are in microseconds.
			const double Ms = Times[I + 1] >= Times[I] ? double(Times[I + 1] - Times[I]) / 1000.0 : 0.0;
			Scopes.Add({ F.Stamps[I].Name, Ms });
		}
		FOnyx::Get().ReportGpuScopes(static_cast<int64>(F.Frame), MoveTemp(Scopes));
		Frames.RemoveAt(0); // releases the queries back to the pool
	}
}
