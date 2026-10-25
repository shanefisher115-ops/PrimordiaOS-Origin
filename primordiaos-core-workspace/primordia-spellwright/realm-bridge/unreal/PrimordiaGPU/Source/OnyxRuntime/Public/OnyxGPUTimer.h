// Render-graph timestamp hooks for Onyx.
//
// Stamp(GraphBuilder, "mcp.topology") adds a never-culled pass that writes a GPU timestamp
// (RQT_AbsoluteTime) on the graphics pipe. Each stamp opens an interval that runs to the next
// stamp of the same frame; Close() ends the last one. Boundary stamps (rather than begin/end
// pairs) mean a late end-of-pipe write can never move one pass's time into its neighbor's.
// Results are read without waiting, two or more frames later, in OnEndFrameRT.
//
// Timestamps can only be written from the graphics command list, so passes running on the
// async compute pipe are not timed per pass (Onyx still has the whole-frame GPU time).
#pragma once

#include "CoreMinimal.h"
#include "RHI.h"
#include "RHIResources.h"

class FRDGBuilder;

class ONYXRUNTIME_API FOnyxGPUTimer
{
public:
	static FOnyxGPUTimer& Get();

	/** Render thread. Opens interval Name at this point of the graph. */
	void Stamp(FRDGBuilder& GraphBuilder, const TCHAR* Name);
	/** Render thread. Ends the open interval of this frame. */
	void Close(FRDGBuilder& GraphBuilder);
	/** Render thread (OnEndFrameRT): reads finished frames and reports them to FOnyx. */
	void ResolveFinishedFrames();

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
	void AddStamp(FRDGBuilder& GraphBuilder, FString&& Name);

	FRenderQueryPoolRHIRef Pool;
	TArray<FFrameStamps> Frames; // oldest first
};
