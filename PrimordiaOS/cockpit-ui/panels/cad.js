// panels/cad.js - CAD/CAM Vertex Streaming & Scene Graph Panel
import * as THREE from "three";
import { createHoloPanel } from "../components/HoloPanel.js";

export function createCADPanel(options = {}) {
  const { wsClient = null } = options;

  const panel = createHoloPanel({
    title: "CAD/CAM Spatial Core",
    width: 1.4,
    height: 1.0,
    color: 0x10b981, // Emerald
    position: new THREE.Vector3(-1.8, -0.1, -2.1),
    rotation: new THREE.Euler(-0.25, 0.32, 0.08)
  });

  const ctx = panel.getContext();
  const canvas = panel.getCanvas();

  // CAD state
  const shapes = ["Quantum Torus", "Voronoi Crystal", "Hypercube Lattice"];
  let currentShapeIdx = 0;
  let vertexCount = 144000;
  let faceCount = 48000;
  let angle = 0;

  // Buttons
  panel.registerButton({
    id: "cycle_cad_shape",
    x: 24,
    y: 280,
    w: 220,
    h: 36,
    onClick: () => {
      currentShapeIdx = (currentShapeIdx + 1) % shapes.length;
      vertexCount = 120000 + Math.floor(Math.random() * 80000);
      faceCount = Math.floor(vertexCount / 3);
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({
          type: "cad_mesh_stream",
          shape: shapes[currentShapeIdx],
          vertices: vertexCount
        }));
      }
      render();
    }
  });

  panel.registerButton({
    id: "toggle_wireframe",
    x: 268,
    y: 280,
    w: 220,
    h: 36,
    onClick: () => {
      vertexCount += 5000;
      render();
    }
  });

  function render() {
    panel.renderBase();

    // 1. Metric Header
    ctx.font = "13px 'Courier New', monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`TOPOLOGY: ${shapes[currentShapeIdx].toUpperCase()}`, 24, 60);
    ctx.fillText(`VERTICES: ${vertexCount.toLocaleString()}`, 24, 80);
    ctx.fillText(`FACES: ${faceCount.toLocaleString()}`, 268, 60);
    ctx.fillText("STREAM: REAL-TIME 60Hz", 268, 80);

    // 2. 3D Wireframe Visualizer
    const vizX = 24;
    const vizY = 96;
    const vizW = 464;
    const vizH = 165;

    ctx.fillStyle = "#021c14";
    ctx.fillRect(vizX, vizY, vizW, vizH);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
    ctx.strokeRect(vizX, vizY, vizW, vizH);

    // Render 3D rotating isometric wireframe projection
    const cx = vizX + vizW / 2;
    const cy = vizY + vizH / 2;
    const numPoints = 28;

    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < numPoints; i++) {
      const theta = (i / numPoints) * Math.PI * 2 + angle;
      const r = 50 + Math.sin(theta * 3 + angle * 2) * 18;
      const px = cx + Math.cos(theta) * r;
      const py = cy + Math.sin(theta) * (r * 0.55);

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);

      // Connect spoke to center
      if (i % 4 === 0) {
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();

    // 3. Scene Graph Tag
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillStyle = "#6ee7b7";
    ctx.fillText("NODE: SceneRoot -> CADCore -> MeshLOD0", vizX + 12, vizY + 20);

    // 4. Buttons
    ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
    ctx.fillRect(24, 280, 220, 36);
    ctx.strokeStyle = "#10b981";
    ctx.strokeRect(24, 280, 220, 36);
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "#d1fae5";
    ctx.fillText("CYCLE GEOMETRY", 66, 303);

    ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
    ctx.fillRect(268, 280, 220, 36);
    ctx.strokeStyle = "#10b981";
    ctx.strokeRect(268, 280, 220, 36);
    ctx.fillStyle = "#d1fae5";
    ctx.fillText("STREAM BUFFERS", 314, 303);

    // Status line
    ctx.font = "12px 'Courier New', monospace";
    ctx.fillStyle = "#a7f3d0";
    ctx.fillText("STATUS: GEOMETRY STREAMING SYNCHRONIZED", 24, 348);

    panel.commit();
  }

  render();

  const baseUpdate = panel.update;
  panel.update = function (delta, elapsed) {
    baseUpdate(delta, elapsed);
    angle += delta * 1.5;
    render();
  };

  return panel;
}
