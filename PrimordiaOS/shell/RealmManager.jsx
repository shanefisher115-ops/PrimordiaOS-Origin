import React, { useState, useEffect, useRef } from "react";

export function RealmManager({ currentRealm = "schema", onLog }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {currentRealm === "schema" && <SchemaRealmView onLog={onLog} />}
      {currentRealm === "financial" && <FinancialRealmView onLog={onLog} />}
      {currentRealm === "agent" && <AgentRealmView onLog={onLog} />}
      {currentRealm === "memory" && <MemoryRealmView onLog={onLog} />}
      {currentRealm === "simulation" && <SimulationRealmView onLog={onLog} />}
    </div>
  );
}

// -------------------------------------------------------------
// 1. SCHEMA REALM (MULTI-ORM COMPILER & STUDIO)
// -------------------------------------------------------------
function SchemaRealmView({ onLog }) {
  const [lang, setLang] = useState("TypeScript");
  const [selectedEntity, setSelectedEntity] = useState("PulseNode");

  const entities = {
    PulseNode: {
      ts: "export interface PulseNode {\n  id: string;\n  bpm: number;\n  phase: number;\n  entropy: number;\n  active: boolean;\n}",
      pg: "CREATE TABLE pulse_nodes (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  bpm NUMERIC NOT NULL DEFAULT 120.0,\n  phase INT NOT NULL DEFAULT 1,\n  entropy FLOAT NOT NULL DEFAULT 0.884,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);",
      prisma: "model PulseNode {\n  id        String   @id @default(uuid())\n  bpm       Float    @default(120.0)\n  phase     Int      @default(1)\n  entropy   Float    @default(0.884)\n  createdAt DateTime @default(now())\n}",
      graphql: "type PulseNode {\n  id: ID!\n  bpm: Float!\n  phase: Int!\n  entropy: Float!\n}"
    },
    LedgerMatrix: {
      ts: "export interface LedgerMatrix {\n  hash: string;\n  balance: number;\n  flowRate: number;\n  sentinelScore: number;\n}",
      pg: "CREATE TABLE ledger_matrices (\n  hash VARCHAR(66) PRIMARY KEY,\n  balance NUMERIC(18, 2) NOT NULL,\n  flow_rate FLOAT NOT NULL,\n  sentinel_score FLOAT NOT NULL\n);",
      prisma: "model LedgerMatrix {\n  hash          String @id\n  balance       Float\n  flowRate      Float\n  sentinelScore Float\n}",
      graphql: "type LedgerMatrix {\n  hash: String!\n  balance: Float!\n  flowRate: Float!\n  sentinelScore: Float!\n}"
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.5rem" }}>
      <div style={panelStyle}>
        <h3 style={headerStyle}>📐 Entity Blueprints</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {Object.keys(entities).map((k) => (
            <button
              key={k}
              onClick={() => setSelectedEntity(k)}
              style={{
                padding: "0.75rem",
                background: selectedEntity === k ? "rgba(0, 240, 255, 0.15)" : "rgba(255, 255, 255, 0.03)",
                border: `1px solid ${selectedEntity === k ? "#00f0ff" : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: "6px",
                color: selectedEntity === k ? "#fff" : "#94a3b8",
                textAlign: "left",
                fontFamily: "monospace",
                cursor: "pointer"
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={headerStyle}>⚡ Multi-ORM Target Compiler</h3>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {["TypeScript", "PostgreSQL", "Prisma", "GraphQL"].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={btnStyle(lang === l ? "#00f0ff" : "#94a3b8")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <pre style={{ background: "rgba(0,0,0,0.6)", padding: "1.2rem", borderRadius: "6px", color: "#00ff88", fontFamily: "monospace", fontSize: "0.85rem", border: "1px solid rgba(0,240,255,0.2)" }}>
          {lang === "TypeScript" && entities[selectedEntity].ts}
          {lang === "PostgreSQL" && entities[selectedEntity].pg}
          {lang === "Prisma" && entities[selectedEntity].prisma}
          {lang === "GraphQL" && entities[selectedEntity].graphql}
        </pre>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. FINANCIAL REALM (DEX SWAP & DEPTH LIQUIDITY MATRIX)
// -------------------------------------------------------------
function FinancialRealmView({ onLog }) {
  const [balance, setBalance] = useState(4290120.00);
  const [swapAmount, setSwapAmount] = useState(10);
  const [fromToken, setFromToken] = useState("PULSE");
  const [toToken, setToToken] = useState("USDC");
  const depthCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = depthCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 160;

    // Draw Bid/Ask Depth Curves
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const mid = canvas.width / 2;

    // Green Bids
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x < mid; x += 10) {
      const y = canvas.height - Math.pow(x / mid, 2) * 120;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(mid, canvas.height);
    ctx.fillStyle = "rgba(0, 255, 136, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "#00ff88";
    ctx.stroke();

    // Red Asks
    ctx.beginPath();
    ctx.moveTo(mid, canvas.height);
    for (let x = mid; x < canvas.width; x += 10) {
      const y = canvas.height - Math.pow((canvas.width - x) / mid, 2) * 120;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255, 0, 85, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "#ff0055";
    ctx.stroke();
  }, []);

  const executeSwap = () => {
    const delta = fromToken === "PULSE" ? swapAmount * 1420 : -(swapAmount / 1420);
    setBalance(prev => prev + delta);
    if (onLog) onLog("DEX_ROUTER", `Swapped ${swapAmount} ${fromToken} -> ${toToken} on Quantum Liquidity Pool.`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        <div style={statBox}><small style={{ color: "#94a3b8" }}>PRIMARY LEDGER</small><div style={{ color: "#ffd700", fontSize: "1.3rem", fontWeight: "bold" }}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
        <div style={statBox}><small style={{ color: "#94a3b8" }}>PULSE / USDC</small><div style={{ color: "#00f0ff", fontSize: "1.3rem", fontWeight: "bold" }}>$1,424.50</div></div>
        <div style={statBox}><small style={{ color: "#94a3b8" }}>POOL DEPTH</small><div style={{ color: "#00ff88", fontSize: "1.3rem", fontWeight: "bold" }}>$84.2M TVL</div></div>
        <div style={statBox}><small style={{ color: "#94a3b8" }}>24H VOLUME</small><div style={{ color: "#ffd700", fontSize: "1.3rem", fontWeight: "bold" }}>$18.9M</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem" }}>
        {/* Swap Widget */}
        <div style={panelStyle}>
          <h3 style={headerStyle}>⚡ Quantum DEX Swap</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <small style={{ color: "#94a3b8" }}>YOU PAY</small>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="number"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(Number(e.target.value))}
                  style={{ ...inputStyle, width: "100%" }}
                />
                <button style={btnStyle("#00f0ff")}>{fromToken}</button>
              </div>
            </div>

            <div style={{ textAlign: "center", color: "#ffd700", cursor: "pointer" }} onClick={() => { setFromToken(toToken); setToToken(fromToken); }}>
              ⇅
            </div>

            <div>
              <small style={{ color: "#94a3b8" }}>YOU RECEIVE (EST.)</small>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ ...inputStyle, width: "100%", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center" }}>
                  {(swapAmount * (fromToken === "PULSE" ? 1424.50 : 1 / 1424.50)).toFixed(2)}
                </div>
                <button style={btnStyle("#00ff88")}>{toToken}</button>
              </div>
            </div>

            <button onClick={executeSwap} style={{ ...btnStyle("#00ff88"), padding: "0.75rem", marginTop: "0.5rem" }}>
              ⚡ EXECUTE SWAP
            </button>
          </div>
        </div>

        {/* Depth Chart */}
        <div style={panelStyle}>
          <h3 style={headerStyle}>📊 Liquidity Market Depth (Bids & Asks)</h3>
          <div style={{ width: "100%", height: "160px", background: "rgba(0,0,0,0.4)", borderRadius: "6px", overflow: "hidden" }}>
            <canvas ref={depthCanvasRef} style={{ width: "100%", height: "100%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. AGENT REALM (SWARM BATTLE COLOSSEUM)
// -------------------------------------------------------------
function AgentRealmView({ onLog }) {
  const [agents, setAgents] = useState([
    { id: 1, name: "Alpha-Synthesizer", hp: 92, power: 85, color: "#00f0ff" },
    { id: 2, name: "Aegis-Guardian", hp: 100, power: 74, color: "#ffd700" },
    { id: 3, name: "Chronos-Analyst", hp: 88, power: 90, color: "#8a2be2" },
    { id: 4, name: "Nexus-Router", hp: 95, power: 68, color: "#00ff88" }
  ]);
  const [battleLog, setBattleLog] = useState([
    "Alpha-Synthesizer launched state vector compilation attack!",
    "Aegis-Guardian deployed zero-knowledge defensive barrier.",
    "Chronos-Analyst executed temporal prediction lock."
  ]);

  const triggerBattleRound = () => {
    setAgents(prev => prev.map(a => ({
      ...a,
      hp: Math.max(20, Math.min(100, a.hp + (Math.random() - 0.45) * 15)),
      power: Math.max(10, Math.min(100, a.power + (Math.random() - 0.4) * 12))
    })));

    const lines = [
      "Alpha-Synthesizer amplified bandwidth +45k tokens/s.",
      "Aegis-Guardian parried unauthorized subnet ingress!",
      "Nexus-Router synchronized Unreal Engine bridge transforms.",
      "Chronos-Analyst rewound speculative state by 12 ticks."
    ];
    const pick = lines[Math.floor(Math.random() * lines.length)];
    setBattleLog(prev => [pick, ...prev.slice(0, 5)]);
    if (onLog) onLog("SWARM_COLOSSEUM", pick);
  };

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={headerStyle}>⚔️ Swarm Battle & Consensus Colosseum</h3>
        <button onClick={triggerBattleRound} style={btnStyle("#ff0055")}>⚡ TRIGGER BATTLE ROUND</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {agents.map((ag) => (
          <div key={ag.id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${ag.color}`, borderRadius: "8px", padding: "1rem" }}>
            <h4 style={{ margin: "0 0 0.5rem 0", color: ag.color }}>{ag.name}</h4>

            {/* HP Bar */}
            <div style={{ marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontFamily: "monospace", color: "#00ff88" }}>
                <span>SHIELD INTEGRITY:</span>
                <span>{ag.hp.toFixed(0)}%</span>
              </div>
              <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${ag.hp}%`, height: "100%", background: "#00ff88" }} />
              </div>
            </div>

            {/* Power Bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontFamily: "monospace", color: "#ffd700" }}>
                <span>QUANTUM POWER:</span>
                <span>{ag.power.toFixed(0)}%</span>
              </div>
              <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${ag.power}%`, height: "100%", background: "#ffd700" }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <h4 style={{ color: "#ffd700", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Live Combat & Deliberation Feed:</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontFamily: "monospace", fontSize: "0.8rem" }}>
        {battleLog.map((b, i) => (
          <div key={i} style={{ padding: "0.45rem", background: "rgba(0,0,0,0.35)", borderLeft: "3px solid #ff0055", borderRadius: "3px" }}>
            ● {b}
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. MEMORY REALM (VOLUMETRIC DOSSIER & TIME REWIND)
// -------------------------------------------------------------
function MemoryRealmView({ onLog }) {
  const [selectedDossier, setSelectedDossier] = useState({
    tag: "GENESIS_PULSE",
    hash: "0x89f2a7b...",
    epoch: "T-00:00",
    desc: "PrimordiaOS Initial Boot Ignition. All 5 realms bonded into global shell matrix."
  });

  const dossiers = [
    { tag: "GENESIS_PULSE", hash: "0x89f2a7b...", epoch: "T-00:00", desc: "PrimordiaOS Initial Boot Ignition. All 5 realms bonded into global shell matrix." },
    { tag: "COUNCIL_RATIFY", hash: "0x11a4c9e...", epoch: "T-04:12", desc: "Financial Intelligence Council elected active sentinels and approved $4.2M treasury baseline." },
    { tag: "UE5_SYNC", hash: "0x77d010f...", epoch: "T-08:45", desc: "Unreal Engine 5 Bridge WebSocket established. Physics subnets synchronized." }
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem" }}>
      <div style={panelStyle}>
        <h3 style={headerStyle}>🧠 Memory Holocron Dossiers</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {dossiers.map((d, i) => (
            <button
              key={i}
              onClick={() => setSelectedDossier(d)}
              style={{
                padding: "0.75rem",
                background: selectedDossier.tag === d.tag ? "rgba(0, 240, 255, 0.15)" : "rgba(255, 255, 255, 0.03)",
                border: `1px solid ${selectedDossier.tag === d.tag ? "#00f0ff" : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: "6px",
                color: selectedDossier.tag === d.tag ? "#fff" : "#94a3b8",
                textAlign: "left",
                fontFamily: "monospace",
                cursor: "pointer"
              }}
            >
              <div>{d.tag}</div>
              <small style={{ color: "#ffd700" }}>{d.epoch}</small>
            </button>
          ))}
        </div>
      </div>

      <div style={panelStyle}>
        <h3 style={headerStyle}>📜 Historical Memory Dossier Inspector</h3>
        <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#e2e8f0" }}>
          <div style={{ marginBottom: "0.75rem" }}><strong style={{ color: "#00f0ff" }}>TAG:</strong> {selectedDossier.tag}</div>
          <div style={{ marginBottom: "0.75rem" }}><strong style={{ color: "#ffd700" }}>BLOCK HASH:</strong> {selectedDossier.hash}</div>
          <div style={{ marginBottom: "0.75rem" }}><strong style={{ color: "#8a2be2" }}>EPOCH ANCHOR:</strong> {selectedDossier.epoch}</div>
          <div style={{ padding: "1rem", background: "rgba(0,0,0,0.5)", borderLeft: "3px solid #00f0ff", borderRadius: "4px", marginTop: "1rem" }}>
            {selectedDossier.desc}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. SIMULATION REALM (CELESTIAL 3D SOLAR HOLODECK)
// -------------------------------------------------------------
function SimulationRealmView({ onLog }) {
  const canvasRef = useRef(null);
  const [speed, setSpeed] = useState(1.0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let t = 0;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 380;

    const planets = [
      { r: 70, size: 6, color: "#00f0ff", speed: 0.03 },
      { r: 120, size: 9, color: "#ffd700", speed: 0.018 },
      { r: 170, size: 12, color: "#8a2be2", speed: 0.01 },
      { r: 220, size: 7, color: "#00ff88", speed: 0.007 }
    ];

    const ringParticles = Array.from({ length: 160 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const rad = 135 + (Math.random() - 0.5) * 25;
      return { angle, rad, speed: 0.015 + Math.random() * 0.01 };
    });

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.01 * speed;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Central Quantum Star
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd700";
      ctx.shadowBlur = 35;
      ctx.shadowColor = "#ffd700";
      ctx.fill();
      ctx.shadowBlur = 0;

      // Orbit Orbs
      planets.forEach((p) => {
        // Orbit Path
        ctx.beginPath();
        ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.stroke();

        const x = cx + Math.cos(t * p.speed * 60) * p.r;
        const y = cy + Math.sin(t * p.speed * 60) * (p.r * 0.45); // Perspective Tilt

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Planetary Particle Ring
      ringParticles.forEach((rp) => {
        rp.angle += rp.speed * speed;
        const rx = cx + Math.cos(rp.angle) * rp.rad;
        const ry = cy + Math.sin(rp.angle) * (rp.rad * 0.45);

        ctx.beginPath();
        ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 240, 255, 0.6)";
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [speed]);

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={headerStyle}>🪐 Celestial 3D Solar Holodeck</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#ffd700" }}>
          <span>ORBIT WARP:</span>
          <input
            type="range" min="0.2" max="3.0" step="0.1" value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{ width: "80px", accentColor: "#ffd700" }}
          />
          <span>{speed.toFixed(1)}x</span>
        </div>
      </div>
      <div style={{ width: "100%", height: "380px", background: "radial-gradient(circle, #080c24, #020308)", borderRadius: "8px", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STYLES
// -------------------------------------------------------------
const panelStyle = {
  background: "rgba(10, 14, 28, 0.75)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(0, 240, 255, 0.22)",
  borderRadius: "8px",
  padding: "1.5rem",
  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.6)"
};

const statBox = {
  background: "rgba(10, 14, 28, 0.75)",
  border: "1px solid rgba(0, 240, 255, 0.2)",
  borderRadius: "8px",
  padding: "1rem",
  fontFamily: "monospace"
};

const headerStyle = {
  margin: "0 0 1rem 0",
  fontSize: "1rem",
  letterSpacing: "1.5px",
  color: "#00f0ff",
  textTransform: "uppercase"
};

const inputStyle = {
  padding: "0.55rem 0.8rem",
  background: "rgba(0,0,0,0.5)",
  border: "1px solid rgba(0, 240, 255, 0.3)",
  borderRadius: "4px",
  color: "#fff",
  fontFamily: "monospace",
  fontSize: "0.85rem",
  outline: "none"
};

const btnStyle = (color) => ({
  padding: "0.45rem 0.9rem",
  background: "rgba(255, 255, 255, 0.05)",
  border: `1px solid ${color}`,
  color: color,
  borderRadius: "4px",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: "0.8rem",
  fontWeight: "bold"
});

export default RealmManager;
