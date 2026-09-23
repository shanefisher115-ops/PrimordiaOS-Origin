import { useState } from "react";
import { Play, ChevronRight, Terminal } from "lucide-react";

const commands = [
  { cmd: "/optimize referrals", desc: "Maximize your referral conversion rate" },
  { cmd: "/generate content",   desc: "Create shareable posts for your links" },
  { cmd: "/track reward",       desc: "Check status of pending rewards" },
  { cmd: "/find best promo",    desc: "Surface highest-paying offers now" },
  { cmd: "/post automation",    desc: "Schedule and automate your content" },
];

const terminalLines = [
  "Referral strategy optimized!",
  "5 new leads found!",
  "Content batch ready to post!",
];

export function AICommand() {
  const [input, setInput]   = useState("/optimize referrals");
  const [running, setRunning] = useState(false);
  const [ran, setRan]         = useState(true);

  const handleRun = () => {
    if (running || !input.trim()) return;
    setRunning(true);
    setRan(false);
    setTimeout(() => { setRunning(false); setRan(true); }, 1400);
  };

  const selectCommand = (cmd: string) => { setInput(cmd); setRan(false); };

  return (
    <div className="flex flex-col gap-section px-layout pb-layout">

      {/* Card / CommandInput */}
      <div className="rounded-card p-layout flex flex-col gap-stack bg-bg-card shadow-card" style={{ border: "1px solid rgba(57,255,20,0.2)" }}>

        {/* Label_Text */}
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)", letterSpacing: "0.02em" }}>
          Run a command
        </div>

        {/* Input_Field */}
        <div className="flex items-center gap-stack" style={{ background: "#0f1419", border: "1px solid rgba(57,255,20,0.2)", borderRadius: "var(--dt-radius-input)", padding: "12px 16px" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", color: "var(--dt-accent-primary)" }}>&gt;</span>
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setRan(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleRun()}
            placeholder="/type a command..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", color: "var(--dt-text-primary)", caretColor: "var(--dt-accent-primary)" }}
          />
          {running && <div className="w-2 h-4 rounded-sm" style={{ background: "var(--dt-accent-primary)", animation: "blink 1s step-end infinite" }} />}
        </div>

        {/* Button_Run */}
        <button
          onClick={handleRun}
          disabled={running || !input.trim()}
          className={`w-full ${running ? "dt-btn-secondary" : "dt-btn-primary"}`}
          style={{ opacity: !input.trim() ? 0.5 : 1, ...(running ? { background: "rgba(57,255,20,0.08)", boxShadow: "none" } : {}) }}
        >
          <Play size={15} color={running ? "var(--dt-accent-primary)" : "var(--dt-bg-primary)"} fill={running ? "none" : "var(--dt-bg-primary)"} />
          {running ? "Running..." : "Run"}
        </button>
      </div>

      {/* Command_List */}
      <div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 600, color: "var(--dt-text-secondary)", marginBottom: "var(--dt-spacing-sm)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Commands
        </div>
        <div className="flex flex-col rounded-card overflow-hidden" style={{ border: "1px solid var(--dt-border-subtle)" }}>
          {commands.map(({ cmd, desc }, i) => {
            const isActive = input === cmd;
            return (
              <button
                key={cmd}
                onClick={() => selectCommand(cmd)}
                className="flex items-center gap-stack px-layout py-stack text-left transition-colors bg-bg-card"
                style={{
                  borderBottom: i < commands.length - 1 ? "1px solid var(--dt-border-subtle)" : "none",
                  borderLeft: isActive ? `2px solid var(--dt-accent-primary)` : "2px solid transparent",
                  background: isActive ? "rgba(57,255,20,0.07)" : undefined,
                }}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", fontWeight: 600, color: isActive ? "var(--dt-accent-primary)" : "var(--dt-text-primary)", flex: "0 0 auto" }}>
                  {cmd}
                </span>
                <span className="flex-1 truncate" style={{ fontFamily: "'Inter', sans-serif", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>
                  — {desc}
                </span>
                <ChevronRight size={14} color={isActive ? "var(--dt-accent-primary)" : "var(--dt-border-subtle)"} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Terminal_Output */}
      <div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", fontWeight: 600, color: "var(--dt-text-secondary)", marginBottom: "var(--dt-spacing-sm)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Output
        </div>
        <div className="rounded-card p-layout flex flex-col gap-stack" style={{ background: "#020304", border: "1px solid var(--dt-border-subtle)", minHeight: 120 }}>
          <div className="flex items-center gap-stack pb-stack" style={{ borderBottom: "1px solid var(--dt-border-subtle)" }}>
            <Terminal size={12} color="var(--dt-text-secondary)" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-xs)", color: "var(--dt-text-secondary)" }}>moneyhub-ai ~ output</span>
            <div className="flex gap-1.5 ml-auto">
              {["#ff5f57","#febc2e","#28c840"].map((c) => (
                <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
              ))}
            </div>
          </div>

          {ran ? (
            <div className="flex flex-col gap-stack">
              {terminalLines.map((text, i) => (
                <div key={i} className="flex items-start gap-stack">
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", color: "var(--dt-accent-primary)", flexShrink: 0 }}>✓</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", color: "var(--dt-accent-primary)", animation: `fadeIn 0.3s ease ${i * 0.15}s both` }}>{text}</span>
                </div>
              ))}
              <div className="flex items-center gap-stack mt-1">
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", color: "var(--dt-text-secondary)" }}>&gt;</span>
                <div className="w-2 h-4 rounded-sm" style={{ background: "var(--dt-accent-primary)", animation: "blink 1s step-end infinite" }} />
              </div>
            </div>
          ) : running ? (
            <div className="flex flex-col gap-stack">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", color: "var(--dt-text-secondary)" }}>$ running {input}...</span>
              <div className="flex gap-1 mt-1">
                {[0,1,2].map((j) => (
                  <div key={j} className="w-2 h-2 rounded-full" style={{ background: "var(--dt-accent-primary)", animation: `pulse 0.9s ease-in-out ${j * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          ) : (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "var(--dt-fs-sm)", color: "var(--dt-text-secondary)" }}>
              &gt; select a command and press Run
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink   { 0%,100%{opacity:1}50%{opacity:0} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
}
