// panels/unreal.js - Unreal Engine 5.4 Bridge & Niagara Telemetry Panel
import * as THREE from "three";
import { createHoloPanel } from "../components/HoloPanel.js";

export function createUnrealPanel(options = {}) {
  const { wsClient = null } = options;

  const panel = createHoloPanel({
    title: "Unreal Engine 5.4 Bridge",
    width: 1.5,
    height: 1.1,
    color: 0x06b6d4, // Neon Cyan
    position: new THREE.Vector3(-2.2, 1.2, -2.3),
    rotation: new THREE.Euler(0, 0.38, 0)
  });

  const ctx = panel.getContext();
  const canvas = panel.getCanvas();

  // Telemetry state
  let connectedClients = 1;
  let activeNiagaraEmitters = 8;
  let pulseCount = 142;
  let lastSignal = "NIAGARA_WARP_BURST";
  let frame = 0;

  // Buttons
  panel.registerButton({
    id: "emit_niagara",
    x: 24,
    y: 290,
    w: 220,
    h: 38,
    onClick: () => {
      pulseCount++;
      lastSignal = "NIAGARA_PULSE_EMITTED";
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({
          type: "niagara_pulse",
          x: (Math.random() - 0.5) * 200,
          y: (Math.random() - 0.5) * 200,
          z: Math.random() * 300,
          velocity: 150.0,
          color: "#06b6d4"
        }));
      }
      render();
    }
  });

  panel.registerButton({
    id: "stream_mesh",
    x: 268,
    y: 290,
    w: 220,
    h: 38,
    onClick: () => {
      lastSignal = "MESH_STREAM_ACTIVE";
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({
          type: "mesh_stream",
          shape: "quantum_torus",
          vertices: 4800,
          timestamp: Date.now()
        }));
      }
      render();
    }
  });

  function render() {
    panel.renderBase();

    // 1. Metric Header
    ctx.font = "13px 'Courier New', monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`BRIDGE: UE 5.4 [${connectedClients > 0 ? "SYNCHRONIZED" : "STANDBY"}]`, 24, 62);
    ctx.fillText(`EMITTERS: ${activeNiagaraEmitters} ACTIVE`, 24, 82);
    ctx.fillText(`PULSES: ${pulseCount} SENT`, 268, 62);
    ctx.fillText(`PROTOCOL: WEBSOCKET`, 268, 82);

    // 2. Niagara Particle Radar Scope
    const radarX = 24;
    const radarY = 96;
    const radarW = 464;
    const radarH = 176;

    ctx.fillStyle = "#041424";
    ctx.fillRect(radarX, radarY, radarW, radarH);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
    ctx.strokeRect(radarX, radarY, radarW, radarH);

    // Concentric Radar Rings
    const centerX = radarX + radarW / 2;
    const centerY = radarY + radarH / 2;
    for (let r = 25; r <= 75; r += 25) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.2)";
      ctx.stroke();
    }

    // Rotating Radar Sweep Line
    const sweepAngle = (frame * 0.05) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(sweepAngle) * 80, centerY + Math.sin(sweepAngle) * 80);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Simulated Niagara Particles
    for (let i = 0; i < 12; i++) {
      const pAngle = i * 0.52 + frame * 0.02;
      const pDist = 30 + (i * 7) % 50;
      const px = centerX + Math.cos(pAngle) * pDist;
      const py = centerY + Math.sin(pAngle) * pDist;
      ctx.fillStyle = i % 2 === 0 ? "#22d3ee" : "#a5f3fc";
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Radar Legend
    ctx.font = "12px 'Courier New', monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("NIAGARA SPATIAL MATRIX", radarX + 12, radarY + 22);

    // 3. Interactive Buttons
    // Emit Pulse
    ctx.fillStyle = "rgba(6, 182, 212, 0.2)";
    ctx.fillRect(24, 290, 220, 38);
    ctx.strokeStyle = "#06b6d4";
    ctx.strokeRect(24, 290, 220, 38);
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "#cffafe";
    ctx.fillText("EMIT NIAGARA PULSE", 56, 314);

    // Stream Mesh
    ctx.fillStyle = "rgba(6, 182, 212, 0.2)";
    ctx.fillRect(268, 290, 220, 38);
    ctx.strokeStyle = "#06b6d4";
    ctx.strokeRect(268, 290, 220, 38);
    ctx.fillStyle = "#cffafe";
    ctx.fillText("STREAM PROCEDURAL MESH", 280, 314);

    // 4. Last Signal Status
    ctx.font = "12px 'Courier New', monospace";
    ctx.fillStyle = "#67e8f9";
    ctx.fillText(`SIGNAL: ${lastSignal}`, 24, 355);

    panel.commit();
  }

  render();

  panel.handleTelemetry = function (data) {
    if (data.type === "unreal_telemetry" || data.type === "signal_ack") {
      pulseCount++;
      lastSignal = data.type.toUpperCase();
      render();
    }
  };

  const baseUpdate = panel.update;
  panel.update = function (delta, elapsed) {
    baseUpdate(delta, elapsed);
    frame++;
    if (frame % 3 === 0) {
      render();
    }
  };

  return panel;
}
