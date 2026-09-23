"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Command, ArrowRight, Globe, Zap,
  ChevronRight, X, Clock,
} from "lucide-react";
import { useRealmBusStore } from "@/lib/realmBusStore";
import type { RealmMessage } from "@/lib/realmBusClient";

// ─── Realm Badge Colors ─────────────────────────────────────

const REALM_COLORS: Record<string, string> = {
  system: "bg-[#27d8ff]/15 text-[#27d8ff] border-[#27d8ff]/30",
  cloud: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  simulation: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  agents: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  browser: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  gateway: "bg-white/10 text-white/50 border-white/20",
};

// ─── Component ──────────────────────────────────────────────

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<RealmMessage | null>(null);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { allIntents, connectionState, sendCommand } = useRealmBusStore();

  // ── Global Keyboard Shortcut ────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
        setLastResult(null);
      }

      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // ── Focus input when open ───────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ── Filter intents ──────────────────────────────────────

  const filteredIntents = useMemo(() => {
    if (!query.trim()) {
      // Show recent commands first, then all intents
      const recent = recentCommands
        .map((cmd) => {
          const found = allIntents.find((i) => i.intent === cmd);
          return found ? { ...found, isRecent: true } : null;
        })
        .filter((r): r is { intent: string; realmName: string; isRecent: boolean } => r !== null);

      const rest = allIntents
        .filter((i) => !recentCommands.includes(i.intent))
        .slice(0, 15)
        .map((i) => ({ ...i, isRecent: false }));

      return [...recent, ...rest];
    }

    const lower = query.toLowerCase();
    return allIntents
      .filter((i) =>
        i.intent.toLowerCase().includes(lower) ||
        i.realmName.toLowerCase().includes(lower)
      )
      .slice(0, 20)
      .map((i) => ({ ...i, isRecent: false }));
  }, [query, allIntents, recentCommands]);

  // ── Execute Intent ──────────────────────────────────────

  const executeIntent = useCallback(
    async (intent: string, realmName: string) => {
      if (isExecuting || connectionState !== "connected") return;

      setIsExecuting(true);
      setLastResult(null);

      // Parse payload from query (if user typed intent + JSON)
      let payload: unknown = {};
      const spaceIdx = query.indexOf(" ");
      if (spaceIdx > 0) {
        const payloadStr = query.slice(spaceIdx + 1).trim();
        try {
          payload = JSON.parse(payloadStr);
        } catch {
          payload = { input: payloadStr };
        }
      }

      try {
        const result = await sendCommand(realmName, intent, payload, { timeoutMs: 15_000 });
        setLastResult(result);

        // Track recent
        setRecentCommands((prev) => {
          const filtered = prev.filter((c) => c !== intent);
          return [intent, ...filtered].slice(0, 5);
        });
      } catch (err) {
        setLastResult({
          id: "error",
          type: "error",
          source: "browser",
          target: realmName,
          intent,
          payload: { error: err instanceof Error ? err.message : "Command failed" },
          timestamp: Date.now(),
        } as RealmMessage);
      }

      setIsExecuting(false);
    },
    [isExecuting, connectionState, query, sendCommand]
  );

  // ── Keyboard Navigation ─────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredIntents.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredIntents[selectedIndex];
        if (selected) {
          executeIntent(selected.intent, selected.realmName);
        }
      }
    },
    [filteredIntents, selectedIndex, executeIntent]
  );

  // ── Scroll selected into view ───────────────────────────

  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        onClick={() => setIsOpen(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Palette */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-[560px] rounded-2xl border border-white/12 bg-[#0c0e18]/98 backdrop-blur-2xl shadow-[0_32px_64px_rgba(0,0,0,0.8)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
            <Search className="h-4 w-4 text-white/30 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
                setLastResult(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search intents across all realms..."
              className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/20 outline-none font-mono"
              disabled={isExecuting}
            />
            <div className="flex items-center gap-1 text-[10px] text-white/20">
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono">
                {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}
              </kbd>
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono">K</kbd>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Connection Status */}
          {connectionState !== "connected" && (
            <div className="px-4 py-2 text-[10px] text-amber-400/80 bg-amber-500/5 border-b border-white/6">
              ⚠ Not connected to RealmBus — commands will fail
            </div>
          )}

          {/* Results */}
          <div
            ref={resultsRef}
            className="max-h-[320px] overflow-y-auto"
          >
            {filteredIntents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/20">
                {allIntents.length === 0
                  ? "No intents registered — connect to RealmBus first"
                  : `No intents matching "${query}"`}
              </div>
            ) : (
              filteredIntents.map((item, i) => {
                const isSelected = i === selectedIndex;
                const realmColor = REALM_COLORS[item.realmName] ?? REALM_COLORS.gateway;

                return (
                  <button
                    key={`${item.intent}-${i}`}
                    onClick={() => executeIntent(item.intent, item.realmName)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "bg-ion/8 border-l-2 border-ion"
                        : "border-l-2 border-transparent hover:bg-white/[0.03]"
                    }`}
                  >
                    <ChevronRight
                      className={`h-3 w-3 flex-shrink-0 ${
                        isSelected ? "text-ion" : "text-white/15"
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono ${isSelected ? "text-white/90" : "text-white/60"}`}>
                          {item.intent}
                        </span>
                        {item.isRecent && (
                          <Clock className="h-3 w-3 text-white/20" />
                        )}
                      </div>
                    </div>

                    <span className={`flex-shrink-0 text-[9px] font-bold rounded-full border px-2 py-0.5 ${realmColor}`}>
                      {item.realmName.toUpperCase()}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Result Output */}
          <AnimatePresence>
            {lastResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-white/8"
              >
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-3 w-3 text-ion" />
                    <span className="text-[10px] font-mono text-white/40">
                      {lastResult.intent}
                    </span>
                    <span className={`text-[10px] font-bold ${
                      lastResult.type === "error" ? "text-rose-400" : "text-emerald-400"
                    }`}>
                      {lastResult.type === "error" ? "ERROR" : "OK"}
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono text-white/60 max-h-[120px] overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(lastResult.payload, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/6 px-4 py-2">
            <div className="flex items-center gap-3 text-[9px] text-white/20">
              <span>↑↓ navigate</span>
              <span>↵ execute</span>
              <span>esc close</span>
            </div>
            <span className="text-[9px] text-white/15 font-mono">
              {allIntents.length} intents · {Object.keys(REALM_COLORS).length - 1} realms
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
