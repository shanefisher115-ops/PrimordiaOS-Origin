// ======================================================
// PRIMORDIALOS MAIN — VISUAL + PHYSICS UPGRADE EDITION
// Antigravity v11.0 — Smooth PID, Stability Modeling,
// Waveform-Friendly Lift Output, Cockpit Telemetry Sync
// ======================================================

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const http = require("http");

// ======================================================
// AGENT CORE
// ======================================================
class AgentCore {
  constructor() {
    this.agents = {};
  }
  register(name, handler) {
    this.agents[name] = handler;
    console.log(`[AgentCore] Registered: ${name}`);
  }
  async run(name, payload) {
    const agent = this.agents[name];
    if (!agent) throw new Error(`Agent '${name}' not found`);
    return agent(payload);
  }
}

const agentCore = new AgentCore();

// ======================================================
// BASE AGENTS (Realm + Cognition)
// ======================================================
async function simAgent(payload) {
  const tick = payload.tick ?? 0;
  return {
    telemetry: {
      realmLoad: 40 + (tick % 20),
      tension: 60 + (tick % 30),
      focus: ["idle", "scanning", "processing"][tick % 3]
    }
  };
}

async function realmAgent(payload) {
  const tick = payload.tick ?? 0;
  return {
    telemetry: {
      realmLoad: Math.floor(Math.sin(tick / 10) * 40 + 50)
    }
  };
}

async function cognitionAgent(payload) {
  const tick = payload.tick ?? 0;
  const states = ["idle", "scanning", "processing", "routing"];
  return {
    telemetry: {
      focus: states[tick % states.length]
    }
  };
}

// ======================================================
// ANTIGRAVITY PHYSICS v11.0 — Smooth, Visual-Friendly
// ======================================================
const ag = {
  mass: 1000,
  fieldStrength: 0,
  lift: 0,
  tension: 0,
  stability: 100,
  energyDraw: 0,
  autoHover: false,

  pid: {
    kp: 0.4,
    ki: 0.02,
    kd: 0.15,
    integral: 0,
    lastError: 0
  }
};

function applyControl(control) {
  if (!control) return;

  if (typeof control.fieldStrengthDelta === "number") {
    ag.fieldStrength += control.fieldStrengthDelta;
  }

  if (typeof control.massDelta === "number") {
    ag.mass = Math.max(100, ag.mass + control.massDelta);
  }

  if (typeof control.autoHover === "boolean") {
    ag.autoHover = control.autoHover;
  }

  if (typeof control.kp === "number") ag.pid.kp = control.kp;
  if (typeof control.ki === "number") ag.pid.ki = control.ki;
  if (typeof control.kd === "number") ag.pid.kd = control.kd;
}

function updateAntigravity(tick) {
  ag.fieldStrength = Math.max(0, Math.min(100, ag.fieldStrength));

  const rawLift = (ag.fieldStrength * 12) / ag.mass;
  ag.lift = rawLift * 1200;

  ag.energyDraw = Math.round(ag.fieldStrength ** 2 * 0.12);

  const targetLift = ag.mass * 9.8;
  const liftError = ag.lift - targetLift;
  const absError = Math.abs(liftError);

  ag.tension = Math.min(100, Math.round(absError / targetLift * 180));

  const oscillation = Math.sin(tick / 18) * 8;
  ag.stability = Math.max(
    0,
    Math.min(100, 100 - ag.tension + oscillation)
  );

  if (ag.autoHover) {
    const dt = 0.5;
    const pid = ag.pid;

    pid.integral += liftError * dt;
    const derivative = (liftError - pid.lastError) / dt;
    pid.lastError = liftError;

    const output = pid.kp * liftError + pid.ki * pid.integral + pid.kd * derivative;
    ag.fieldStrength += output * 0.0004;
  }
}

async function antigravityAgent(payload) {
  const tick = payload.tick ?? 0;
  const control = payload.control || null;

  applyControl(control);
  updateAntigravity(tick);

  return {
    telemetry: {
      fieldStrength: Math.round(ag.fieldStrength),
      mass: ag.mass,
      lift: Math.round(ag.lift),
      tension: Math.round(ag.tension),
      stability: Math.round(ag.stability),
      energyDraw: ag.energyDraw,
      autoHover: ag.autoHover,
      pid: {
        kp: ag.pid.kp,
        ki: ag.pid.ki,
        kd: ag.pid.kd
      }
    }
  };
}

