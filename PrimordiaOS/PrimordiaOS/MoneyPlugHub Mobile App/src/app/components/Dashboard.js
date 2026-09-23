import { useState, useEffect, useCallback } from "react";
import { TrendingUp, DollarSign, Users, Flame, ChevronRight, Star, Bolt } from "lucide-react";
import { NeonProgressBar } from "./NeonProgressBar";
import { Skeleton, CardSkeleton, ErrorState } from "./Skeleton";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { fetchDashboardStats, fetchEarnings, fetchXPSummary, } from "../../lib/api/mockData";
export function Dashboard({ onNavigate }) {
    const [activeTab, setActiveTab] = useState("week");
    const [stats, setStats] = useState(null);
    const [earnings, setEarnings] = useState([]);
    const [xp, setXP] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [s, e, x] = await Promise.all([
                fetchDashboardStats(),
                fetchEarnings(),
                fetchXPSummary(),
            ]);
            setStats(s);
            setEarnings(e);
            setXP(x);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load dashboard.");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);
    if (error) {
        return <ErrorState message={error} onRetry={load}/>;
    }
    return (<div className="flex flex-col gap-section px-layout pb-layout">

      {/* Greeting + XP pill */}
      <div className="flex items-center justify-between mt-2">
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-text-secondary)" }}>Good evening,</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xxl)", fontWeight: 700, color: "var(--semantic-color-text-primary)", letterSpacing: "-0.03em" }}>
            @plugmaster
          </div>
        </div>
        <button onClick={() => onNavigate("xp")} className="flex items-center gap-stack px-3 py-1.5 rounded-button" style={{ background: "rgba(57,255,20,0.1)", border: "1px solid rgba(57,255,20,0.3)" }}>
          <Star size={13} fill="var(--semantic-color-accent-primary)" color="var(--semantic-color-accent-primary)"/>
          {loading
            ? <Skeleton height={12} width={60}/>
            : <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: "var(--semantic-color-accent-primary)" }}>
                {xp?.currentXP.toLocaleString()} XP
              </span>}
        </button>
      </div>

      {/* Stats grid */}
      {loading ? (<div className="grid grid-cols-2 gap-stack">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} rows={1}/>)}
        </div>) : (<div className="grid grid-cols-2 gap-stack">
          {[
                { label: "Total Earned", value: stats?.totalEarned, icon: DollarSign, delta: "+12.4%" },
                { label: "Active Refs", value: stats?.activeRefs, icon: Users, delta: "+3 today" },
                { label: "Streak", value: `${stats?.streakDays ?? 0}d`, icon: Flame, delta: "🔥 on fire" },
                { label: "Rank", value: `#${stats?.rank ?? "—"}`, icon: TrendingUp, delta: `↑ ${stats?.rankDelta ?? 0} spots` },
            ].map(({ label, value, icon: Icon, delta }) => (<div key={label} className="p-layout rounded-card flex flex-col gap-stack" style={{ background: "var(--semantic-color-background-card)", border: "1px solid var(--semantic-color-border-subtle)" }}>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-text-secondary)", letterSpacing: "0.04em" }}>{label}</span>
                <Icon size={14} color="var(--semantic-color-accent-primary)"/>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xl)", fontWeight: 700, color: "var(--semantic-color-text-primary)" }}>{value}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-accent-secondary)" }}>{delta}</div>
            </div>))}
        </div>)}

      {/* Earnings chart */}
      <div className="rounded-card p-layout shadow-card" style={{ background: "var(--semantic-color-background-card)", border: "1px solid var(--semantic-color-border-subtle)" }}>
        <div className="flex items-center justify-between mb-4">
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 600, color: "var(--semantic-color-text-primary)" }}>Earnings</div>
          <div className="flex gap-1">
            {["today", "week", "month"].map((t) => (<button key={t} onClick={() => setActiveTab(t)} className="px-2 py-1 rounded-input transition-all" style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", fontWeight: activeTab === t ? 600 : 400, background: activeTab === t ? "rgba(57,255,20,0.15)" : "transparent", color: activeTab === t ? "var(--semantic-color-accent-primary)" : "var(--semantic-color-text-secondary)", border: activeTab === t ? "1px solid rgba(57,255,20,0.3)" : "1px solid transparent" }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>))}
          </div>
        </div>

        <div className="h-28" style={{ minHeight: 112 }}>
          {loading ? (<div className="flex items-end gap-1 h-full px-2">
              {Array.from({ length: 7 }).map((_, i) => (<Skeleton key={i} width="14%" height={`${30 + Math.random() * 50}%`} radius={4}/>))}
            </div>) : (<ResponsiveContainer width="100%" height={112}>
              <AreaChart data={earnings}>
                <defs>
                  <linearGradient id="neonGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#39FF14" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#39FF14" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ background: "var(--semantic-color-background-card)", border: "1px solid var(--semantic-color-border-subtle)", borderRadius: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} labelStyle={{ color: "var(--semantic-color-text-secondary)" }} itemStyle={{ color: "var(--semantic-color-accent-primary)" }} formatter={(v) => [`$${v}`, "Earned"]}/>
                <Area type="monotone" dataKey="value" stroke="#39FF14" strokeWidth={2} fill="url(#neonGrad)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>)}
        </div>

        <div className="mt-2">
          {loading ? (<Skeleton height={28} width="45%"/>) : (<div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xl)", fontWeight: 700, color: "var(--semantic-color-text-primary)" }}>
              {stats?.weeklyEarnings}
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-accent-secondary)", marginLeft: 8 }}>
                {stats?.weeklyDelta} this week
              </span>
            </div>)}
        </div>
      </div>

      {/* XP strip */}
      <div className="rounded-card p-layout" style={{ background: "var(--semantic-color-background-card)", border: "1px solid var(--semantic-color-border-subtle)" }}>
        <div className="flex items-center justify-between mb-3">
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 600, color: "var(--semantic-color-text-primary)" }}>XP Progress</div>
          <button onClick={() => onNavigate("xp")} className="flex items-center gap-1">
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-text-secondary)" }}>
              {xp ? `Level ${xp.level}` : "—"}
            </span>
            <ChevronRight size={14} color="var(--semantic-color-text-secondary)"/>
          </button>
        </div>
        {loading ? <Skeleton height={8} radius={999}/> : (<NeonProgressBar value={xp?.currentXP ?? 0} max={xp?.levelXPGoal ?? 5000} label={`${xp?.currentXP.toLocaleString()} / ${xp?.levelXPGoal.toLocaleString()} XP to Level ${(xp?.level ?? 0) + 1}`} sublabel={`${Math.round(((xp?.currentXP ?? 0) / (xp?.levelXPGoal ?? 1)) * 100)}%`}/>)}
      </div>

      {/* Quick actions */}
      <div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 600, color: "var(--semantic-color-text-secondary)", marginBottom: "var(--primitive-spacing-sm)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Quick Actions
        </div>
        <div className="grid grid-cols-2 gap-stack">
          {[
            { label: "Daily Quest", sub: "3 remaining", raw: "#39FF14", screen: "quests" },
            { label: "Refer Friend", sub: "+500 XP each", raw: "#a855f7", screen: "referral" },
            { label: "AI Command", sub: "Ask anything", raw: "#00d4ff", screen: "ai" },
            { label: "Badges", sub: "2 unlocked", raw: "#f59e0b", screen: "badges" },
        ].map(({ label, sub, raw, screen }) => (<button key={label} onClick={() => onNavigate(screen)} className="p-layout rounded-card text-left transition-all active:scale-95" style={{ background: "var(--semantic-color-background-card)", border: "1px solid var(--semantic-color-border-subtle)" }}>
              <div className="w-8 h-8 rounded-input flex items-center justify-center mb-3" style={{ background: `${raw}20` }}>
                <Bolt size={16} color={raw}/>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 600, color: "var(--semantic-color-text-primary)" }}>{label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--semantic-color-text-secondary)", marginTop: 2 }}>{sub}</div>
            </button>))}
        </div>
      </div>
    </div>);
}
