import { useState, useEffect } from "react";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import { Dashboard } from "./components/Dashboard";
import { XPProgress } from "./components/XPProgress";
import { Quests } from "./components/Quests";
import { Badges } from "./components/Badges";
import { Referral } from "./components/Referral";
import { AICommand } from "./components/AICommand";
import { Leaderboard } from "./components/Leaderboard";
import { SettingsScreen } from "./components/SettingsScreen";
import { DesignSystemPage } from "./components/DesignSystemPage";
import { ChevronLeft, Layers } from "lucide-react";

type BottomTab = "dashboard" | "leaderboard" | "quests" | "profile";
type Screen = BottomTab | "xp" | "badges" | "referral" | "ai" | "settings";

const NEON = "#39FF14";
const TEXT2 = "#A0A8B8";

const screenMeta: Record<Screen, { title: string; subtitle?: string; back?: boolean }> = {
  dashboard: { title: "MoneyPlugHub" },
  leaderboard: { title: "LEADERBOARD", subtitle: "Weekly Rankings" },
  quests: { title: "QUESTS", subtitle: "Daily & Weekly Missions" },
  profile: { title: "PROFILE", subtitle: "@plugmaster" },
  xp: { title: "XP PROGRESS", subtitle: "Level 7 → 8", back: true },
  badges: { title: "BADGES", subtitle: "3 of 9 Earned", back: true },
  referral: { title: "REFERRAL ENGINE", subtitle: "47 Active Refs", back: true },
  ai: { title: "AI COMMAND", subtitle: "Your Financial AI", back: true },
  settings: { title: "SETTINGS", back: true },
};


export default function App() {
  useEffect(() => {
    // Inject PWA meta tags dynamically (no access to index.html in this env)
    const tags: [string, Record<string, string>][] = [
      ["link", { rel: "manifest", href: "/manifest.json" }],
      ["meta", { name: "theme-color", content: "#050608" }],
      ["meta", { name: "apple-mobile-web-app-capable", content: "yes" }],
      ["meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }],
      ["meta", { name: "apple-mobile-web-app-title", content: "MoneyPlug" }],
      ["link", { rel: "apple-touch-icon", href: "/icons/icon-192.png" }],
    ];
    const added: Element[] = [];
    tags.forEach(([tag, attrs]) => {
      const key = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ");
      if (!document.head.querySelector(`${tag}[${Object.keys(attrs)[0]}="${Object.values(attrs)[0]}"]`)) {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        document.head.appendChild(el);
        added.push(el);
      }
    });
    return () => added.forEach((el) => el.remove());
  }, []);

  const [activeTab, setActiveTab] = useState<BottomTab>("dashboard");
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [showDS, setShowDS] = useState(false);

  const navigate = (s: string) => {
    setScreen(s as Screen);
  };

  const handleTabChange = (tab: BottomTab) => {
    setActiveTab(tab);
    setScreen(tab);
  };

  const handleBack = () => {
    const back = activeTab;
    setScreen(back);
  };

  const meta = screenMeta[screen];
  const isModal = meta.back;
  const isAI = screen === "ai";

  return (
    <div
      className="flex items-center justify-center w-full h-full"
      style={{ background: "#000" }}
    >
      {showDS && <DesignSystemPage onClose={() => setShowDS(false)} />}
      {/* Design System toggle — floats outside phone shell */}
      <button
        onClick={() => setShowDS(true)}
        className="fixed top-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-button"
        style={{ background: "rgba(57,255,20,0.1)", border: "1px solid rgba(57,255,20,0.3)", backdropFilter: "blur(8px)" }}
        title="Open Design System"
      >
        <Layers size={14} color="var(--dt-accent-primary)" />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 700, color: "var(--dt-accent-primary)" }}>Design System</span>
      </button>

      {/* Phone shell */}
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: "min(390px, 100vw)",
          height: "min(844px, 100vh)",
          background: "#050608",
          borderRadius: "min(40px, 0px)",
          boxShadow: "0 0 80px rgba(57,255,20,0.06), 0 0 0 1px #1A1F2A",
        }}
      >
        {/* Top bar */}
        <div style={{ flexShrink: 0 }}>
          {isModal ? (
            <div className="flex items-center gap-3 px-4 pt-12 pb-3" style={{ background: "#050608" }}>
              <button onClick={handleBack} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#0B0F14", border: "1px solid #1A1F2A" }}>
                <ChevronLeft size={18} color={TEXT2} />
              </button>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>
                  {meta.title}
                </div>
                {meta.subtitle && (
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: TEXT2 }}>{meta.subtitle}</div>
                )}
              </div>
            </div>
          ) : (
            <TopBar
              title={screen === "dashboard" ? "MoneyPlugHub" : meta.title}
              subtitle={meta.subtitle}
              showNotif={screen === "dashboard"}
              onSettings={screen === "profile" ? () => setScreen("settings") : undefined}
            />
          )}
        </div>

        {/* Profile sub-tabs */}
        {screen === "profile" && (
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="flex flex-col gap-3">
              {/* Profile hero */}
              <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: "#0B0F14", border: "1px solid #1A1F2A" }}>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(57,255,20,0.12)", border: "2px solid rgba(57,255,20,0.3)", boxShadow: "0 0 24px rgba(57,255,20,0.15)" }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: NEON }}>P</span>
                </div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: "#fff" }}>plugmaster</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: TEXT2 }}>Member since Jan 2024</div>
                  <div className="flex gap-2 mt-1">
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: NEON }}>Level 7</span>
                    <span style={{ color: "#1A1F2A" }}>·</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#f59e0b" }}>Gold Tier</span>
                  </div>
                </div>
              </div>
              {/* Profile action grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { screen: "badges", label: "My Badges", sub: "3 earned", emoji: "🏅" },
                  { screen: "referral", label: "Referrals", sub: "47 active", emoji: "👥" },
                  { screen: "ai", label: "AI Command", sub: "Ask anything", emoji: "🤖" },
                  { screen: "settings", label: "Settings", sub: "Account & more", emoji: "⚙️" },
                ].map(({ screen: s, label, sub, emoji }) => (
                  <button
                    key={s}
                    onClick={() => navigate(s)}
                    className="p-4 rounded-2xl text-left active:scale-95 transition-all"
                    style={{ background: "#0B0F14", border: "1px solid #1A1F2A" }}
                  >
                    <div className="text-2xl mb-2">{emoji}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: "#fff" }}>{label}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: TEXT2 }}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Screen content */}
        <div className={`flex-1 overflow-y-auto ${isAI ? "flex flex-col" : ""}`} style={{ scrollbarWidth: "none" }}>
          {screen === "dashboard" && <Dashboard onNavigate={navigate} />}
          {screen === "xp" && <XPProgress />}
          {screen === "quests" && <Quests />}
          {screen === "badges" && <Badges />}
          {screen === "referral" && <Referral />}
          {screen === "ai" && <AICommand />}
          {screen === "leaderboard" && <Leaderboard />}
          {screen === "settings" && <SettingsScreen />}
        </div>

        {/* Bottom nav — always shown */}
        <div style={{ flexShrink: 0 }}>
          <BottomNav active={activeTab} onChange={handleTabChange} />
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
