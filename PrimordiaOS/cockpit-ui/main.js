// main.js - Sovereign Cockpit v5 Visual OS Orchestrator
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { createCRT } from "./components/FloatingCRT.js";
import { createMovieForgePanel } from "./panels/movieforge.js";
import { createUnrealPanel } from "./panels/unreal.js";
import { createCADPanel } from "./panels/cad.js";
import { createSwarmPanel } from "./panels/swarm.js";
import { createWorldStatePanel } from "./panels/worldstate.js";
import { createRealmsOrchestrator } from "./panels/realms.js";

// 1. Scene & Renderer Initialization
const container = document.getElementById("canvas-container");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030712, 0.08);

const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Pilot eye position looking directly at CRT terminal slab
camera.position.set(0, 1.2, 0.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// Enable WebXR VR Cockpit
renderer.xr.enabled = true;
const vrContainer = document.getElementById("vr-button-container");
if (vrContainer) {
  vrContainer.appendChild(VRButton.createButton(renderer));
}

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1.2, -2.5);
controls.maxDistance = 5.0;
controls.minDistance = 0.5;

// 2. Cosmic Ambient & Starfield Environment
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0x00f3ff, 2.5);
spotLight.position.set(0, 4, 1);
spotLight.angle = Math.PI / 4;
spotLight.penumbra = 0.8;
scene.add(spotLight);

// Deep Space Cosmic Particles
const starCount = 2000;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
const starCols = new Float32Array(starCount * 3);

for (let i = 0; i < starCount; i++) {
  starPos[i * 3]     = (Math.random() - 0.5) * 60;
  starPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
  starPos[i * 3 + 2] = (Math.random() - 0.5) * 60;

  const colType = Math.random();
  if (colType > 0.7) {
    starCols[i * 3] = 0.0; starCols[i * 3 + 1] = 0.95; starCols[i * 3 + 2] = 1.0; // Cyan
  } else if (colType > 0.4) {
    starCols[i * 3] = 0.65; starCols[i * 3 + 1] = 0.35; starCols[i * 3 + 2] = 1.0; // Purple
  } else {
    starCols[i * 3] = 0.95; starCols[i * 3 + 1] = 0.72; starCols[i * 3 + 2] = 0.2; // Amber
  }
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute("color", new THREE.BufferAttribute(starCols, 3));

const starMat = new THREE.PointsMaterial({
  size: 0.12,
  vertexColors: true,
  transparent: true,
  opacity: 0.85
});
const starfield = new THREE.Points(starGeo, starMat);
scene.add(starfield);

// Subtle Cockpit Floor Grid
const gridHelper = new THREE.GridHelper(20, 40, 0x00f3ff, 0x064e3b);
gridHelper.position.y = -0.6;
gridHelper.material.opacity = 0.18;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// 3. Telemetry WebSocket Client Connection (Port 5055)
const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${wsProtocol}//${window.location.host || "localhost:5055"}`;
let ws = null;

function initWebSocket() {
  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[Cockpit Telemetry] Linked to Cockpit Bridge (5055)");
      const bridgeEl = document.getElementById("metric-bridge");
      if (bridgeEl) bridgeEl.textContent = "CONNECTED";
      crt.appendLog("[TELEMETRY] WebSocket handshake verified on port 5055.");
    };

    ws.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data);
        routeTelemetry(packet);
      } catch (err) {
        console.warn("[Telemetry parse error]", err);
      }
    };

    ws.onclose = () => {
      const bridgeEl = document.getElementById("metric-bridge");
      if (bridgeEl) bridgeEl.textContent = "RETRYING...";
      setTimeout(initWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.warn("[Cockpit WS Error]", err);
    };
  } catch (err) {
    console.warn("[WebSocket Init Failed]", err);
  }
}

// Dynamic WebSocket proxy ensuring panels always access the active socket
const wsDispatcher = {
  get readyState() {
    return ws ? ws.readyState : (typeof WebSocket !== "undefined" ? WebSocket.CLOSED : 3);
  },
  send(data) {
    if (ws && ws.readyState === (typeof WebSocket !== "undefined" ? WebSocket.OPEN : 1)) {
      ws.send(data);
    }
  }
};

// 4. Assemble Cockpit Modules
// A. Floating CRT Terminal Slab (Center)
const crt = createCRT();
scene.add(crt);

// B. Holographic Panels
const movieForgePanel = createMovieForgePanel({ wsClient: wsDispatcher });
scene.add(movieForgePanel);

const unrealPanel = createUnrealPanel({ wsClient: wsDispatcher });
scene.add(unrealPanel);

const cadPanel = createCADPanel({ wsClient: wsDispatcher });
scene.add(cadPanel);

const swarmPanel = createSwarmPanel({ wsClient: wsDispatcher });
scene.add(swarmPanel);

const worldStatePanel = createWorldStatePanel({ wsClient: wsDispatcher });
scene.add(worldStatePanel);

