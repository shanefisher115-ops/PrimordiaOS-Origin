import { Bell, Settings, Zap } from "lucide-react";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  showNotif?: boolean;
  onSettings?: () => void;
}

export function TopBar({ title = "MoneyPlugHub", subtitle, showNotif = true, onSettings }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-layout pt-12 pb-3 bg-bg-primary">
      <div className="flex items-center gap-stack">
        <div
          className="w-8 h-8 rounded-input flex items-center justify-center bg-accent-primary"
          style={{ boxShadow: "0 0 12px rgba(57,255,20,0.5)" }}
        >
          <Zap size={16} fill="var(--dt-bg-primary)" color="var(--dt-bg-primary)" />
        </div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-md)", fontWeight: 700, color: "var(--dt-text-primary)", letterSpacing: "-0.02em" }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>{subtitle}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-stack">
        {showNotif && (
          <div className="relative">
            <Bell size={20} color="var(--dt-text-secondary)" />
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center bg-accent-primary">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: "var(--dt-bg-primary)" }}>3</span>
            </div>
          </div>
        )}
        {onSettings && (
          <button onClick={onSettings}>
            <Settings size={20} color="var(--dt-text-secondary)" />
          </button>
        )}
      </div>
    </div>
  );
}
