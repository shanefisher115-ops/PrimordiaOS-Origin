// components/FloatingCRT.js - Centered Floating Cosmic Terminal Slab
import * as THREE from "three";
import { crtVertexShader, crtFragmentShader } from "../shaders/index.js";

export function createCRT(options = {}) {
  const width = 2.2;
  const height = 1.4;

  // Offscreen dynamic Canvas for CRT text & graphics
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Terminal state
  const logs = [
    "[SOVEREIGN KERNEL] Boot sequence verified.",
    "[STATUS] Masterplane linked (port 3000 / 5055).",
    "[ANTIGRAV] Sovereign cognition threshold: 92/100 (HIGH).",
    "[UNREAL] Niagara bridge listening for telemetry pulses.",
    "[CAD/CAM] Quantum Voronoi topology buffer ready.",
    "[READY] Type plain English or press Enter to dispatch..."
  ];

  let currentInput = "";
  let cursorVisible = true;
  let isFocused = true;
  let lastBlink = Date.now();

  function redrawTerminal() {
    // Deep obsidian background
    ctx.fillStyle = "#03080e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid lines
    ctx.strokeStyle = "rgba(0, 240, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Terminal Header
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(0, 0, canvas.width, 42);
    ctx.strokeStyle = "rgba(0, 255, 200, 0.3)";
    ctx.beginPath();
    ctx.moveTo(0, 42);
    ctx.lineTo(canvas.width, 42);
    ctx.stroke();

    // Header Status Icons
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillStyle = "#00ffcc";
    ctx.fillText("⭐ SOVEREIGN COCKPIT v5.0 — MASTER TERMINAL", 24, 27);

    ctx.font = "14px 'Courier New', monospace";
    ctx.fillStyle = "#ffb703";
    ctx.fillText("[STABLE]", canvas.width - 120, 27);

    // Render Log Stream
    ctx.font = "16px 'Courier New', monospace";
    const startY = 75;
    const lineHeight = 26;
    const maxVisibleLogs = 18;
    const visibleLogs = logs.slice(-maxVisibleLogs);

    visibleLogs.forEach((line, index) => {
      if (line.startsWith(">")) {
        ctx.fillStyle = "#38bdf8"; // command prompt
      } else if (line.includes("[ERROR]") || line.includes("failed")) {
        ctx.fillStyle = "#f43f5e";
      } else if (line.includes("[SUCCESS]") || line.includes("[OK]")) {
        ctx.fillStyle = "#10b981";
      } else if (line.includes("[SOVEREIGN]") || line.includes("[ANTIGRAV]")) {
        ctx.fillStyle = "#a855f7";
      } else {
        ctx.fillStyle = "#67e8f9"; // phosphor teal
      }
      ctx.fillText(line, 24, startY + index * lineHeight);
    });

    // Active Input Line
    const inputY = startY + visibleLogs.length * lineHeight;
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("> " + currentInput, 24, inputY);

    // Blinking phosphor cursor
    if (cursorVisible && isFocused) {
      const promptWidth = ctx.measureText("> " + currentInput).width;
      ctx.fillStyle = "#00ffcc";
      ctx.fillRect(24 + promptWidth + 2, inputY - 14, 10, 18);
    }

    texture.needsUpdate = true;
  }

  // Initial draw
  redrawTerminal();

  // CRT Shader Material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      tDiffuse: { value: texture }
    },
    vertexShader: crtVertexShader,
    fragmentShader: crtFragmentShader,
    transparent: true,
    side: THREE.DoubleSide
  });

  const geometry = new THREE.PlaneGeometry(width, height);
  const slab = new THREE.Mesh(geometry, material);
  slab.position.set(0, 1.2, -2.5);
  slab.rotation.x = -0.15;
  slab.userData = { isCRT: true, type: "terminal" };

  // Cosmic Bezel / Chassis Frame
  const frameGeo = new THREE.BoxGeometry(width + 0.08, height + 0.08, 0.04);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x050c14,
    metalness: 0.85,
    roughness: 0.25,
    wireframe: false
  });
  const bezel = new THREE.Mesh(frameGeo, frameMat);
  bezel.position.set(0, 0, -0.025);
  slab.add(bezel);

  // Neon Rim Accent
  const rimGeo = new THREE.EdgesGeometry(geometry);
  const rimMat = new THREE.LineBasicMaterial({ color: 0x00f3ff, linewidth: 2 });
  const rim = new THREE.LineSegments(rimGeo, rimMat);
  rim.position.z = 0.002;
  slab.add(rim);

  // Public Interface & update routine
  slab.update = function (delta, elapsed) {
    material.uniforms.time.value = elapsed;

    if (Date.now() - lastBlink > 500) {
      cursorVisible = !cursorVisible;
      lastBlink = Date.now();
      redrawTerminal();
    }
  };

  slab.appendLog = function (msg) {
    logs.push(msg);
    if (logs.length > 100) logs.shift();
    redrawTerminal();
  };

  slab.setInput = function (text) {
    currentInput = text;
    redrawTerminal();
  };

  slab.getInput = function () {
    return currentInput;
  };

  slab.handleKey = function (e, onCommandSubmit) {
    if (e.key === "Enter") {
      const cmd = currentInput.trim();
      if (cmd) {
        logs.push("> " + cmd);
        currentInput = "";
        redrawTerminal();
        if (typeof onCommandSubmit === "function") {
          onCommandSubmit(cmd);
        }
      }
    } else if (e.key === "Backspace") {
      currentInput = currentInput.slice(0, -1);
      redrawTerminal();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      currentInput += e.key;
      redrawTerminal();
    }
  };

  return slab;
}
