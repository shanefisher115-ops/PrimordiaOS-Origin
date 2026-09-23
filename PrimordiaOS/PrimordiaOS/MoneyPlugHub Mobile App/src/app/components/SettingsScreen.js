import { ChevronRight, User, Plug, Zap, Bell, Database } from "lucide-react";
const items = [
    { id: "profile", icon: User, label: "Profile", sub: "plugmaster · Gold Tier · Level 7", iconColor: "var(--dt-accent-primary)", iconBg: "rgba(57,255,20,0.12)" },
    { id: "connected-apps", icon: Plug, label: "Connected Apps", sub: "Acorns, Rakuten, Honey · 3 linked", iconColor: "#00d4ff", iconBg: "rgba(0,212,255,0.12)" },
    { id: "automation-rules", icon: Zap, label: "Automation Rules", sub: "5 active rules running", iconColor: "#a855f7", iconBg: "rgba(168,85,247,0.12)" },
    { id: "notifications", icon: Bell, label: "Notifications", sub: "Push, Referral alerts, Reminders", iconColor: "#f59e0b", iconBg: "rgba(245,158,11,0.12)" },
    { id: "data-logs", icon: Database, label: "Data Logs", sub: "View all activity & audit history", iconColor: "var(--dt-text-secondary)", iconBg: "rgba(160,168,184,0.1)" },
];
export function SettingsScreen() {
    return (<div className="flex flex-col gap-section px-layout pb-layout">

      {/* Settings_List */}
      <div className="rounded-card overflow-hidden flex flex-col" style={{ border: "1px solid var(--dt-border-subtle)" }}>
        {items.map(({ id, icon: Icon, label, sub, iconColor, iconBg }, i) => (<button key={id} className="flex items-center gap-layout px-layout py-layout text-left transition-colors bg-bg-card active:bg-white/[0.03]" style={{ borderBottom: i < items.length - 1 ? "1px solid var(--dt-border-subtle)" : "none" }}>
            <div className="w-10 h-10 rounded-input flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
              <Icon size={18} color={iconColor}/>
            </div>

            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 600, color: "var(--dt-text-primary)" }}>
                {label}
              </div>
              <div className="truncate" style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", marginTop: 3 }}>
                {sub}
              </div>
            </div>

            <ChevronRight size={16} color="var(--dt-border-subtle)" className="flex-shrink-0"/>
          </button>))}
      </div>
    </div>);
}