agentCore.register("sim", simAgent);
agentCore.register("realm", realmAgent);
agentCore.register("cognition", cognitionAgent);
agentCore.register("antigravity", antigravityAgent);

// ======================================================
// COGNITIVE KERNEL
// ======================================================
class CognitiveKernel {
  constructor() {
    this.mode = "idle";
    this.queue = [];
    this.memory = {
      lastTelemetry: {},
      modeHistory: []
    };
  }

  setMode(mode) {
    this.mode = mode;
    this.memory.modeHistory.push({ mode, ts: Date.now() });
    console.log(`[Kernel] Mode → ${mode}`);
  }

  enqueue(task, priority = 1) {
    this.queue.push({ task, priority });
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  nextTask(tick) {
    if (this.queue.length > 0) {
      const { task } = this.queue.shift();
      return task;
    }

    switch (this.mode) {
      case "scan": return { agent: "cognition", payload: { tick } };
      case "load": return { agent: "realm", payload: { tick } };
      case "antigravity": return { agent: "antigravity", payload: { tick } };
      case "external": return { agent: "sim", payload: { tick } };
      default: return { agent: "sim", payload: { tick } };
    }
  }

  adaptModeFromTelemetry(t) {
    if (t.stability < 40) this.setMode("antigravity");
    else if (t.realmLoad >= 80) this.setMode("load");
    else if (t.tension >= 80) this.setMode("antigravity");
    else if (t.realmLoad <= 30 && t.tension <= 30) this.setMode("scan");
    else this.setMode("idle");

    this.memory.lastTelemetry = t;
  }
}

const kernel = new CognitiveKernel();

// ======================================================
// COMMAND ROUTER
// ======================================================
class CommandRouter {
  constructor() {
    this.handlers = {};
  }
  register(type, handler) {
    if (!this.handlers[type]) this.handlers[type] = [];
    this.handlers[type].push(handler);
  }
  async route(cmd) {
    const list = this.handlers[cmd.type] || [];
    for (const h of list) await h(cmd);
  }
}

const router = new CommandRouter();

router.register("RUN_AGENT", async ({ payload }) => {
  const { agent, data } = payload;
  const result = await agentCore.run(agent, data);
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send("ui-update", result.telemetry || {});
});

router.register("MODE_CHANGE", async ({ payload }) => {
  kernel.setMode(payload.mode);
});

router.register("ANTIGRAVITY_CONTROL", async ({ payload }) => {
  kernel.enqueue(
    { agent: "antigravity", payload: { tick: Date.now(), control: payload } },
    5
  );
  kernel.setMode("antigravity");
});

// ======================================================
// EXTERNAL CONTROL SERVER
// ======================================================
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/antigravity-control") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        kernel.enqueue(
          { agent: "antigravity", payload: { tick: Date.now(), control: data } },
          5
        );
        kernel.setMode("antigravity");
        res.writeHead(200);
        res.end("OK");
      } catch {
        res.writeHead(400);
        res.end("Invalid JSON");
      }
    });
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(5050, () => {
  console.log("[Kernel] External Control Server on 5050");
});

// ======================================================
// ELECTRON WINDOW
// ======================================================
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "index.html"));
  win.webContents.openDevTools();
}

ipcMain.on("primordial-command", (_event, cmd) => router.route(cmd));

// ======================================================
// AUTONOMOUS LOOP
// ======================================================
let tick = 0;

setInterval(async () => {
  tick++;

  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;

  const task = kernel.nextTask(tick);
  const result = await agentCore.run(task.agent, task.payload);

  const telemetry = {
    ...result.telemetry,
    mode: kernel.mode,
    tick
  };

  kernel.adaptModeFromTelemetry(telemetry);

  win.webContents.send("ui-update", telemetry);
}, 500);

// ======================================================
// APP LIFECYCLE
// ======================================================
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
