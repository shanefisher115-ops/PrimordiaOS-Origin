"use client";
export default function EngineStream() {
    return (<div className="h-full w-full bg-black">
      {/* Replace src with your Pixel Streaming endpoint */}
      <iframe src="https://your-unreal-pixel-stream-endpoint" className="h-full w-full border-0" allow="fullscreen; autoplay"/>
    </div>);
}
