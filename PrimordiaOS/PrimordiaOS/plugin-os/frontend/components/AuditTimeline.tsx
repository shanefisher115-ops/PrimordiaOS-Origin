"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScrollText, Filter, ArrowDown, Search, Clock,
  ChevronRight, Copy, Check, X,
} from "lucide-react";
import { useRealmBusStore } from "@/lib/realmBusStore";
import type { RealmMessage, MessageType } from "@/lib/realmBusClient";

// ─── Type Filter Tabs ───────────────────────────────────────

const TYPE_TABS: { key: MessageType | "ALL"; label: string; color: string }[] = [
  { key: "ALL", label: "All", color: "text-white/50" },
  { key: "command", label: "Command", color: "text-ion" },
  { key: "response", label: "Response", color: "text-emerald-400" },
  { key: "event", label: "Event", color: "text-purple-400" },
  { key: "heartbeat", label: "Heartbeat", color: "text-white/30" },
  { key: "error", label: "Error", color: "text-rose-400" },
];

const TYPE_COLORS: Record<string, string> = {
  command: "text-ion border-ion/30 bg-ion/10",
  response: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  event: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  heartbeat: "text-white/30 border-white/10 bg-white/5",
  error: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  register: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  deregister: "text-rose-400 border-rose-500/30 bg-rose-500/10",
};

const REALM_BADGE_COLORS: Record<string, string> = {
  system: "text-[#27d8ff]/70",
  cloud: "text-purple-400/70",
  simulation: "text-orange-400/70",
  agents: "text-emerald-400/70",
  browser: "text-amber-400/70",
  gateway: "text-white/40",
};

// ─── Component ──────────────────────────────────────────────

