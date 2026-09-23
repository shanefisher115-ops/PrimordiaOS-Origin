import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton, ErrorState, EmptyState } from "./Skeleton";
import { fetchLeaderboard } from "../../lib/api/mockData";
import type { LeaderboardEntry } from "../../lib/api/types";

type Tab = "Global" | "Friends";

const rankMeta: Record<number, { color: string; label: string; glow: string }> = {
  1: { color: "#f59e0b", label: "🥇", glow: "rgba(245,158,11,0.25)" },
  2: { color: "#A0A8B8", label: "🥈", glow: "rgba(160,168,184,0.15)" },
  3: { color: "#cd7f32", label: "🥉", glow: "rgba(205,127,50,0.2)" },
};

function Row({ entry }: { entry: LeaderboardEntry }) {
  const { rank, name, handle, xp, earned, change, avatar, isMe } = entry;
  const meta = rankMeta[rank] ?? { color: "var(--semantic-color-text-secondary)", label: `#${rank}`, glow: "none" };

  return (
    <div className="flex items-center gap-layout px-layout py-layout"
      style={{ background: isMe ? "rgba(57,255,20,0.06)" : "var(--semantic-color-background-card)", borderLeft: isMe ? "3px solid var(--semantic-color-accent-primary)" : "3px solid transparent" }}>
      <div className="w-6 flex-shrink-0 text-center">
        <span style={{ fontSize: 18 }}>{meta.label}</span>
      </div>
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: isMe ? "rgba(57,255,20,0.15)" : `${meta.color}18`, border: `2px solid ${isMe ? "var(--semantic-color-accent-primary)" : meta.color}`, boxShadow: `0 0 12px ${isMe ? "rgba(57,255,20,0.3)" : meta.glow}` }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: isMe ? "var(--semantic-color-accent-primary)" : meta.color }}>
          {avatar}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 700, color: isMe ? "var(--semantic-color-accent-primary)" : "var(--semantic-color-text-primary)" }}>
          {name}
          {isMe && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, color: "var(--semantic-color-accent-primary)", marginLeft: 6, background: "rgba(57,255,20,0.12)", border: "1px solid rgba(57,255,20,0.25)", borderRadius: 4, padding: "1px 5px", verticalAlign: "middle" }}>
              YOU
            </span>
          )}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-text-secondary)", marginTop: 2 }}>
          {handle} · {xp.toLocaleString()} XP
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 700, color: isMe ? "var(--semantic-color-accent-primary)" : "var(--semantic-color-text-primary)" }}>{earned}</span>
        <div className="flex items-center gap-1">
          {change > 0 ? <TrendingUp size={11} color="var(--semantic-color-accent-secondary)" /> : change < 0 ? <TrendingDown size={11} color="#ff3b5c" /> : <Minus size={11} color="var(--semantic-color-text-secondary)" />}
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: change > 0 ? "var(--semantic-color-accent-secondary)" : change < 0 ? "#ff3b5c" : "var(--semantic-color-text-secondary)" }}>
            {change > 0 ? `+${change}` : change < 0 ? change : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function RowLoading() {
  return (
    <div className="flex items-center gap-layout px-layout py-layout" style={{ background: "var(--semantic-color-background-card)", borderLeft: "3px solid transparent" }}>
      <Skeleton height={20} width={20} radius={4} />
      <Skeleton height={40} width={40} radius={999} />
      <div className="flex-1 flex flex-col gap-1">
        <Skeleton height={14} width="50%" />
        <Skeleton height={11} width="35%" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <Skeleton height={14} width={48} />
        <Skeleton height={11} width={28} />
      </div>
    </div>
  );
}

export function Leaderboard() {
  const [tab, setTab]           = useState<Tab>("Global");
  const [entries, setEntries]   = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await fetchLeaderboard(t === "Global" ? "global" : "friends"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  return (
    <div className="flex flex-col gap-section px-layout pb-layout">

      {/* Tabs / 2 */}
      <div className="flex p-1 rounded-input" style={{ background: "#0f1419" }}>
        {(["Global", "Friends"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 py-2.5 rounded-input transition-all"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: tab === t ? 700 : 400, background: tab === t ? "var(--semantic-color-background-card)" : "transparent", color: tab === t ? "var(--semantic-color-accent-primary)" : "var(--semantic-color-text-secondary)", border: tab === t ? "1px solid rgba(57,255,20,0.25)" : "1px solid transparent" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Leaderboard_List */}
      <div className="rounded-card overflow-hidden flex flex-col" style={{ border: "1px solid var(--semantic-color-border-subtle)" }}>
        {error ? (
          <ErrorState message={error} onRetry={() => load(tab)} />
        ) : loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ borderBottom: i < 2 ? "1px solid var(--semantic-color-border-subtle)" : "none" }}>
              <RowLoading />
            </div>
          ))
        ) : entries.length === 0 ? (
          <EmptyState message="No rankings available yet." />
        ) : (
          entries.map((entry, i) => (
            <div key={entry.handle} style={{ borderBottom: i < entries.length - 1 ? "1px solid var(--semantic-color-border-subtle)" : "none" }}>
              <Row entry={entry} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
