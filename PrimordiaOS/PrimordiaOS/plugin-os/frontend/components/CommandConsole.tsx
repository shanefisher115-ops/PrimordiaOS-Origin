"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, ChevronRight, Copy, Check, Zap } from "lucide-react";
import { executePURLCommand, getAvailableIntents } from "@/lib/purlRuntime";
import type { PURLResult } from "@/lib/purlRuntime";

// ─── Types ──────────────────────────────────────────────────

interface HistoryEntry {
  command: string;
  result: PURLResult;
}

// ─── Command Console Component ──────────────────────────────

export function CommandConsole() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const availableIntents = getAvailableIntents();

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Parse Command ───────────────────────────────────────
  const parseCommand = useCallback((raw: string): { intent: string; payload: Record<string, unknown> } => {
    const trimmed = raw.trim();
    const spaceIndex = trimmed.indexOf(" ");

    if (spaceIndex === -1) {
      return { intent: trimmed, payload: {} };
    }

    const intent = trimmed.slice(0, spaceIndex);
    const payloadStr = trimmed.slice(spaceIndex + 1).trim();

    try {
      const payload = JSON.parse(payloadStr);
      return { intent, payload };
    } catch {
      // If not valid JSON, treat as a simple key-value
      return { intent, payload: { input: payloadStr } };
    }
  }, []);

  // ── Execute Command ─────────────────────────────────────
  const handleExecute = useCallback(async () => {
    if (!input.trim() || isExecuting) return;

    const { intent, payload } = parseCommand(input);
    setIsExecuting(true);

    try {
      const result = await executePURLCommand(intent, payload);
      setHistory((prev) => [...prev, { command: input, result }]);
    } catch {
      // Fallback error
      setHistory((prev) => [
        ...prev,
        {
          command: input,
          result: {
            traceId: "error",
            intent,
            engineRoute: null,
            status: "ERROR" as const,
            executionTimeMs: 0,
            payload: { message: "Console execution failed" },
            violations: [],
            timestamp: Date.now(),
          },
        },
      ]);
    }

    setInput("");
    setHistoryIndex(-1);
    setIsExecuting(false);
  }, [input, isExecuting, parseCommand]);

  // ── Keyboard Navigation ─────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleExecute();
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (history.length === 0) return;
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]?.command ?? "");
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex <= 0) {
          setHistoryIndex(-1);
          setInput("");
          return;
        }
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]?.command ?? "");
      }
    },
    [handleExecute, history, historyIndex]
  );

  // ── Copy JSON ───────────────────────────────────────────
  const copyToClipboard = useCallback((traceId: string, data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(traceId);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  // ── Status Color ────────────────────────────────────────
  const statusColor = (status: string) => {
    if (status === "OK") return "text-emerald-400";
    if (status === "ERROR") return "text-rose-400";
    if (status === "BLOCKED") return "text-amber-400";
    return "text-white/60";
  };

  const statusGlow = (status: string) => {
    if (status === "OK") return "shadow-[0_0_12px_rgba(52,211,153,0.3)]";
    if (status === "ERROR") return "shadow-[0_0_12px_rgba(251,113,133,0.3)]";
    if (status === "BLOCKED") return "shadow-[0_0_12px_rgba(251,191,36,0.3)]";
    return "";
  };

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-[#0a0c14]/95 backdrop-blur-xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-ion" />
          <span className="text-sm font-semibold tracking-wide text-white/90">
            Command Console
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span>{history.length} commands</span>
          <span>·</span>
          <span>{availableIntents.length} intents</span>
        </div>
      </div>

      {/* ── Output Window ──────────────────────────────────── */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed"
        style={{ minHeight: "280px", maxHeight: "480px" }}
      >
        {history.length === 0 && (
          <div className="text-white/30 space-y-1">
            <p>PrimordiaOS Command Console v1.0</p>
            <p>Type an intent to execute. Example: <span className="text-ion/70">simulation.run</span></p>
            <p className="mt-2">Available intents:</p>
            {availableIntents.map((intent) => (
              <p key={intent} className="pl-4 text-white/20">
                <span className="text-aether/50">→</span> {intent}
              </p>
            ))}
          </div>
        )}

        <AnimatePresence>
          {history.map((entry, i) => (
            <motion.div
              key={entry.result.traceId + "-" + i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-4"
            >
              {/* Command line */}
              <div className="flex items-center gap-2 text-white/60">
                <ChevronRight className="h-3 w-3 text-ion" />
                <span className="text-white/90">{entry.command}</span>
              </div>

              {/* Result */}
              <div className={`mt-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 ${statusGlow(entry.result.status)}`}>
                {/* Status bar */}
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${statusColor(entry.result.status)}`}>
                      {entry.result.status}
                    </span>
                    {entry.result.engineRoute && (
                      <span className="text-white/40">
                        → {entry.result.engineRoute}
                      </span>
                    )}
                    <span className="text-white/30">
                      {entry.result.executionTimeMs}ms
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/20 font-mono text-[10px]">
                      {entry.result.traceId}
                    </span>
                    <button
                      onClick={() => copyToClipboard(entry.result.traceId, entry.result)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      {copied === entry.result.traceId ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3 text-white/30" />
                      )}
                    </button>
                  </div>
                </div>

                {/* JSON Output */}
                <pre className="text-xs text-white/70 overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(entry.result.payload, null, 2)}
                </pre>

                {/* Violations */}
                {entry.result.violations.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {entry.result.violations.map((v, vi) => (
                      <div
                        key={vi}
                        className="text-[11px] text-amber-400/80 bg-amber-500/10 rounded px-2 py-1"
                      >
                        ⚠ {v}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Input Area ─────────────────────────────────────── */}
      <div className="border-t border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-ion flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter intent..."
            className="flex-1 bg-transparent font-mono text-sm text-white/90 placeholder:text-white/25 outline-none"
            disabled={isExecuting}
          />
          {isExecuting && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="h-4 w-4 text-ion" />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
