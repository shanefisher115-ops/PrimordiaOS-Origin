// components/HoloPanel.js - Glass UI with Neon Holographic Edges
import * as THREE from "three";
import { holoVertexShader, holoFragmentShader } from "../shaders/index.js";

export function createHoloPanel(options = {}) {
  const {
    title = "PANEL",
    width = 1.4,
    height = 1.0,
    color = 0x00f3ff,
    position = new THREE.Vector3(0, 0, 0),
    rotation = new THREE.Euler(0, 0, 0)
  } = options;

  // Offscreen canvas for rendering crisp UI graphics
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const threeColor = new THREE.Color(color);

  // Hologlass Shader Material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      tDiffuse: { value: texture },
      rimColor: { value: new THREE.Vector3(threeColor.r, threeColor.g, threeColor.b) }
    },
    vertexShader: holoVertexShader,
    fragmentShader: holoFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const geometry = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.copy(rotation);
  mesh.userData = { isHoloPanel: true, title, buttons: [] };

  // Chamfered Neon Frame Border
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMat = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.85,
    linewidth: 2
  });
  const border = new THREE.LineSegments(edges, lineMat);
  border.position.z = 0.002;
  mesh.add(border);

  // Corner Accent Brackets
  const bracketGeo = new THREE.RingGeometry(0.04, 0.06, 4);
  const bracketMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
  
  const corners = [
    [-width / 2 + 0.05, height / 2 - 0.05],
    [width / 2 - 0.05, height / 2 - 0.05],
    [-width / 2 + 0.05, -height / 2 + 0.05],
    [width / 2 - 0.05, -height / 2 + 0.05]
  ];

  corners.forEach(([cx, cy]) => {
    const cMesh = new THREE.Mesh(bracketGeo, bracketMat);
    cMesh.position.set(cx, cy, 0.003);
    mesh.add(cMesh);
  });

  // Base drawing function
  function renderBaseHUD() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Frosted glass dark overlay
    ctx.fillStyle = "rgba(4, 12, 22, 0.82)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Panel Header Bar
    ctx.fillStyle = `rgba(${Math.floor(threeColor.r * 255)}, ${Math.floor(threeColor.g * 255)}, ${Math.floor(threeColor.b * 255)}, 0.18)`;
    ctx.fillRect(0, 0, canvas.width, 36);

    ctx.strokeStyle = `rgba(${Math.floor(threeColor.r * 255)}, ${Math.floor(threeColor.g * 255)}, ${Math.floor(threeColor.b * 255)}, 0.7)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 36);
    ctx.lineTo(canvas.width, 36);
    ctx.stroke();

    // Title & Status
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title.toUpperCase(), 16, 24);

    ctx.fillStyle = `rgb(${Math.floor(threeColor.r * 255)}, ${Math.floor(threeColor.g * 255)}, ${Math.floor(threeColor.b * 255)})`;
    ctx.fillRect(canvas.width - 24, 14, 8, 8);
  }

  // Public methods
  mesh.getCanvas = () => canvas;
  mesh.getContext = () => ctx;
  mesh.getTexture = () => texture;
  mesh.renderBase = renderBaseHUD;

  mesh.commit = () => {
    texture.needsUpdate = true;
  };

  mesh.update = (delta, elapsed) => {
    material.uniforms.time.value = elapsed;
  };

  mesh.setRimColor = (newColor) => {
    const c = new THREE.Color(newColor);
    material.uniforms.rimColor.value.set(c.r, c.g, c.b);
    lineMat.color.set(c);
  };

  // Clickable button registration on panel canvas
  mesh.registerButton = (btn) => {
    mesh.userData.buttons.push(btn); // { id, x, y, w, h, onClick }
  };

  mesh.handleClick = (uv) => {
    if (!uv) return;
    const canvasX = uv.x * canvas.width;
    const canvasY = (1 - uv.y) * canvas.height;

    for (const btn of mesh.userData.buttons) {
      if (
        canvasX >= btn.x &&
        canvasX <= btn.x + btn.w &&
        canvasY >= btn.y &&
        canvasY <= btn.y + btn.h
      ) {
        if (typeof btn.onClick === "function") {
          btn.onClick();
        }
        return true;
      }
    }
    return false;
  };

  return mesh;
}
