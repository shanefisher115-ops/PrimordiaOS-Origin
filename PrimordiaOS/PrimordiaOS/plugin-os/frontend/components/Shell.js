"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Shell = Shell;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const CommandConsole_1 = require("./CommandConsole");
const SwarmAgentMonitor_1 = require("./SwarmAgentMonitor");
const AntigravityRealm_1 = require("./AntigravityRealm");
const RealmTopologyMap_1 = require("./RealmTopologyMap");
const CommandPalette_1 = require("./CommandPalette");
const KillSwitchPanel_1 = require("./KillSwitchPanel");
const AuditTimeline_1 = require("./AuditTimeline");
const purlRuntime_1 = require("@/lib/purlRuntime");
const antigravityBridge_1 = require("@/lib/antigravityBridge");
const realmBusStore_1 = require("@/lib/realmBusStore");
// ─── Boot Sequence Lines ────────────────────────────────────
const BOOT_LINES = [
    { text: "PrimordiaOS Kernel v4.0", delay: 0, color: "text-white/70" },
    { text: "Loading Overmind Engine Map...", delay: 200, color: "text-white/50" },
    { text: "  → swarmCoreEngine    [OK]", delay: 350, color: "text-emerald-400/80" },
    { text: "  → temporalEngine     [OK]", delay: 450, color: "text-emerald-400/80" },
    { text: "  → replicatorEngine   [OK]", delay: 550, color: "text-emerald-400/80" },
    { text: "  → selfModEngine      [OK]", delay: 650, color: "text-emerald-400/80" },
    { text: "  → cloudNodeEngine    [OK]", delay: 750, color: "text-emerald-400/80" },
    { text: "  → antigravityEngine  [OK]", delay: 850, color: "text-emerald-400/80" },
    { text: "Binding Safety Layer (PVE + Safe Mode)...", delay: 1000, color: "text-white/50" },
    { text: "Connecting Swarm Logger...", delay: 1050, color: "text-white/50" },
    { text: "Connecting RealmBus Gateway...", delay: 1100, color: "text-ion/70" },
    { text: "  → System Realm       [OK]", delay: 1200, color: "text-emerald-400/80" },
    { text: "  → Cloud Realm        [OK]", delay: 1300, color: "text-emerald-400/80" },
    { text: "  → Simulation Realm   [OK]", delay: 1400, color: "text-emerald-400/80" },
    { text: "  → Agent Pool         [OK]", delay: 1500, color: "text-emerald-400/80" },
    { text: "Initializing Runtime Loop...", delay: 1650, color: "text-ion" },
    { text: "████████████████████████████ 100%", delay: 1800, color: "text-ion" },
    { text: "", delay: 2000, color: "" },
    { text: "◆ PURL Online — Primordia Unified Runtime Loop", delay: 2100, color: "text-aether" },
    { text: "◆ RealmBus Online — God Console Active", delay: 2200, color: "text-aether" },
    { text: "  Ready to receive commands.", delay: 2350, color: "text-white/40" },
];
// ─── Format Uptime ──────────────────────────────────────────
function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0)
        return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0)
        return `${m}m ${s % 60}s`;
    return `${s}s`;
}
// ─── Realm Status Dot ───────────────────────────────────────
function RealmDot({ name, color }) {
    const { realmHealth } = (0, realmBusStore_1.useRealmBusStore)();
    const health = realmHealth[name];
    const isOnline = health?.state === "online";
    return (<div className="flex items-center gap-1" title={`${name}: ${health?.state ?? "unknown"}`}>
      <span className="relative flex h-1.5 w-1.5">
        {isOnline && (<span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-30" style={{ backgroundColor: color }}/>)}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isOnline ? color : "#374151" }}/>
      </span>
    </div>);
}
// ─── Shell Component ────────────────────────────────────────
function Shell() {
    const [bootPhase, setBootPhase] = (0, react_1.useState)("booting");
    const [visibleLines, setVisibleLines] = (0, react_1.useState)(0);
    const [activeTab, setActiveTab] = (0, react_1.useState)("console");
    const [uptimeStr, setUptimeStr] = (0, react_1.useState)("0s");
    const { connectionState, connect } = (0, realmBusStore_1.useRealmBusStore)();
    // ── Boot Sequence ───────────────────────────────────────
    (0, react_1.useEffect)(() => {
        // Start PURL runtime
        (0, purlRuntime_1.startPURL)();
        // Bind Antigravity visual cognition engine
        (0, antigravityBridge_1.bindAntigravityToPURL)();
        // Connect to RealmBus gateway
        connect("ws://localhost:3100").catch((err) => {
            console.warn("[Shell] RealmBus connection failed, running in local-only mode:", err);
        });
        // Animate boot lines
        BOOT_LINES.forEach((line, i) => {
            setTimeout(() => {
                setVisibleLines(i + 1);
            }, line.delay);
        });
        // Transition to ready
        const readyTimer = setTimeout(() => {
            setBootPhase("ready");
        }, 2600);
        return () => clearTimeout(readyTimer);
    }, [connect]);
    // ── Uptime Ticker ───────────────────────────────────────
    (0, react_1.useEffect)(() => {
        if (bootPhase !== "ready")
            return;
        const interval = setInterval(() => {
            setUptimeStr(formatUptime((0, purlRuntime_1.getUptime)()));
        }, 1000);
        return () => clearInterval(interval);
    }, [bootPhase]);
    // ── Get Runtime Info ────────────────────────────────────
    const runtimeState = (0, purlRuntime_1.getRuntimeState)();
    // ── Tab Config ──────────────────────────────────────────
    const tabs = [
        { key: "console", label: "Console", icon: lucide_react_1.Terminal },
        { key: "realms", label: "Realms", icon: lucide_react_1.Globe },
        { key: "monitor", label: "Monitor", icon: lucide_react_1.Activity },
        { key: "antigravity", label: "Antigravity", icon: lucide_react_1.Eye },
        { key: "audit", label: "Audit", icon: lucide_react_1.ScrollText },
        { key: "diagnostics", label: "Diagnostics", icon: lucide_react_1.Settings },
    ];
    return (<div className="flex flex-col gap-0 rounded-[1.75rem] border border-white/10 bg-[#080a12]/98 shadow-cosmic backdrop-blur-2xl overflow-hidden">
      {/* ── Command Palette (Cmd+K) ─────────────────────────── */}
      <CommandPalette_1.CommandPalette />

      {/* ── Boot Sequence ──────────────────────────────────── */}
      <framer_motion_1.AnimatePresence mode="wait">
        {bootPhase === "booting" && (<framer_motion_1.motion.div key="boot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="p-6 font-mono text-xs leading-relaxed" style={{ minHeight: "320px" }}>
            {/* Scanline overlay */}
            <div className="pointer-events-none absolute inset-0 z-20 opacity-[0.03]" style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(39,216,255,0.15) 2px, rgba(39,216,255,0.15) 4px)",
            }}/>

            {BOOT_LINES.slice(0, visibleLines).map((line, i) => (<framer_motion_1.motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }} className={line.color}>
                {line.text || "\u00A0"}
              </framer_motion_1.motion.div>))}

            {/* Blinking cursor */}
            <framer_motion_1.motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }} className="inline-block w-2 h-4 bg-ion mt-1"/>
          </framer_motion_1.motion.div>)}

        {bootPhase === "ready" && (<framer_motion_1.motion.div key="shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }} className="flex flex-col">
            {/* ── Shell Title Bar ──────────────────────────── */}
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
              <div className="flex items-center gap-3">
                {/* Window dots */}
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500/70"/>
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500/70"/>
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/70"/>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <lucide_react_1.Cpu className="h-4 w-4 text-ion"/>
                  <span className="text-sm font-semibold text-white/90 tracking-wide">
                    PrimordiaOS God Console
                  </span>
                </div>
              </div>

              {/* Status bar items */}
              <div className="hidden sm:flex items-center gap-4 text-[10px] text-white/30 font-mono">
                {/* PURL status */}
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40"/>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"/>
                  </span>
                  <span className="text-emerald-400/70">PURL</span>
                </div>

                {/* RealmBus status */}
                <div className="flex items-center gap-1">
                  {connectionState === "connected" ? (<lucide_react_1.Wifi className="h-3 w-3 text-ion/70"/>) : (<lucide_react_1.WifiOff className="h-3 w-3 text-rose-400/50"/>)}
                  <span className={connectionState === "connected" ? "text-ion/70" : "text-rose-400/50"}>
                    {connectionState === "connected" ? "BUS" : connectionState}
                  </span>
                </div>

                {/* Realm connection dots */}
                <div className="flex items-center gap-1.5 border-l border-white/8 pl-3">
                  <RealmDot name="system" color="#27d8ff"/>
                  <RealmDot name="cloud" color="#a78bfa"/>
                  <RealmDot name="simulation" color="#f97316"/>
                  <RealmDot name="agents" color="#34d399"/>
                </div>

                {/* Uptime */}
                <div className="flex items-center gap-1">
                  <lucide_react_1.Clock className="h-3 w-3"/>
                  {uptimeStr}
                </div>

                {/* Engines */}
                <div className="flex items-center gap-1">
                  <lucide_react_1.Layers className="h-3 w-3"/>
                  {(0, purlRuntime_1.getEngineCount)()} engines
                </div>

                {/* Trace */}
                {runtimeState.lastTraceId && (<div className="flex items-center gap-1">
                    <lucide_react_1.Hash className="h-3 w-3"/>
                    {runtimeState.lastTraceId}
                  </div>)}

                {/* Kill Switch */}
                <KillSwitchPanel_1.KillSwitchPanel />
              </div>
            </div>

            {/* ── Tab Bar ──────────────────────────────────── */}
            <div className="flex items-center gap-1 border-b border-white/6 px-4 py-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (<button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${isActive
                        ? "bg-ion/15 text-ion border border-ion/25"
                        : "text-white/35 hover:text-white/55 hover:bg-white/5 border border-transparent"}`}>
                    <Icon className="h-3.5 w-3.5"/>
                    {tab.label}
                  </button>);
            })}

              {/* Cmd+K hint */}
              <div className="ml-auto flex items-center gap-1 text-[9px] text-white/15">
                <kbd className="rounded border border-white/8 bg-white/5 px-1.5 py-0.5 font-mono">
                  {typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}
                </kbd>
                <kbd className="rounded border border-white/8 bg-white/5 px-1.5 py-0.5 font-mono">K</kbd>
                <span className="ml-0.5">palette</span>
              </div>
            </div>

            {/* ── Tab Content ──────────────────────────────── */}
            <div className="p-4">
              <framer_motion_1.AnimatePresence mode="wait">
                {activeTab === "console" && (<framer_motion_1.motion.div key="console" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                    <CommandConsole_1.CommandConsole />
                  </framer_motion_1.motion.div>)}

                {activeTab === "realms" && (<framer_motion_1.motion.div key="realms" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                    <RealmTopologyMap_1.RealmTopologyMap />
                  </framer_motion_1.motion.div>)}

                {activeTab === "monitor" && (<framer_motion_1.motion.div key="monitor" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                    <SwarmAgentMonitor_1.SwarmAgentMonitor />
                  </framer_motion_1.motion.div>)}

                {activeTab === "antigravity" && (<framer_motion_1.motion.div key="antigravity" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                    <AntigravityRealm_1.AntigravityRealm />
                  </framer_motion_1.motion.div>)}

                {activeTab === "audit" && (<framer_motion_1.motion.div key="audit" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                    <AuditTimeline_1.AuditTimeline />
                  </framer_motion_1.motion.div>)}

                {activeTab === "diagnostics" && (<framer_motion_1.motion.div key="diagnostics" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                    <DiagnosticsPanel state={runtimeState} uptime={uptimeStr}/>
                  </framer_motion_1.motion.div>)}
              </framer_motion_1.AnimatePresence>
            </div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>
    </div>);
}
// ─── Diagnostics Panel ──────────────────────────────────────
function DiagnosticsPanel({ state, uptime, }) {
    const antigravityBound = (0, antigravityBridge_1.isAntigravityBound)();
    const { connectionState, realmHealth, events } = (0, realmBusStore_1.useRealmBusStore)();
    const realmCount = Object.keys(realmHealth).length;
    const onlineRealms = Object.values(realmHealth).filter((h) => h.state === "online").length;
    const entries = [
        { label: "Loop Status", value: state.loopActive ? "ACTIVE" : "INACTIVE", color: state.loopActive ? "text-emerald-400" : "text-white/30" },
        { label: "RealmBus", value: connectionState.toUpperCase(), color: connectionState === "connected" ? "text-ion" : "text-rose-400" },
        { label: "Realms Online", value: `${onlineRealms}/${realmCount}`, color: onlineRealms === realmCount ? "text-emerald-400" : "text-amber-400" },
        { label: "Bus Messages", value: String(events.length) },
        { label: "Uptime", value: uptime },
        { label: "Commands Executed", value: String(state.commandCount) },
        { label: "Last Command", value: state.lastCommand ?? "—" },
        { label: "Last Engine", value: state.lastEngineRoute ?? "—" },
        { label: "Last Trace ID", value: state.lastTraceId ?? "—" },
        { label: "Last Latency", value: state.lastLatencyMs !== null ? `${state.lastLatencyMs}ms` : "—" },
        { label: "Last Status", value: state.lastOutput?.status ?? "—", color: state.lastOutput?.status === "OK" ? "text-emerald-400" : state.lastOutput?.status === "ERROR" ? "text-rose-400" : state.lastOutput?.status === "BLOCKED" ? "text-amber-400" : undefined },
        { label: "Engine Count", value: String((0, purlRuntime_1.getEngineCount)()) },
        { label: "Antigravity", value: antigravityBound ? "BOUND" : "UNBOUND", color: antigravityBound ? "text-ion" : "text-white/30" },
    ];
    return (<div className="rounded-2xl border border-white/10 bg-[#0a0c14]/95 backdrop-blur-xl overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
        <lucide_react_1.Settings className="h-4 w-4 text-ion"/>
        <span className="text-sm font-semibold tracking-wide text-white/90">
          Runtime Diagnostics
        </span>
      </div>
      <div className="p-4 space-y-2">
        {entries.map((entry) => (<div key={entry.label} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] px-4 py-2.5">
            <span className="text-xs text-white/45">{entry.label}</span>
            <span className={`text-xs font-mono ${entry.color ?? "text-white/75"}`}>
              {entry.value}
            </span>
          </div>))}
      </div>
    </div>);
}
