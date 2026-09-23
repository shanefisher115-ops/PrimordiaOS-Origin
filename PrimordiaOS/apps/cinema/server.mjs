// ============================================================
//  VISIONCORE CINEMA SUITE // PRIMORDIAOS NARRATIVE ENGINE
//  Location: C:/Users/Shane/Documents/dev/PrimordiaOS/apps/cinema/server.mjs
//  Mode: Cinematic + Real
// ============================================================

import express from "express";
import { globalEventBus } from "../../core/event-bus.mjs";

// ============================================================
//  CINEMATIC BOOT LOGS
// ============================================================

console.log("✦ [CinemaSuite] Initializing VisionCore Narrative Engine...");
console.log("✦ [CinemaSuite] Emotion curves warming...");
console.log("✦ [CinemaSuite] Scene pulse threads aligning...");
console.log("✦ [CinemaSuite] DirectorAgent awaiting sovereign directive...");

// ============================================================
//  EXPRESS SERVER
// ============================================================

const app = express();
app.use(express.json());

// ============================================================
//  NARRATIVE ENGINE STATE
// ============================================================

const narrativeState = {
  scenes: [],
  pulses: [],
  emotionCurves: {},
};

// ============================================================
//  EMOTION CURVE ENGINE
// ============================================================

function generateEmotionCurve(curveName) {
  const curve = [];
  for (let i = 0; i < 10; i++) {
    curve.push(Math.sin(i / 2) * 0.7 + Math.random() * 0.3);
  }
  narrativeState.emotionCurves[curveName] = curve;
  return curve;
}

// ============================================================
//  SCENE ENGINE
// ============================================================

function createScene({ id, title, mood, intensity }) {
  const scene = {
    id,
    title,
    mood,
    intensity,
    created: Date.now(),
  };
  narrativeState.scenes.push(scene);

  globalEventBus.emit("cinema", "scene:created", scene);

  return scene;
}

// ============================================================
//  PULSE ENGINE
// ============================================================

function pulseScene(sceneId) {
  const pulse = {
    sceneId,
    ts: Date.now(),
    energy: Math.random() * 1.0,
  };

  narrativeState.pulses.push(pulse);

  globalEventBus.emit("cinema", "scene:pulse", pulse);

  return pulse;
}

// ============================================================
//  ROUTES
// ============================================================

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({ status: "CinemaSuite online", pulse: Date.now() });
});

// CREATE SCENE
app.post("/scene", (req, res) => {
  const scene = createScene(req.body);
  res.json({ ok: true, scene });
});

// EMOTION CURVE
app.post("/emotion", (req, res) => {
  const { name } = req.body;
  const curve = generateEmotionCurve(name);
  res.json({ ok: true, name, curve });
});

// PULSE SCENE
app.post("/pulse", (req, res) => {
  const { sceneId } = req.body;
  const pulse = pulseScene(sceneId);
  res.json({ ok: true, pulse });
});

// GET NARRATIVE STATE
app.get("/state", (req, res) => {
  res.json({ ok: true, narrativeState });
});

// ============================================================
//  EVENT BUS LISTENERS (CINEMATIC)
// ============================================================

globalEventBus.on("cinema", "init", () => {
  console.log("✦ [CinemaSuite] Realm initialization pulse received.");
});

globalEventBus.on("cinema", "scene:created", (scene) => {
  console.log(
    `✦ [CinemaSuite] Scene created: ${scene.title} (mood: ${scene.mood}, intensity: ${scene.intensity})`
  );
});

globalEventBus.on("cinema", "scene:pulse", (pulse) => {
  console.log(
    `✦ [CinemaSuite] Scene pulse: scene ${pulse.sceneId} energy=${pulse.energy.toFixed(
      2
    )}`
  );
});

// ============================================================
//  SERVER START
// ============================================================

const PORT = 7002;

app.listen(PORT, () => {
  console.log(
    `✦ [CinemaSuite] VisionCore Cinema Suite online at http://localhost:${PORT}`
  );
  console.log("✦ [CinemaSuite] Narrative engine ready for Architect input...");
});
