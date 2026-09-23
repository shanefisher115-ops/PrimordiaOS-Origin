"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ElectronPage;
const react_1 = require("react");
const defaultQuery = "unreal";
const defaultPrompt = "build a scene bridge";
function ElectronPage() {
    const [runtime, setRuntime] = (0, react_1.useState)();
    const [query, setQuery] = (0, react_1.useState)(defaultQuery);
    const [prompt, setPrompt] = (0, react_1.useState)(defaultPrompt);
    const [source, setSource] = (0, react_1.useState)("screen:primary");
    const [seed, setSeed] = (0, react_1.useState)("generate a launch flow");
    const [pulseMessage, setPulseMessage] = (0, react_1.useState)("Pulse wave online");
    const [result, setResult] = (0, react_1.useState)();
    const [events, setEvents] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        let dispose;
        async function load() {
            if (!window.primordia)
                return;
            const snapshot = await window.primordia.getRuntime();
            setRuntime(snapshot);
            dispose = window.primordia.onPulse?.((event) => {
                setEvents((current) => [`${event.timestamp}: ${event.message}`, ...current].slice(0, 8));
            });
        }
        load();
        return () => dispose?.();
    }, []);
    const headline = (0, react_1.useMemo)(() => {
        if (!runtime)
            return "Connecting to desktop bridge...";
        return `${runtime.platform} | ${runtime.registrySize} registry nodes | pulse ${runtime.pulseState}`;
    }, [runtime]);
    async function invoke(fn) {
        if (!window.primordia)
            return;
        const value = await fn();
        setResult(value);
        return value;
    }
    return (<section className="mx-auto min-h-screen max-w-[1280px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-10">
      <div className="rounded-[2rem] border border-cyan-400/10 bg-[#0b111a]/95 px-5 py-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_36px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-7 sm:py-7">
        <div className="flex flex-col gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Desktop runtime</p>
            <h1 className="mt-2 text-[3.2rem] font-light leading-[0.94] tracking-[-0.06em] text-white sm:text-[4.2rem]">
              Electron Command Bridge
            </h1>
            <p className="mt-3 max-w-2xl text-[1.05rem] leading-7 text-white/76 sm:text-[1.12rem]">
              {headline}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-lg font-semibold text-white">Vectorize + Gemini</h2>
              <input className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white outline-none" value={query} onChange={(e) => setQuery(e.target.value)}/>
              <input className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white outline-none" value={prompt} onChange={(e) => setPrompt(e.target.value)}/>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-white" onClick={() => invoke(() => window.primordia.vectorize(query))}>Vectorize</button>
                <button className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-white" onClick={() => invoke(() => window.primordia.gemini(prompt))}>Gemini</button>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-lg font-semibold text-white">Unreal + VisionCore + Generator + Pulse</h2>
              <input className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white outline-none" value={source} onChange={(e) => setSource(e.target.value)}/>
              <input className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white outline-none" value={seed} onChange={(e) => setSeed(e.target.value)}/>
              <input className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white outline-none" value={pulseMessage} onChange={(e) => setPulseMessage(e.target.value)}/>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white" onClick={() => invoke(() => window.primordia.unreal("launch packaged build"))}>Unreal</button>
                <button className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white" onClick={() => invoke(() => window.primordia.visioncore(source))}>VisionCore</button>
                <button className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white" onClick={() => invoke(() => window.primordia.generator(seed))}>Generator</button>
                <button className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white" onClick={() => invoke(() => window.primordia.pulse(pulseMessage))}>Pulse Wave</button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <pre className="overflow-auto rounded-[1.4rem] border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/75">
              {JSON.stringify(result, null, 2)}
            </pre>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-lg font-semibold text-white">Pulse Log</h2>
              <div className="mt-4 space-y-2 text-sm text-white/72">
                {events.length ? events.map((line) => <div key={line} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">{line}</div>) : <p>No pulse events yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>);
}
