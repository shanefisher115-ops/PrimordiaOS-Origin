#include "OnyxGPUTimer.h"

#include "Onyx.h"
#include "RenderGraphBuilder.h"
#include "RHICommandList.h"
#include "DynamicRHI.h"
#include "RenderGraphResources.h"
#include "ShaderParameterMacros.h"

BEGIN_SHADER_PARAMETER_STRUCT(FOnyxStampParameters, )
	RDG_BUFFER_ACCESS(AfterBuffer, ERHIAccess::CopySrc)
	RDG_TEXTURE_ACCESS(AfterTexture, ERHIAccess::CopySrc)
END_SHADER_PARAMETER_STRUCT()

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

void FOnyxGPUTimer::AddStamp(FRDGBuilder& GraphBuilder, FString&& Name, FRDGBufferRef AfterBuffer, FRDGTextureRef AfterTexture)
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
	// A copy pass on the graphics pipe: it may declare resource reads, and its command list can
	// write render queries. The declared read orders it after the pass that wrote the resource.
	FOnyxStampParameters* Params = GraphBuilder.AllocParameters<FOnyxStampParameters>();
	Params->AfterBuffer = AfterBuffer;
	Params->AfterTexture = AfterTexture;
	GraphBuilder.AddPass(RDG_EVENT_NAME("Onyx.Stamp"), Params, ERDGPassFlags::Copy | ERDGPassFlags::NeverCull,
		[Query](FRHICommandList& RHICmdList)
		{
			RHICmdList.EndRenderQuery(Query);
		});
}

void FOnyxGPUTimer::Stamp(FRDGBuilder& GraphBuilder, const TCHAR* Name, FRDGBufferRef AfterBuffer, FRDGTextureRef AfterTexture)
{
	AddStamp(GraphBuilder, FString(Name), AfterBuffer, AfterTexture);
}

void FOnyxGPUTimer::Close(FRDGBuilder& GraphBuilder, FRDGBufferRef AfterBuffer, FRDGTextureRef AfterTexture)
{
	AddStamp(GraphBuilder, FString(), AfterBuffer, AfterTexture);
}

void FOnyxGPUTimer::Release()
{
	check(IsInRenderingThread());
	Frames.Empty();
	Pool.SafeRelease();
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
