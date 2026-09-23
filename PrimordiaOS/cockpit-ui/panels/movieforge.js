// panels/movieforge.js - MovieForge 4K Neural Theater & Render Queue Panel
import * as THREE from "three";
import { createHoloPanel } from "../components/HoloPanel.js";

export function createMovieForgePanel(options = {}) {
  const { wsClient = null } = options;

  const panel = createHoloPanel({
    title: "MovieForge 4K Theater",
    width: 1.5,
    height: 1.1,
    color: 0xf59e0b, // Amber / Imperial Gold
    position: new THREE.Vector3(2.2, 1.2, -2.3),
    rotation: new THREE.Euler(0, -0.38, 0)
  });

  const ctx = panel.getContext();
  const canvas = panel.getCanvas();

  // Panel state
  let currentLUT = "Imperial Gold";
  const luts = ["Imperial Gold", "Cyberpunk Emerald", "Neutral Raw"];
  let renderQueueCount = 3;
  let activeFrame = 0;
  let statusText = "ONLINE // 4K PIPELINE IDLE";

  // Register Interactive UI Buttons
  // 1. LUT Toggle Button
  panel.registerButton({
    id: "toggle_lut",
    x: 24,
    y: 290,
    w: 220,
    h: 38,
    onClick: () => {
      const idx = (luts.indexOf(currentLUT) + 1) % luts.length;
      currentLUT = luts[idx];
      statusText = `LUT SWITCHED: ${currentLUT.toUpperCase()}`;
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({ type: "movie_lut_switch", lut: currentLUT }));
      }
      render();
    }
  });

  // 2. Dispatch Render Button
  panel.registerButton({
    id: "dispatch_render",
    x: 268,
    y: 290,
    w: 220,
    h: 38,
    onClick: () => {
      renderQueueCount++;
      statusText = "DISPATCHING 4K SHADER PASS...";
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({
          type: "movie_render_dispatch",
          theme: "Cosmic Singularity Genesis",
          lut: currentLUT
        }));
      }
      render();
    }
  });

  function render() {
    panel.renderBase();

    // 1. Telemetry Data Row
    ctx.font = "13px 'Courier New', monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("ENGINE: NEURAL 4K RAYMARCHER", 24, 62);
    ctx.fillText(`QUEUE: [${renderQueueCount} JOBS]`, 24, 82);
    ctx.fillText("RES: 3840x2160 @ 60FPS", 268, 62);
    ctx.fillText(`LUT: ${currentLUT}`, 268, 82);

    // 2. Procedural Cinema Screen Preview
    const previewX = 24;
    const previewY = 96;
    const previewW = 464;
    const previewH = 176;

    // Cinema Screen Border
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.strokeRect(previewX, previewY, previewW, previewH);

    // Draw dynamic procedural raymarched color waves based on LUT
    const gradient = ctx.createLinearGradient(previewX, previewY, previewX + previewW, previewY + previewH);
    if (currentLUT === "Imperial Gold") {
      gradient.addColorStop(0, "#451a03");
      gradient.addColorStop(0.5, "#d97706");
      gradient.addColorStop(1, "#fef3c7");
    } else if (currentLUT === "Cyberpunk Emerald") {
      gradient.addColorStop(0, "#022c22");
      gradient.addColorStop(0.5, "#059669");
      gradient.addColorStop(1, "#34d399");
    } else {
      gradient.addColorStop(0, "#0f172a");
      gradient.addColorStop(0.5, "#64748b");
      gradient.addColorStop(1, "#f8fafc");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(previewX + 2, previewY + 2, previewW - 4, previewH - 4);

    // Animated sine scan inside preview
    const waveY = previewY + ((activeFrame * 3) % previewH);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(previewX + 2, waveY, previewW - 4, 3);

    // Overlay Watermark
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(previewX + 8, previewY + previewH - 28, 200, 20);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("CINEMA STREAM // LIVE", previewX + 14, previewY + previewH - 14);

    // 3. Render Buttons
    // Button A: Cycle LUT
    ctx.fillStyle = "rgba(245, 158, 11, 0.25)";
    ctx.fillRect(24, 290, 220, 38);
    ctx.strokeStyle = "#f59e0b";
    ctx.strokeRect(24, 290, 220, 38);
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "#fef3c7";
    ctx.fillText("SWITCH 3D LUT", 64, 314);

    // Button B: Dispatch Render
    ctx.fillStyle = "rgba(245, 158, 11, 0.25)";
    ctx.fillRect(268, 290, 220, 38);
    ctx.strokeStyle = "#f59e0b";
    ctx.strokeRect(268, 290, 220, 38);
    ctx.fillStyle = "#fef3c7";
    ctx.fillText("DISPATCH 4K PASS", 304, 314);

    // 4. Status Ticker
    ctx.font = "12px 'Courier New', monospace";
    ctx.fillStyle = "#fde68a";
    ctx.fillText(statusText, 24, 355);

    panel.commit();
  }

  // Initial draw
  render();

  panel.handleTelemetry = function (data) {
    if (data.type === "movie_status" || data.type === "movieforge") {
      if (data.queue) renderQueueCount = data.queue;
      if (data.status) statusText = data.status;
      render();
    }
  };

  const baseUpdate = panel.update;
  panel.update = function (delta, elapsed) {
    baseUpdate(delta, elapsed);
    activeFrame++;
    if (activeFrame % 5 === 0) {
      render();
    }
  };

  return panel;
}
