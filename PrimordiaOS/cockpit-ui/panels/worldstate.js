// panels/worldstate.js - WorldState Stability, Entropy & Coherence Panel
import * as THREE from "three";
import { createHoloPanel } from "../components/HoloPanel.js";

export function createWorldStatePanel(options = {}) {
  const { wsClient = null } = options;

  const panel = createHoloPanel({
    title: "WorldState Core Monitor",
    width: 1.8,
    height: 0.8,
    color: 0x38bdf8, // Sky Cyan
    position: new THREE.Vector3(0, 2.25, -2.4),
    rotation: new THREE.Euler(0.22, 0, 0)
  });

  const ctx = panel.getContext();
  const canvas = panel.getCanvas();

  // WorldState values
  const states = ["[STABLE]", "[CHARGED]", "[FLUX]"];
  let stateIndex = 0;
  let entropy = 0.024;
  let coherence = 99.8;
  let antigravScore = 94;

  const history = [0.02, 0.025, 0.023, 0.028, 0.022, 0.024, 0.026, 0.023, 0.024];

  // Buttons
  panel.registerButton({
    id: "toggle_world_state",
    x: 24,
    y: 200,
    w: 220,
    h: 34,
    onClick: () => {
      stateIndex = (stateIndex + 1) % states.length;
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({
          type: "worldstate_change",
          state: states[stateIndex]
        }));
      }
      render();
    }
  });

  panel.registerButton({
    id: "purge_entropy",
    x: 268,
    y: 200,
    w: 220,
    h: 34,
    onClick: () => {
      entropy = 0.012;
      coherence = 99.9;
      antigravScore = 98;
      render();
    }
  });

  function render() {
    panel.renderBase();

    // 1. Metric Badges
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillStyle = stateIndex === 0 ? "#10b981" : (stateIndex === 1 ? "#38bdf8" : "#f59e0b");
    ctx.fillText(`WORLDSTATE: ${states[stateIndex]}`, 24, 60);

    ctx.font = "13px 'Courier New', monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`ENTROPY: ${entropy.toFixed(3)}`, 24, 82);
    ctx.fillText(`COHERENCE: ${coherence.toFixed(1)}%`, 268, 60);
    ctx.fillText(`ANTIGRAV: ${antigravScore}/100 [HIGH]`, 268, 82);

    // 2. Coherence Sparkline Graph
    const graphX = 24;
    const graphY = 96;
    const graphW = 464;
    const graphH = 90;

    ctx.fillStyle = "#031526";
    ctx.fillRect(graphX, graphY, graphW, graphH);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.strokeRect(graphX, graphY, graphW, graphH);

    // Sparkline path
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((val, idx) => {
      const px = graphX + (idx / (history.length - 1)) * graphW;
      const py = graphY + graphH - (val / 0.05) * graphH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // 3. Interactive Buttons
    ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
    ctx.fillRect(24, 200, 220, 34);
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(24, 200, 220, 34);
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.fillStyle = "#e0f2fe";
    ctx.fillText("CYCLE WORLDSTATE", 64, 222);

    ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
    ctx.fillRect(268, 200, 220, 34);
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(268, 200, 220, 34);
    ctx.fillStyle = "#e0f2fe";
    ctx.fillText("PURGE ENTROPY", 318, 222);

    // 4. Status
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillStyle = "#7dd3fc";
    ctx.fillText("SYSTEM FABRIC: STABLE COGNITIVE EQUILIBRIUM", 24, 255);

    panel.commit();
  }

  render();

  panel.handleTelemetry = function (data) {
    if (data.entropy !== undefined) entropy = data.entropy;
    if (data.coherence !== undefined) coherence = data.coherence;
    if (data.state) {
      const idx = states.indexOf(data.state);
      if (idx !== -1) stateIndex = idx;
    }
    history.push(entropy);
    if (history.length > 20) history.shift();
    render();
  };

  const baseUpdate = panel.update;
  panel.update = function (delta, elapsed) {
    baseUpdate(delta, elapsed);
    // Subtle periodic drift
    entropy += (Math.random() - 0.5) * 0.0005;
    entropy = Math.max(0.01, Math.min(0.045, entropy));
  };

  return panel;
}
