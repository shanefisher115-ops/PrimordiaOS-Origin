"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwarmAgentMonitor = SwarmAgentMonitor;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const swarmLogger_1 = __importDefault(require("@/lib/swarmLogger"));
// ─── Source Filter Tabs ─────────────────────────────────────
const SOURCE_TABS = ["ALL", "PURL", "swarmCoreEngine", "temporalEngine", "replicatorEngine", "selfModEngine", "cloudNodeEngine"];
// ─── Status Badge ───────────────────────────────────────────
function StatusBadge({ status }) {
    const colors = {
        OK: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        ERROR: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        BLOCKED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    };
    return (<span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${colors[status] ?? "text-white/40 border-white/10"}`}>
      {status}
    </span>);
}
// ─── Pulse Indicator ────────────────────────────────────────
function PulseIndicator({ active }) {
    return (<span className="relative flex h-3 w-3">
      {active && (<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50"/>)}
      <span className={`relative inline-flex h-3 w-3 rounded-full ${active ? "bg-emerald-500" : "bg-white/20"}`}/>
    </span>);
}
// ─── Swarm Agent Monitor Component ──────────────────────────
function SwarmAgentMonitor() {
    const [events, setEvents] = (0, react_1.useState)([]);
    const [activeTab, setActiveTab] = (0, react_1.useState)("ALL");
    const [autoScroll, setAutoScroll] = (0, react_1.useState)(true);
    const [lastPulse, setLastPulse] = (0, react_1.useState)(0);
    const feedRef = (0, react_1.useRef)(null);
    // ── Subscribe to events ─────────────────────────────────
    (0, react_1.useEffect)(() => {
        // Load existing events
        setEvents(swarmLogger_1.default.getEvents());
        const unsubscribe = swarmLogger_1.default.subscribe((event) => {
            setEvents((prev) => [...prev].concat(event));
            setLastPulse(Date.now());
        });
        return unsubscribe;
    }, []);
    // ── Auto-scroll ─────────────────────────────────────────
    (0, react_1.useEffect)(() => {
        if (autoScroll && feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [events, autoScroll]);
    // ── Filter events ───────────────────────────────────────
    const filteredEvents = activeTab === "ALL"
        ? events
        : events.filter((ev) => activeTab === "PURL"
            ? ev.source === "PURL"
            : ev.engineRoute === activeTab);
    // ── Runtime active check ────────────────────────────────
    const isRuntimeActive = Date.now() - lastPulse < 5000 || events.some((ev) => ev.source === "PURL" && ev.intent === "system.boot" && Date.now() - ev.timestamp < 60000);
    // ── Format timestamp ────────────────────────────────────
    const formatTime = (0, react_1.useCallback)((ts) => {
        return new Date(ts).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }, []);
    return (<div className="flex flex-col rounded-2xl border border-white/10 bg-[#0a0c14]/95 backdrop-blur-xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-3">
          <lucide_react_1.Activity className="h-4 w-4 text-ion"/>
          <span className="text-sm font-semibold tracking-wide text-white/90">
            Swarm Monitor
          </span>
          <PulseIndicator active={isRuntimeActive}/>
        </div>
        <div className="flex items-center gap-3">
          {/* Runtime Loop Badge */}
          <framer_motion_1.motion.div animate={isRuntimeActive ? { boxShadow: ["0 0 0px rgba(52,211,153,0)", "0 0 12px rgba(52,211,153,0.5)", "0 0 0px rgba(52,211,153,0)"] } : {}} transition={{ duration: 2, repeat: Infinity }} className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider ${isRuntimeActive
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            : "border-white/10 bg-white/5 text-white/30"}`}>
            <lucide_react_1.Radio className="mr-1 inline h-3 w-3"/>
            {isRuntimeActive ? "LOOP ACTIVE" : "LOOP IDLE"}
          </framer_motion_1.motion.div>

          {/* Event count */}
          <span className="text-xs text-white/30">{filteredEvents.length} events</span>
        </div>
      </div>

      {/* ── Source Filter Tabs ──────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/6 px-3 py-2">
        <lucide_react_1.Filter className="mr-1 h-3 w-3 text-white/25 flex-shrink-0"/>
        {SOURCE_TABS.map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${activeTab === tab
                ? "bg-ion/15 text-ion border border-ion/30"
                : "text-white/40 hover:text-white/60 hover:bg-white/5 border border-transparent"}`}>
            {tab}
          </button>))}
      </div>

      {/* ── Event Feed ─────────────────────────────────────── */}
      <div ref={feedRef} className="flex-1 overflow-y-auto" style={{ minHeight: "240px", maxHeight: "400px" }}>
        {filteredEvents.length === 0 ? (<div className="flex items-center justify-center h-full text-white/20 text-sm py-12">
            No runtime events yet. Execute a command to begin.
          </div>) : (<table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0a0c14] z-10">
              <tr className="text-left text-white/30 border-b border-white/6">
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Intent</th>
                <th className="px-3 py-2 font-medium">Engine</th>
                <th className="px-3 py-2 font-medium text-right">Latency</th>
                <th className="px-3 py-2 font-medium">Trace</th>
              </tr>
            </thead>
            <tbody>
              <framer_motion_1.AnimatePresence>
                {filteredEvents.map((ev, i) => (<framer_motion_1.motion.tr key={ev.traceId + "-" + i} initial={{ opacity: 0, backgroundColor: "rgba(39,216,255,0.08)" }} animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }} transition={{ duration: 0.6 }} className="border-b border-white/4 hover:bg-white/[0.03] transition-colors">
                    <td className="px-3 py-2 text-white/40 font-mono">
                      {formatTime(ev.timestamp)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={ev.status}/>
                    </td>
                    <td className="px-3 py-2 text-white/80 font-mono">
                      {ev.intent}
                    </td>
                    <td className="px-3 py-2 text-white/50 font-mono">
                      {ev.engineRoute ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-white/40 font-mono text-right">
                      {ev.executionTimeMs}ms
                    </td>
                    <td className="px-3 py-2 text-white/20 font-mono text-[10px]">
                      {ev.traceId}
                    </td>
                  </framer_motion_1.motion.tr>))}
              </framer_motion_1.AnimatePresence>
            </tbody>
          </table>)}
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-white/6 px-4 py-2">
        <button onClick={() => setAutoScroll(!autoScroll)} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] transition-all ${autoScroll
            ? "text-ion bg-ion/10"
            : "text-white/30 hover:text-white/50"}`}>
          <lucide_react_1.ArrowDown className="h-3 w-3"/>
          Auto-scroll
        </button>
        {events.length > 0 && (<span className="text-[10px] text-white/20">
            Latest: {formatTime(events[events.length - 1].timestamp)}
          </span>)}
      </div>
    </div>);
}
