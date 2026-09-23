import EngineStream from "@/components/EngineStream";
import OverlayCanvas from "@/components/OverlayCanvas";
export default function SimPage() {
    return (<div className="grid h-screen grid-cols-[2fr,1fr] bg-black text-slate-100">
      <div className="relative">
        <EngineStream />
        <OverlayCanvas />
      </div>
      <div className="border-l border-slate-800 bg-slate-950 p-4">
        <h1 className="text-lg font-semibold mb-4">PrimordiaOS Live Control</h1>
        {/* Pulse, agents, logs, etc. */}
      </div>
    </div>);
}
