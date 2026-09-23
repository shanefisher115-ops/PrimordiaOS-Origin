import { Lock } from "lucide-react";

const badges = [
  { id: "referral-rookie",    name: "Referral Rookie",    desc: "First referral activated",    emoji: "🔗", color: "var(--dt-accent-primary)", colorRaw: "#39FF14", rarity: "Common",    unlocked: true  },
  { id: "cashflow-captain",   name: "Cashflow Captain",   desc: "Earned $500 lifetime",         emoji: "💸", color: "#00d4ff",                  colorRaw: "#00d4ff", rarity: "Rare",      unlocked: true  },
  { id: "plug-master",        name: "Plug Master",        desc: "Reached Level 7",              emoji: "⚡", color: "#a855f7",                  colorRaw: "#a855f7", rarity: "Epic",      unlocked: true  },
  { id: "automation-wizard",  name: "Automation Wizard",  desc: "50 AI commands used",          emoji: "🤖", color: "#f59e0b",                  colorRaw: "#f59e0b", rarity: "Rare",      unlocked: false },
  { id: "1k-earned",          name: "$1K Earned",         desc: "Hit $1,000 total earnings",    emoji: "💰", color: "#f59e0b",                  colorRaw: "#f59e0b", rarity: "Epic",      unlocked: false },
  { id: "streak-god",         name: "Streak God",         desc: "30-day login streak",          emoji: "🔥", color: "#ff3b5c",                  colorRaw: "#ff3b5c", rarity: "Legendary", unlocked: false },
];

const rarityColor: Record<string, string> = {
  Common:    "var(--dt-text-secondary)",
  Rare:      "#00d4ff",
  Epic:      "#a855f7",
  Legendary: "#f59e0b",
};

export function Badges() {
  return (
    <div className="flex flex-col gap-section px-layout pb-layout">

      {/* Title_Text */}
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xxl)", fontWeight: 700, color: "var(--dt-text-primary)", letterSpacing: "-0.03em" }}>
        Badges
      </div>

      {/* Badge_Grid */}
      <div className="grid grid-cols-2 gap-stack">
        {badges.map(({ id, name, desc, emoji, color, colorRaw, rarity, unlocked }) => (
          <div
            key={id}
            className="flex flex-col items-center gap-stack p-layout rounded-card bg-bg-card"
            style={{
              border: `1px solid ${unlocked ? `${colorRaw}35` : "var(--dt-border-subtle)"}`,
              boxShadow: unlocked ? `0 0 24px ${colorRaw}12` : "none",
            }}
          >
            <div
              className="relative w-16 h-16 rounded-card flex items-center justify-center"
              style={{
                background: unlocked ? `${colorRaw}18` : "#111519",
                border: `1px solid ${unlocked ? `${colorRaw}40` : "var(--dt-border-subtle)"}`,
                boxShadow: unlocked ? `0 0 20px ${colorRaw}30` : "none",
              }}
            >
              <span style={{ fontSize: 30, filter: unlocked ? "none" : "grayscale(1) opacity(0.25)" }}>{emoji}</span>
              {!unlocked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-card" style={{ background: "rgba(5,6,8,0.55)" }}>
                  <Lock size={18} color="var(--dt-text-secondary)" />
                </div>
              )}
            </div>

            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: unlocked ? "var(--dt-text-primary)" : "var(--dt-text-secondary)", textAlign: "center", letterSpacing: "-0.01em" }}>
              {name}
            </div>

            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", textAlign: "center", lineHeight: 1.4 }}>
              {desc}
            </div>

            <div className="px-2.5 py-0.5 rounded-button" style={{ background: `${rarityColor[rarity]}15`, border: `1px solid ${rarityColor[rarity]}30` }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: rarityColor[rarity], letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {rarity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
