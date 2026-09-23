import React, { useState, useEffect, useRef } from "react";
import { RealmManager } from "./RealmManager.jsx";
import { GlobalPulse } from "./GlobalPulse.js";
import { transitionToRealm } from "../hud/transitions/orchestrator.js";

export function PrimordiaShell() {
  const [currentRealm, setCurrentRealm] = useState("schema");
  const [bpm, setBpm] = useState(120);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isWarping, setIsWarping] = useState(false);
  const warpCanvasRef = useRef(null);
  const spectrumCanvasRef = useRef(null);
  const radarCanvasRef = useRef(null);

  const [logs, setLogs] = useState([
    { id: 1, source: "KERNEL", msg: "PrimordiaOS Omni-Singularity v7.0 online.", time: "11:15:00" }
  ]);

  const realms = ["schema", "financial", "agent", "memory", "simulation"];

  const handleLog = (source, msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ id: Date.now(), source, msg, time }, ...prev.slice(0, 35)]);
  };

  const handleRealmSelect = (realm) => {
    if (realm === currentRealm) return;
    setIsWarping(true);
    handleLog("WARP_PORTAL", `Initiating superluminal warp jump to ${realm.toUpperCase()} Realm`);

    setTimeout(() => {
      transitionToRealm(realm, (next) => {
        setCurrentRealm(next);
      });
      setTimeout(() => {
        setIsWarping(false);
      }, 400);
    }, 450);
  };

  // 64-Bar Audio Spectrum Visualizer
  useEffect(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 24;
      const w = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        const h = soundEnabled ? (Math.sin(Date.now() * 0.01 + i * 0.4) * 0.5 + 0.5) * canvas.height : 2;
        ctx.fillStyle = i % 2 === 0 ? "#00f0ff" : "#ffd700";
        ctx.fillRect(i * w, canvas.height - h, w - 1, h);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [soundEnabled]);

  // Sentinel Defense Sweep Radar
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.04;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = canvas.width / 2 - 4;

      // Radar Circles
      ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
      ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
      ctx.stroke();

      // Sweep Line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#030308", color: "#e2e8f0", position: "relative" }}>
      {/* Superluminal Warp Overlay */}
      {isWarping && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 99999, background: "rgba(3,3,8,0.75)", backdropFilter: "blur(20px)", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <h1 style={{ color: "#00f0ff", letterSpacing: "8px", fontSize: "2rem", textShadow: "0 0 30px #00f0ff" }}>
            WARPING REALMS...
          </h1>
        </div>
      )}

      {/* Header */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.85rem 2rem",
        background: "rgba(10, 14, 28, 0.9)",
        borderBottom: "1px solid rgba(0, 240, 255, 0.2)",
        backdropFilter: "blur(14px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#00f0ff", boxShadow: "0 0 14px #00f0ff" }} />
          <h1 style={{ margin: 0, fontSize: "1.15rem", letterSpacing: "2px", color: "#fff" }}>
            PRIMORDIA // OS <span style={{ fontSize: "0.7rem", color: "#ffd700" }}>[SINGULARITY v7.0]</span>
          </h1>
        </div>

        <nav style={{ display: "flex", gap: "0.5rem" }}>
          {realms.map((realm) => (
            <button
              key={realm}
              onClick={() => handleRealmSelect(realm)}
              style={{
                padding: "0.45rem 1rem",
                background: currentRealm === realm ? "rgba(0, 240, 255, 0.2)" : "rgba(255, 255, 255, 0.05)",
                border: `1px solid ${currentRealm === realm ? "#00f0ff" : "rgba(255, 255, 255, 0.1)"}`,
                color: currentRealm === realm ? "#fff" : "#94a3b8",
                borderRadius: "4px",
                cursor: "pointer",
                textTransform: "uppercase",
                fontFamily: "monospace",
                fontSize: "0.8rem",
                fontWeight: currentRealm === realm ? "bold" : "normal"
              }}
            >
              {realm}
            </button>
          ))}
        </nav>

        {/* Audio Spectrum & Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
          <canvas ref={spectrumCanvasRef} width={80} height={20} style={{ width: "80px", height: "20px" }} />
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              padding: "0.35rem 0.75rem",
              background: soundEnabled ? "rgba(0, 255, 136, 0.2)" : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${soundEnabled ? "#00ff88" : "rgba(255, 255, 255, 0.1)"}`,
              color: soundEnabled ? "#00ff88" : "#94a3b8",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            {soundEnabled ? "🔊 SYNTH ON" : "🔇 SYNTH OFF"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#ffd700" }}>
            <span>PULSE:</span>
            <input
              type="range" min="60" max="180" value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              style={{ width: "70px", accentColor: "#ffd700" }}
            />
            <span>{bpm} BPM</span>
          </div>
        </div>
      </header>

      {/* Main Grid Viewport */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", padding: "1.5rem" }}>
        <main>
          <GlobalPulse bpm={bpm} realm={currentRealm} soundEnabled={soundEnabled}>
            <RealmManager currentRealm={currentRealm} onLog={handleLog} />
          </GlobalPulse>
        </main>

        {/* Sidebar with Sentinel Radar & Logs */}
        <aside style={{
          background: "rgba(10, 14, 28, 0.75)",
          border: "1px solid rgba(0, 240, 255, 0.2)",
          borderRadius: "8px",
          padding: "1.2rem",
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 120px)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "0.85rem", letterSpacing: "1.5px", color: "#ffd700", textTransform: "uppercase" }}>
              🛡️ Sentinel Radar
            </h3>
            <canvas ref={radarCanvasRef} width={40} height={40} style={{ width: "40px", height: "40px" }} />
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
            {logs.map((l) => (
              <div key={l.id} style={{ padding: "0.4rem", background: "rgba(0,0,0,0.3)", borderRadius: "3px" }}>
                <span style={{ color: "#64748b" }}>[{l.time}]</span> <strong style={{ color: "#00f0ff" }}>{l.source}:</strong> {l.msg}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default PrimordiaShell;
