// ============================================================
//  PRIMORDIAOS // NARRATIVE MASTER
//  DirectorAgent + EmotionCurves + NarrativeEngine + OriginUniverse
//  Location: C:/Users/Shane/Documents/dev/PrimordiaOS/services/narrative-master.mjs
// ============================================================

import express from "express";
import { globalEventBus } from "../core/event-bus.mjs";

// ============================================================
//  CINEMATIC BOOT LOGS
// ============================================================

console.log("✦ [NarrativeMaster] Initializing sovereign narrative stack...");
console.log("✦ [NarrativeMaster] DirectorAgent awakening...");
console.log("✦ [NarrativeMaster] Emotion curves warming...");
console.log("✦ [NarrativeMaster] Origin universe scaffolding...");
console.log("✦ [NarrativeMaster] Awaiting Architect input...");

// ============================================================
//  EXPRESS SERVER
// ============================================================

const app = express();
app.use(express.json());

// ============================================================
//  SHARED STATE
// ============================================================

const state = {
  scenes: [],
  pulses: [],
  emotionCurves: {},
  originUniverse: {
    id: "primordia-origin",
    created: Date.now(),
    realms: [],
    metadata: {},
  },
  director: {
    mode: "idle",
    lastDirective: null,
  },
};

// ============================================================
//  EMOTION CURVES
// ============================================================

function generateEmotionCurve(name) {
  const curve = [];
  for (let i = 0; i < 16; i++) {
    curve.push(Math.sin(i / 2.5) * 0.7 + Math.random() * 0.3);
  }
  state.emotionCurves[name] = curve;

  console.log(`✦ [EmotionCurves] Generated curve: ${name}`);
  globalEventBus.emit("cinema", "emotion:curve:generated", { name, curve });

  return curve;
}

// ============================================================
//  NARRATIVE ENGINE (SCENES + PULSES)
// ============================================================

function createScene({ id, title, mood, intensity }) {
  const scene = {
    id,
    title,
    mood,
    intensity,
    created: Date.now(),
  };
  state.scenes.push(scene);

  console.log(
    `✦ [NarrativeEngine] Scene created: ${title} (mood=${mood}, intensity=${intensity})`
  );
  globalEventBus.emit("cinema", "scene:created", scene);

  return scene;
}

function pulseScene(sceneId) {
  const pulse = {
    sceneId,
    ts: Date.now(),
    energy: Math.random(),
  };
  state.pulses.push(pulse);

  console.log(
    `✦ [NarrativeEngine] Scene pulse: scene=${sceneId}, energy=${pulse.energy.toFixed(
      2
    )}`
  );
  globalEventBus.emit("cinema", "scene:pulse", pulse);

  return pulse;
}

// ============================================================
//  ORIGIN UNIVERSE
// ============================================================

function addRealmToOrigin({ id, name, type }) {
  const realm = {
    id,
    name,
    type,
    bound: Date.now(),
  };
  state.originUniverse.realms.push(realm);

  console.log(
    `✦ [OriginUniverse] Realm bound: ${name} (type=${type}, id=${id})`
  );
  globalEventBus.emit("primordia", "origin:realm:bound", realm);

  return realm;
}

function setOriginMetadata(metadata) {
  state.originUniverse.metadata = {
    ...state.originUniverse.metadata,
    ...metadata,
  };

  console.log("✦ [OriginUniverse] Metadata updated.");
  globalEventBus.emit("primordia", "origin:metadata:updated", {
    metadata: state.originUniverse.metadata,
  });

  return state.originUniverse.metadata;
}

// ============================================================
//  DIRECTOR AGENT
// ============================================================

function setDirectorMode(mode) {
  state.director.mode = mode;
  console.log(`✦ [DirectorAgent] Mode set → ${mode}`);
  globalEventBus.emit("cinema", "director:mode:set", { mode });
}

function issueDirective(directive) {
  state.director.lastDirective = {
    directive,
    ts: Date.now(),
  };

  console.log(
    `✦ [DirectorAgent] Directive issued: ${JSON.stringify(directive)}`
  );
  globalEventBus.emit("cinema", "director:directive", state.director.lastDirective);

  // Simple behavior: auto-create scene if directive contains title
  if (directive.scene) {
    createScene(directive.scene);
  }

  return state.director.lastDirective;
}

// ============================================================
//  ROUTES
// ============================================================

// HEALTH
app.get("/health", (req, res) => {
  res.json({ status: "NarrativeMaster online", pulse: Date.now() });
});

// EMOTION CURVES
app.post("/emotion/curve", (req, res) => {
  const { name } = req.body;
  const curve = generateEmotionCurve(name);
  res.json({ ok: true, name, curve });
});

// SCENES
app.post("/scene", (req, res) => {
  const scene = createScene(req.body);
  res.json({ ok: true, scene });
});

app.post("/scene/pulse", (req, res) => {
  const { sceneId } = req.body;
  const pulse = pulseScene(sceneId);
  res.json({ ok: true, pulse });
});

// ORIGIN UNIVERSE
app.post("/origin/realm", (req, res) => {
  const realm = addRealmToOrigin(req.body);
  res.json({ ok: true, realm });
});

app.post("/origin/metadata", (req, res) => {
  const metadata = setOriginMetadata(req.body);
  res.json({ ok: true, metadata });
});

// DIRECTOR AGENT
app.post("/director/mode", (req, res) => {
  const { mode } = req.body;
  setDirectorMode(mode);
  res.json({ ok: true, mode });
});

app.post("/director/directive", (req, res) => {
  const directive = issueDirective(req.body);
  res.json({ ok: true, directive });
});

// FULL STATE
app.get("/state", (req, res) => {
  res.json({ ok: true, state });
});

// ============================================================
//  EVENT BUS LISTENERS (CINEMATIC)
// ============================================================

globalEventBus.on("cinema", "init", () => {
  console.log("✦ [NarrativeMaster] Cinema realm init pulse received.");
});

globalEventBus.on("primordia", "runtime:ready", () => {
  console.log("✦ [NarrativeMaster] Runtime ready. DirectorAgent standing by.");
});

// ============================================================
//  SERVER START
// ============================================================

const PORT = 7003;

app.listen(PORT, () => {
  console.log(
    `✦ [NarrativeMaster] Sovereign narrative stack online at http://localhost:${PORT}`
  );
  console.log("✦ [NarrativeMaster] Architect, your stories are ready to be summoned.");
});
