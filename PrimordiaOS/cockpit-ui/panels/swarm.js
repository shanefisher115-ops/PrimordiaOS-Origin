// panels/swarm.js - Agent Modulation & Overmind Relay Panel
import * as THREE from "three";
import { createHoloPanel } from "../components/HoloPanel.js";

export function createSwarmPanel(options = {}) {
  const { wsClient = null } = options;

  const panel = createHoloPanel({
    title: "Swarm Core & Overmind",
    width: 1.4,
    height: 1.0,
    color: 0x8b5cf6, // Violet / Overmind Purple
    position: new THREE.Vector3(1.8, -0.1, -2.1),
    rotation: new THREE.Euler(-0.25, -0.32, -0.08)
  });

  const ctx = panel.getContext();
  const canvas = panel.getCanvas();

  // Swarm state
  const agents = [
    { name: "AntigravGuardian", tier: "T2", status: "ONLINE", score: "96%" },
    { name: "RealmBuilder", tier: "T3", status: "ACTIVE", score: "91%" },
    { name: "LexiconScribe", tier: "T3", status: "IDLE", score: "89%" },
    { name: "LoopEngineer", tier: "T3", status: "RUNNING", score: "94%" },
    { name: "InfraNavigator", tier: "T3", status: "MONITOR", score: "92%" }
  ];

  let overmindCycle = 412;
  let pulseTimer = 0;

  // Buttons
  panel.registerButton({
    id: "trigger_overmind",
    x: 24,
    y: 280,
    w: 220,
    h: 36,
    onClick: () => {
      overmindCycle++;
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({ type: "overmind_cycle", cycle: overmindCycle }));
      }
      render();
    }
  });

  panel.registerButton({
    id: "modulate_agents",
    x: 268,
    y: 280,
    w: 220,
    h: 36,
    onClick: () => {
      agents.forEach(a => {
        a.score = `${Math.floor(88 + Math.random() * 11)}%`;
      });
      render();
    }
  });

  function render() {
    panel.renderBase();

    // 1. Metric Header
    ctx.font = "13px 'Courier New', monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("SOVEREIGNTY: TIER 0-3 ACTIVE", 24, 60);
    ctx.fillText(`OVERMIND CYCLE: #${overmindCycle}`, 24, 80);
    ctx.fillText("ACTIVE AGENTS: 5", 268, 60);
    ctx.fillText("COGNITIVE ALTITUDE: HIGH", 268, 80);

    // 2. Agents Grid
    const gridX = 24;
    const gridY = 96;
    const gridW = 464;
    const gridH = 165;

    ctx.fillStyle = "#110c24";
    ctx.fillRect(gridX, gridY, gridW, gridH);
    ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
    ctx.strokeRect(gridX, gridY, gridW, gridH);

    // Render agent rows
    const rowHeight = 28;
    agents.forEach((ag, idx) => {
      const y = gridY + 22 + idx * rowHeight;
      
      // Status dot
      ctx.fillStyle = ag.status === "ONLINE" || ag.status === "RUNNING" || ag.status === "ACTIVE" ? "#a78bfa" : "#818cf8";
      ctx.beginPath();
      ctx.arc(gridX + 16, y - 4, 4, 0, Math.PI * 2);
      ctx.fill();

      // Tier badge
      ctx.font = "bold 11px 'Courier New', monospace";
      ctx.fillStyle = "#c4b5fd";
      ctx.fillText(`[${ag.tier}]`, gridX + 30, y);

      // Name
      ctx.font = "12px 'Courier New', monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(ag.name, gridX + 70, y);

      // Status & Sovereignty Score
      ctx.fillStyle = "#ddd6fe";
      ctx.fillText(ag.status, gridX + 260, y);
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`ANTIGRAV: ${ag.score}`, gridX + 340, y);
    });

    // 3. Interactive Buttons
    ctx.fillStyle = "rgba(139, 92, 246, 0.25)";
    ctx.fillRect(24, 280, 220, 36);
    ctx.strokeStyle = "#8b5cf6";
    ctx.strokeRect(24, 280, 220, 36);
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "#ede9fe";
    ctx.fillText("TRIGGER OVERMIND", 60, 303);

    ctx.fillStyle = "rgba(139, 92, 246, 0.25)";
    ctx.fillRect(268, 280, 220, 36);
    ctx.strokeStyle = "#8b5cf6";
    ctx.strokeRect(268, 280, 220, 36);
    ctx.fillStyle = "#ede9fe";
    ctx.fillText("MODULATE SWARM", 310, 303);

    // 4. Status Ticker
    ctx.font = "12px 'Courier New', monospace";
    ctx.fillStyle = "#c4b5fd";
    ctx.fillText("STATUS: AUTONOMOUS MATRIX SYNCHRONIZED", 24, 348);

    panel.commit();
  }

  render();

  const baseUpdate = panel.update;
  panel.update = function (delta, elapsed) {
    baseUpdate(delta, elapsed);
    pulseTimer += delta;
    if (pulseTimer > 2.0) {
      pulseTimer = 0;
      render();
    }
  };

  return panel;
}
