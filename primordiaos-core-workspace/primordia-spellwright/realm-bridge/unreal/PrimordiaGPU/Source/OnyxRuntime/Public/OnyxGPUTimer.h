// Render-graph timestamp hooks for Onyx.
//
// Stamp(GraphBuilder, "mcp.topology", After) adds a never-culled copy pass that writes a GPU
// timestamp (RQT_AbsoluteTime) on the graphics pipe. Each stamp opens an interval that runs to
// the next stamp of the same frame; Close() ends the last one.
//
// After names a resource the previous pass wrote. The stamp pass declares a read of it, so the
// render graph puts the transition (and with it the wait for that pass) in front of the stamp.
// Without it, RHIs that write timestamps when the command is reached (Unreal's Vulkan RHI)
// stamp before the previous pass finishes, and each pass's time slides into the next one's.
// Results are read without waiting, two or more frames later, in OnEndFrameRT.
//
// Timestamps can only be written from the graphics command list, so passes running on the
// async compute pipe are not timed per pass (Onyx still has the whole-frame GPU time).
#pragma once

#include "CoreMinimal.h"
#include "RHI.h"
#include "RHIResources.h"
#include "RenderGraphFwd.h"

class FRDGBuilder;

class ONYXRUNTIME_API FOnyxGPUTimer
{
public:
	static FOnyxGPUTimer& Get();

	/** Render thread. Opens interval Name at this point of the graph, once the pass that wrote
	 *  AfterBuffer / AfterTexture (if given) has finished. */
	void Stamp(FRDGBuilder& GraphBuilder, const TCHAR* Name, FRDGBufferRef AfterBuffer = nullptr, FRDGTextureRef AfterTexture = nullptr);
	/** Render thread. Ends the open interval of this frame. */
	void Close(FRDGBuilder& GraphBuilder, FRDGBufferRef AfterBuffer = nullptr, FRDGTextureRef AfterTexture = nullptr);
	/** Render thread (OnEndFrameRT): reads finished frames and reports them to FOnyx. */
	void ResolveFinishedFrames();
	/** Render thread: drops every query and the pool (before the RHI shuts down). */
	void Release();

private:
	struct FStamp
	{
		FString Name; // empty for a Close
		// FRHIPooledRenderQuery is move-only and TArray wants copyable elements; the shared
		// pointer keeps one owner and returns the query to its pool when the frame is dropped.
		TSharedPtr<FRHIPooledRenderQuery> Query;
	};
	struct FFrameStamps
	{
		uint64 Frame = 0;
		TArray<FStamp> Stamps;
	};
	FFrameStamps& CurrentFrame();
	void AddStamp(FRDGBuilder& GraphBuilder, FString&& Name, FRDGBufferRef AfterBuffer, FRDGTextureRef AfterTexture);

	FRenderQueryPoolRHIRef Pool;
	TArray<FFrameStamps> Frames; // oldest first
};
