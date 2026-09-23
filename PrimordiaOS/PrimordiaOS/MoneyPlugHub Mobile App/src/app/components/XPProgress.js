import { useState, useEffect, useCallback } from "react";
import { Share2, Users, CheckSquare } from "lucide-react";
import { NeonProgressBar } from "./NeonProgressBar";
import { Skeleton, RowSkeleton, ErrorState, EmptyState } from "./Skeleton";
import { fetchXPSummary, fetchXPRows } from "../../lib/api/mockData";
const iconMap = {
    share: { icon: Share2, color: "var(--semantic-color-accent-primary)" },
    referral: { icon: Users, color: "#a855f7" },
    quest: { icon: CheckSquare, color: "#00d4ff" },
};
export function XPProgress() {
    const [summary, setSummary] = useState(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [s, r] = await Promise.all([fetchXPSummary(), fetchXPRows()]);
            setSummary(s);
            setRows(r);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load XP data.");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);
    if (error)
        return <ErrorState message={error} onRetry={load}/>;
    const pct = summary
        ? Math.round((summary.currentXP / summary.levelXPGoal) * 100)
        : 0;
    return (<div className="flex flex-col gap-section px-layout pb-layout">

      {/* Card / XP_Summary */}
      <div className="rounded-card p-layout flex flex-col gap-stack shadow-card" style={{ background: "var(--semantic-color-background-card)", border: "1px solid rgba(57,255,20,0.25)" }}>

        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 600, color: "var(--semantic-color-text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          XP Summary
        </div>

        {/* Metric */}
        <div className="flex items-end gap-stack">
          {loading ? (<Skeleton height={48} width={120}/>) : (<>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 48, fontWeight: 700, color: "var(--semantic-color-accent-primary)", lineHeight: 1, textShadow: "0 0 24px rgba(57,255,20,0.5)" }}>
                {summary?.currentXP.toLocaleString()}
              </span>
              <div className="flex flex-col pb-1">
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 600, color: "var(--semantic-color-text-primary)" }}>XP</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-text-secondary)" }}>Level {summary?.level}</span>
              </div>
            </>)}
        </div>

        {/* Progress bar */}
        {loading
            ? <Skeleton height={8} radius={999}/>
            : <NeonProgressBar value={summary?.currentXP ?? 0} max={summary?.levelXPGoal ?? 5000} label={`Level ${summary?.level} → Level ${(summary?.level ?? 0) + 1}`} sublabel={`${summary?.currentXP.toLocaleString()} / ${summary?.levelXPGoal.toLocaleString()} XP`}/>}

        {/* Subtext */}
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-text-secondary)" }}>
          {loading ? <Skeleton height={12} width="70%"/> : (<>
              <span style={{ color: "var(--semantic-color-accent-primary)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                +{summary?.todayXP} XP
              </span>
              {" "}earned today · {summary?.xpToNextLevel.toLocaleString()} XP to next level
            </>)}
        </div>
      </div>

      {/* XP_List */}
      <div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 600, color: "var(--semantic-color-text-secondary)", marginBottom: "var(--primitive-spacing-sm)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Today's XP
        </div>

        <div className="flex flex-col rounded-card overflow-hidden" style={{ border: "1px solid var(--semantic-color-border-subtle)" }}>
          {loading ? (Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i}/>)) : rows.length === 0 ? (<EmptyState message="No XP events today yet."/>) : (rows.map(({ id, label, xp, iconType, timestamp }, i) => {
            const { icon: Icon, color } = iconMap[iconType] ?? iconMap.share;
            return (<div key={id} className="flex items-center gap-layout px-layout py-layout" style={{ background: "var(--semantic-color-background-card)", borderBottom: i < rows.length - 1 ? "1px solid var(--semantic-color-border-subtle)" : "none" }}>
                  <div className="w-10 h-10 rounded-input flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon size={18} color={color}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-sm)", color: "var(--semantic-color-text-primary)", fontWeight: 500 }}>{label}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-text-secondary)", marginTop: 2 }}>{timestamp}</div>
                  </div>
                  <div className="px-3 py-1 rounded-button flex-shrink-0" style={{ background: "rgba(57,255,20,0.1)", border: "1px solid rgba(57,255,20,0.25)" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 700, color: "var(--semantic-color-accent-primary)" }}>+{xp} XP</span>
                  </div>
                </div>);
        }))}
        </div>
      </div>
    </div>);
}
