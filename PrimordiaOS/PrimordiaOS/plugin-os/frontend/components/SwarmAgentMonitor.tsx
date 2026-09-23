"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Radio, Filter, ArrowDown } from "lucide-react";
import swarmLogger from "@/lib/swarmLogger";
import type { RuntimeEvent } from "@/lib/swarmLogger";

// ─── Source Filter Tabs ─────────────────────────────────────

const SOURCE_TABS = ["ALL", "PURL", "swarmCoreEngine", "temporalEngine", "replicatorEngine", "selfModEngine", "cloudNodeEngine"] as const;
type SourceTab = (typeof SOURCE_TABS)[number];

// ─── Status Badge ───────────────────────────────────────────

function StatusBadge({ status }: { status: RuntimeEvent["status"] }) {
  const colors: Record<string, string> = {
    OK: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    ERROR: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    BLOCKED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${colors[status] ?? "text-white/40 border-white/10"}`}>
      {status}
    </span>
  );
}

// ─── Pulse Indicator ────────────────────────────────────────

function PulseIndicator({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-3 w-3">
      {active && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
      )}
      <span className={`relative inline-flex h-3 w-3 rounded-full ${active ? "bg-emerald-500" : "bg-white/20"}`} />
    </span>
  );
}

// ─── Swarm Agent Monitor Component ──────────────────────────

export function SwarmAgentMonitor() {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [activeTab, setActiveTab] = useState<SourceTab>("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const [lastPulse, setLastPulse] = useState<number>(0);
  const feedRef = useRef<HTMLDivElement>(null);

  // ── Subscribe to events ─────────────────────────────────
  useEffect(() => {
    // Load existing events
    setEvents(swarmLogger.getEvents());

    const unsubscribe = swarmLogger.subscribe((event) => {
      setEvents((prev) => [...prev].concat(event));
      setLastPulse(Date.now());
    });

    return unsubscribe;
  }, []);

  // ── Auto-scroll ─────────────────────────────────────────
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  // ── Filter events ───────────────────────────────────────
  const filteredEvents = activeTab === "ALL"
    ? events
    : events.filter((ev) =>
        activeTab === "PURL"
          ? ev.source === "PURL"
          : ev.engineRoute === activeTab
      );

  // ── Runtime active check ────────────────────────────────
  const isRuntimeActive = Date.now() - lastPulse < 5000 || events.some(
    (ev) => ev.source === "PURL" && ev.intent === "system.boot" && Date.now() - ev.timestamp < 60000
  );

  // ── Format timestamp ────────────────────────────────────
  const formatTime = useCallback((ts: number) => {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, []);

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-[#0a0c14]/95 backdrop-blur-xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-ion" />
          <span className="text-sm font-semibold tracking-wide text-white/90">
            Swarm Monitor
          </span>
          <PulseIndicator active={isRuntimeActive} />
        </div>
        <div className="flex items-center gap-3">
          {/* Runtime Loop Badge */}
          <motion.div
            animate={isRuntimeActive ? { boxShadow: ["0 0 0px rgba(52,211,153,0)", "0 0 12px rgba(52,211,153,0.5)", "0 0 0px rgba(52,211,153,0)"] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider ${
              isRuntimeActive
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 bg-white/5 text-white/30"
            }`}
          >
            <Radio className="mr-1 inline h-3 w-3" />
            {isRuntimeActive ? "LOOP ACTIVE" : "LOOP IDLE"}
          </motion.div>

          {/* Event count */}
          <span className="text-xs text-white/30">{filteredEvents.length} events</span>
        </div>
      </div>

      {/* ── Source Filter Tabs ──────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/6 px-3 py-2">
        <Filter className="mr-1 h-3 w-3 text-white/25 flex-shrink-0" />
        {SOURCE_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
              activeTab === tab
                ? "bg-ion/15 text-ion border border-ion/30"
                : "text-white/40 hover:text-white/60 hover:bg-white/5 border border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Event Feed ─────────────────────────────────────── */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto"
        style={{ minHeight: "240px", maxHeight: "400px" }}
      >
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/20 text-sm py-12">
            No runtime events yet. Execute a command to begin.
          </div>
        ) : (
          <table className="w-full text-xs">
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
              <AnimatePresence>
                {filteredEvents.map((ev, i) => (
                  <motion.tr
                    key={ev.traceId + "-" + i}
                    initial={{ opacity: 0, backgroundColor: "rgba(39,216,255,0.08)" }}
                    animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }}
                    transition={{ duration: 0.6 }}
                    className="border-b border-white/4 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-3 py-2 text-white/40 font-mono">
                      {formatTime(ev.timestamp)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={ev.status} />
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
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-white/6 px-4 py-2">
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] transition-all ${
            autoScroll
              ? "text-ion bg-ion/10"
              : "text-white/30 hover:text-white/50"
          }`}
        >
          <ArrowDown className="h-3 w-3" />
          Auto-scroll
        </button>
        {events.length > 0 && (
          <span className="text-[10px] text-white/20">
            Latest: {formatTime(events[events.length - 1].timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}
