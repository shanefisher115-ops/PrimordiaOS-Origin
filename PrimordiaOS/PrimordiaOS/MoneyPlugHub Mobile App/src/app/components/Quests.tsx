import { useState } from "react";
import { CheckCircle2, Clock, Zap } from "lucide-react";
import { NeonProgressBar } from "./NeonProgressBar";

type Tab = "Daily" | "Weekly" | "Monthly";

const questData: Record<Tab, { id: string; title: string; desc: string; xp: number; progress: number; max: number; status: "completed" | "active" | "locked"; timeLeft: string }[]> = {
  Daily: [
    { id: "d1", title: "Share Content",    desc: "Post your referral link on any platform",  xp: 100,  progress: 1, max: 1,  status: "completed", timeLeft: "Completed" },
    { id: "d2", title: "Log a Referral",   desc: "Refer 1 new user to MoneyPlugHub",          xp: 50,   progress: 0, max: 1,  status: "active",    timeLeft: "14h left" },
    { id: "d3", title: "Complete a Quest", desc: "Finish any active quest today",             xp: 100,  progress: 0, max: 1,  status: "locked",    timeLeft: "Unlocks at 5 PM" },
  ],
  Weekly: [
    { id: "w1", title: "Network Builder",  desc: "Recruit 10 active referrals this week",    xp: 1000, progress: 7,  max: 10, status: "active", timeLeft: "4d left" },
    { id: "w2", title: "Content Streak",   desc: "Share content 5 days in a row",            xp: 500,  progress: 3,  max: 5,  status: "active", timeLeft: "4d left" },
    { id: "w3", title: "Top Earner",       desc: "Crack the weekly leaderboard top 10",      xp: 2000, progress: 23, max: 10, status: "locked", timeLeft: "Rank #23 now" },
  ],
  Monthly: [
    { id: "m1", title: "Century Club",     desc: "Earn $100 in a single month",              xp: 3000, progress: 74, max: 100, status: "active", timeLeft: "17d left" },
    { id: "m2", title: "Plug Army",        desc: "Build a network of 50 referrals",          xp: 5000, progress: 47, max: 50,  status: "active", timeLeft: "17d left" },
    { id: "m3", title: "AI Commander",     desc: "Use AI Command Center 50 times",           xp: 1500, progress: 12, max: 50,  status: "active", timeLeft: "17d left" },
  ],
};

export function Quests() {
  const [tab, setTab] = useState<Tab>("Daily");
  const quests = questData[tab];

  return (
    <div className="flex flex-col gap-section px-layout pb-layout">

      {/* Tabs / 3 */}
      <div className="flex p-1 rounded-input" style={{ background: "#0f1419" }}>
        {(["Daily", "Weekly", "Monthly"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 rounded-input transition-all"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "var(--dt-fs-xs)",
              fontWeight: tab === t ? 700 : 400,
              background: tab === t ? "var(--dt-bg-card)" : "transparent",
              color: tab === t ? "var(--dt-accent-primary)" : "var(--dt-text-secondary)",
              border: tab === t ? "1px solid rgba(57,255,20,0.25)" : "1px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Quest_List */}
      <div className="flex flex-col gap-stack">
        {quests.map(({ id, title, desc, xp, progress, max, status, timeLeft }) => {
          const isCompleted = status === "completed";
          const isLocked    = status === "locked";

          return (
            <div
              key={id}
              className="rounded-card p-layout flex flex-col gap-stack bg-bg-card"
              style={{
                border: `1px solid ${isCompleted ? "rgba(57,255,20,0.3)" : "var(--dt-border-subtle)"}`,
                boxShadow: isCompleted ? "var(--dt-shadow-card)" : "none",
                opacity: isLocked ? 0.55 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-stack">
                <div className="flex items-start gap-stack">
                  <div className="mt-0.5 flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 size={20} color="var(--dt-accent-primary)" fill="rgba(57,255,20,0.15)" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 mt-0.5" style={{ borderColor: isLocked ? "var(--dt-border-subtle)" : "#2a3040" }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 700, color: isCompleted ? "var(--dt-accent-primary)" : "var(--dt-text-primary)", letterSpacing: "-0.01em" }}>
                      {title}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", marginTop: 3, lineHeight: 1.5 }}>
                      {desc}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-button flex-shrink-0" style={{ background: isCompleted ? "rgba(57,255,20,0.12)" : "var(--dt-border-subtle)", border: `1px solid ${isCompleted ? "rgba(57,255,20,0.3)" : "var(--dt-border-subtle)"}` }}>
                  <Zap size={10} color="var(--dt-accent-primary)" fill="var(--dt-accent-primary)" />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: "var(--dt-accent-primary)" }}>+{xp}</span>
                </div>
              </div>

              <NeonProgressBar
                value={progress}
                max={max}
                label={isCompleted ? "Complete!" : `${progress} / ${max}`}
                color={isCompleted ? "var(--dt-accent-primary)" : "var(--dt-accent-secondary)"}
              />

              <div className="flex items-center gap-1.5">
                <Clock size={11} color={isCompleted ? "var(--dt-accent-primary)" : "var(--dt-text-secondary)"} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: isCompleted ? "var(--dt-accent-primary)" : "var(--dt-text-secondary)" }}>
                  {timeLeft}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
