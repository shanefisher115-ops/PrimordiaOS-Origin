import { LayoutDashboard, Trophy, Target, User } from "lucide-react";
const tabs = [
    { id: "dashboard", icon: LayoutDashboard, label: "Home" },
    { id: "quests", icon: Target, label: "Quests" },
    { id: "leaderboard", icon: Trophy, label: "Ranks" },
    { id: "profile", icon: User, label: "Profile" },
];
export function BottomNav({ active, onChange }) {
    return (<div className="flex items-center justify-around px-layout pb-8 pt-3 bg-bg-card" style={{ borderTop: "1px solid var(--dt-border-subtle)" }}>
      {tabs.map(({ id, icon: Icon, label }) => {
            const isActive = active === id;
            return (<button key={id} onClick={() => onChange(id)} className="flex flex-col items-center gap-1 min-w-[56px] transition-all">
            <div className="w-10 h-10 rounded-input flex items-center justify-center transition-all" style={{
                    background: isActive ? "rgba(57,255,20,0.12)" : "transparent",
                    boxShadow: isActive ? "0 0 16px rgba(57,255,20,0.2)" : "none",
                }}>
              <Icon size={20} color={isActive ? "var(--dt-accent-primary)" : "var(--dt-text-secondary)"} style={{ filter: isActive ? "drop-shadow(0 0 6px rgba(57,255,20,0.7))" : "none" }}/>
            </div>
            <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "var(--dt-fs-xs)",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--dt-accent-primary)" : "var(--dt-text-secondary)",
                    letterSpacing: "0.04em",
                }}>
              {label}
            </span>
          </button>);
        })}
    </div>);
}