export function AuditTimeline() {
  const { events, clearEvents } = useRealmBusStore();

  const [typeFilter, setTypeFilter] = useState<MessageType | "ALL">("ALL");
  const [realmFilter, setRealmFilter] = useState<string | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [hideHeartbeats, setHideHeartbeats] = useState(true);

  const feedRef = useRef<HTMLDivElement>(null);

  // ── Filter Events ───────────────────────────────────────

  const filteredEvents = useMemo(() => {
    let result = events;

    // Hide heartbeats by default (they're noisy)
    if (hideHeartbeats) {
      result = result.filter((e) => e.type !== "heartbeat");
    }

    if (typeFilter !== "ALL") {
      result = result.filter((e) => e.type === typeFilter);
    }

    if (realmFilter !== "ALL") {
      result = result.filter(
        (e) => e.source === realmFilter || e.target === realmFilter
      );
    }

    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.intent.toLowerCase().includes(lower) ||
          e.source.toLowerCase().includes(lower) ||
          e.target.toLowerCase().includes(lower) ||
          JSON.stringify(e.payload).toLowerCase().includes(lower)
      );
    }

    // If viewing a trace, show only that trace
    if (selectedTraceId) {
      result = result.filter((e) => e.meta?.traceId === selectedTraceId);
    }

    return result;
  }, [events, typeFilter, realmFilter, searchQuery, selectedTraceId, hideHeartbeats]);

  // ── Derive available realms ─────────────────────────────

  const availableRealms = useMemo(() => {
    const realms = new Set<string>();
    for (const e of events) {
      realms.add(e.source);
      if (e.target !== "*") realms.add(e.target);
    }
    return Array.from(realms).sort();
  }, [events]);

  // ── Auto-scroll ─────────────────────────────────────────

  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [filteredEvents, autoScroll]);

  // ── Copy Payload ────────────────────────────────────────

  const copyPayload = useCallback((id: string, data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  // ── Format Time ─────────────────────────────────────────

  const formatTime = useCallback((ts: number) => {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  }, []);

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-[#0a0c14]/95 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-ion" />
          <span className="text-sm font-semibold tracking-wide text-white/90">
            Audit Timeline
          </span>
        </div>
        <div className="flex items-center gap-3">
          {selectedTraceId && (
            <button
              onClick={() => setSelectedTraceId(null)}
              className="flex items-center gap-1 rounded-lg border border-ion/30 bg-ion/10 px-2 py-1 text-[9px] text-ion"
            >
              Trace: {selectedTraceId.slice(0, 12)}
              <X className="h-2.5 w-2.5" />
            </button>
          )}
          <span className="text-xs text-white/30">{filteredEvents.length} msgs</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-b border-white/6 px-3 py-2 flex flex-wrap items-center gap-2">
        {/* Type Tabs */}
        <div className="flex items-center gap-1">
          <Filter className="h-3 w-3 text-white/20 mr-1" />
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`rounded-md px-2 py-1 text-[10px] font-medium transition-all border ${
                typeFilter === tab.key
                  ? `${tab.color} border-current/30 bg-current/10`
                  : "text-white/30 border-transparent hover:text-white/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Realm Filter */}
        <select
          value={realmFilter}
          onChange={(e) => setRealmFilter(e.target.value)}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/60 outline-none"
        >
          <option value="ALL">All Realms</option>
          {availableRealms.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* Search */}
        <div className="flex items-center gap-1 flex-1 min-w-[120px]">
          <Search className="h-3 w-3 text-white/20" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter..."
            className="flex-1 bg-transparent text-[10px] text-white/70 placeholder:text-white/15 outline-none font-mono"
          />
        </div>

        {/* Heartbeat Toggle */}
        <button
          onClick={() => setHideHeartbeats(!hideHeartbeats)}
          className={`rounded-md px-2 py-1 text-[9px] border transition-all ${
            hideHeartbeats
              ? "text-white/25 border-white/10"
              : "text-white/50 border-white/20 bg-white/5"
          }`}
        >
          {hideHeartbeats ? "♡ Hidden" : "♥ Showing"}
        </button>

        {/* Clear */}
        <button
          onClick={clearEvents}
          className="rounded-md border border-white/10 px-2 py-1 text-[9px] text-white/30 hover:text-rose-400 hover:border-rose-400/30 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Event Feed */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto"
        style={{ minHeight: "240px", maxHeight: "480px" }}
      >
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/15 text-xs py-12">
            {events.length === 0
              ? "No messages yet — connect to RealmBus"
              : "No messages match current filters"}
          </div>
        ) : (
          <div>
            {filteredEvents.map((ev, i) => {
              const typeStyle = TYPE_COLORS[ev.type] ?? "text-white/40 border-white/10 bg-white/5";
              const sourceColor = REALM_BADGE_COLORS[ev.source] ?? "text-white/40";
              const targetColor = REALM_BADGE_COLORS[ev.target] ?? "text-white/40";
              const hasPayload = ev.payload && Object.keys(ev.payload as Record<string, unknown>).length > 0;

              return (
                <motion.div
                  key={`${ev.id}-${i}`}
                  initial={{ opacity: 0, backgroundColor: "rgba(39,216,255,0.04)" }}
                  animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }}
                  transition={{ duration: 0.4 }}
                  className="border-b border-white/4 px-3 py-2 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    {/* Timestamp */}
                    <span className="text-[9px] font-mono text-white/25 w-[72px] flex-shrink-0">
                      {formatTime(ev.timestamp)}
                    </span>

                    {/* Type badge */}
                    <span className={`text-[8px] font-bold rounded border px-1.5 py-0.5 flex-shrink-0 ${typeStyle}`}>
                      {ev.type.toUpperCase()}
                    </span>

                    {/* Source → Target */}
                    <span className={`text-[9px] font-mono flex-shrink-0 ${sourceColor}`}>
                      {ev.source}
                    </span>
                    <ChevronRight className="h-2.5 w-2.5 text-white/10 flex-shrink-0" />
                    <span className={`text-[9px] font-mono flex-shrink-0 ${targetColor}`}>
                      {ev.target}
                    </span>

                    {/* Intent */}
                    <span className="text-[10px] font-mono text-white/60 truncate flex-1">
                      {ev.intent}
                    </span>

                    {/* Trace link */}
                    {ev.meta?.traceId && (
                      <button
                        onClick={() => setSelectedTraceId(
                          selectedTraceId === ev.meta?.traceId ? null : ev.meta?.traceId ?? null
                        )}
                        className="text-[8px] font-mono text-white/15 hover:text-ion transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                        title="View trace chain"
                      >
                        {ev.meta.traceId.slice(0, 10)}
                      </button>
                    )}

                    {/* Copy */}
                    {hasPayload && (
                      <button
                        onClick={() => copyPayload(ev.id, ev.payload)}
                        className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        {copied === ev.id ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-white/20 hover:text-white/50" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expanded payload for commands/responses */}
                  {hasPayload && ev.type !== "heartbeat" && (
                    <div className="mt-1 ml-[72px] pl-2 border-l border-white/5">
                      <pre className="text-[9px] font-mono text-white/30 max-h-[60px] overflow-hidden whitespace-pre-wrap truncate">
                        {JSON.stringify(ev.payload, null, 2).slice(0, 200)}
                      </pre>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
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
          <span className="text-[10px] text-white/15 font-mono">
            {events.length} total · {filteredEvents.length} visible
          </span>
        )}
      </div>
    </div>
  );
}