// C. Realm Gates (Perimeter)
const realms = createRealmsOrchestrator({
  wsClient: wsDispatcher,
  onRealmChanged: (realmName, realmColor) => {
    const realmEl = document.getElementById("realm-name");
    const dotEl = document.getElementById("realm-dot");
    if (realmEl) realmEl.textContent = realmName.toUpperCase();
    if (dotEl) {
      const hex = "#" + new THREE.Color(realmColor).getHexString();
      dotEl.style.backgroundColor = hex;
      dotEl.style.boxShadow = `0 0 12px ${hex}`;
    }

    crt.appendLog(`[REALM SWITCH] Reconfigured substrate to: ${realmName.toUpperCase()}`);

    // Camera warp pulse
    const origZ = camera.position.z;
    camera.position.z -= 0.35;
    setTimeout(() => {
      camera.position.z = origZ;
    }, 280);
  }
});
scene.add(realms);

// Start WebSocket connection
initWebSocket();

// 5. Telemetry Router
function routeTelemetry(packet) {
  const type = packet.type || packet.action || packet.event;

  if (type === "unreal_telemetry" || type === "niagara_pulse" || type === "signal_ack") {
    unrealPanel.handleTelemetry(packet);
  } else if (type === "movie_status" || type === "movie_render_ack") {
    movieForgePanel.handleTelemetry(packet);
  } else if (type === "worldstate" || type === "entropy_pulse") {
    worldStatePanel.handleTelemetry(packet);
  } else if (type === "terminal_output" || type === "command_result") {
    const resText = packet.output || packet.result || JSON.stringify(packet);
    crt.appendLog(resText);
  } else if (type === "telemetry_pulse") {
    // Broadcast heartbeat
    if (packet.worldstate) worldStatePanel.handleTelemetry(packet.worldstate);
    if (packet.unreal) unrealPanel.handleTelemetry(packet.unreal);
    if (packet.movieforge) movieForgePanel.handleTelemetry(packet.movieforge);
  }
}

// 6. Raycasting Interaction (Mouse & Spatial Clicks)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const interactivePanels = [movieForgePanel, unrealPanel, cadPanel, swarmPanel, worldStatePanel];

window.addEventListener("pointerdown", (event) => {
  // Ignore clicks on HUD overlay elements
  if (event.target.closest("#hud-header") || event.target.closest("#hud-footer") || event.target.closest("#vr-button-container")) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // 1. Check Panels
  const panelHits = raycaster.intersectObjects(interactivePanels, true);
  if (panelHits.length > 0) {
    const hit = panelHits[0];
    let panelMesh = hit.object;
    while (panelMesh && !panelMesh.userData.isHoloPanel) {
      panelMesh = panelMesh.parent;
    }
    if (panelMesh && typeof panelMesh.handleClick === "function") {
      panelMesh.handleClick(hit.uv);
    }
    return;
  }

  // 2. Check Realm Gates
  const gateHits = raycaster.intersectObjects(realms.getGates(), true);
  if (gateHits.length > 0) {
    let gateGroup = gateHits[0].object;
    while (gateGroup && !gateGroup.userData.isRealmGate) {
      gateGroup = gateGroup.parent;
    }
    if (gateGroup && typeof gateGroup.trigger === "function") {
      gateGroup.trigger();
    }
    return;
  }

  // 3. Check CRT Terminal
  const crtHits = raycaster.intersectObject(crt, true);
  if (crtHits.length > 0) {
    crt.appendLog("[TERMINAL FOCUSED] Ready for input.");
  }
});

// 7. Keyboard Input Handler for Floating CRT Terminal
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  crt.handleKey(e, (command) => {
    crt.appendLog(`[DISPATCH] Executing: "${command}"`);

    // Send command via WebSocket bridge or direct POST
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "terminal_exec",
        command: command,
        timestamp: Date.now()
      }));
    } else {
      // Fallback local echo
      setTimeout(() => {
        crt.appendLog(`[LOCAL EXEC] Command dispatched: ${command} [OK]`);
      }, 300);
    }
  });
});

// Window Resize Handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 8. Main Animation & WebXR Render Loop
const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsTime = performance.now();

function animate() {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Update controls when not in VR session
  if (!renderer.xr.isPresenting) {
    controls.update();
  }

  // Starfield subtle rotation
  starfield.rotation.y = elapsed * 0.015;

  // Update Modules
  crt.update(delta, elapsed);
  movieForgePanel.update(delta, elapsed);
  unrealPanel.update(delta, elapsed);
  cadPanel.update(delta, elapsed);
  swarmPanel.update(delta, elapsed);
  worldStatePanel.update(delta, elapsed);
  realms.update(delta, elapsed);

  // FPS calculation
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    const fpsEl = document.getElementById("metric-fps");
    if (fpsEl) fpsEl.textContent = frameCount;
    frameCount = 0;
    lastFpsTime = now;
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
