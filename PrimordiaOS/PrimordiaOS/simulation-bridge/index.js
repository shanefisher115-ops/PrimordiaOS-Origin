/* ==========================================
   PRIMORDIAOS SIMULATION BRIDGE (FULL FILE)
   ==========================================

   Purpose:
   The Simulation Bridge is the real-time telemetry hub
   for PrimordiaOS. It receives WebSocket messages from
   Unreal Engine, Mobile Node, or any simulation source,
   stores the latest state, and exposes it via HTTP for
   Kernel, Cockpit, Plugin-OS, and other modules.

   This is a standalone Node.js service.
*/

import http from "http";
import express from "express";
import cors from "cors";
import WebSocket, { WebSocketServer } from "ws";

const app = express();
const PORT = process.env.PRIMORDIA_SIMULATION_BRIDGE_PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// ===============================
//   SIMULATION STATE (in-memory)
// ===============================
const simulationState = {
  lastUpdate: null,
  particles: [],
  agents: [],
  metrics: {},
  raw: {}
};

// Utility: generate simple IDs
const createId = () => Math.random().toString(36).substring(2, 10);

// ===============================
//   HEALTH CHECK
// ===============================
app.get("/health", (req, res) => {
  res.json({
    module: "Simulation-Bridge",
    status: "ok",
    port: PORT,
    lastUpdate: simulationState.lastUpdate
  });
});

// ===============================
//   GET SIMULATION STATE
// ===============================
app.get("/state", (req, res) => {
  res.json(simulationState);
});

// ===============================
//   POST MANUAL UPDATE (optional)
// ===============================
//
// Example payload:
// {
//   "particles": [...],
//   "agents": [...],
//   "metrics": { "fps": 120 }
// }
//
app.post("/update", (req, res) => {
  const { particles, agents, metrics, raw } = req.body || {};

  if (particles) simulationState.particles = particles;
  if (agents) simulationState.agents = agents;
  if (metrics) simulationState.metrics = metrics;
  if (raw) simulationState.raw = raw;

  simulationState.lastUpdate = new Date().toISOString();

  res.json({
    message: "Simulation state updated",
    simulationState
  });
});

// ===============================
//   ROOT ROUTE
// ===============================
app.get("/", (req, res) => {
  res.json({
    module: "Simulation-Bridge",
    description: "Real-time telemetry hub for PrimordiaOS",
    endpoints: {
      health: "/health",
      state: "/state",
      update: "/update"
    }
  });
});

// ===============================
//   CREATE HTTP SERVER
// ===============================
const server = http.createServer(app);

// ===============================
//   WEBSOCKET SERVER
// ===============================
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Simulation source connected");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      // Update simulation state
      simulationState.lastUpdate = new Date().toISOString();
      simulationState.particles = data.particles ?? simulationState.particles;
      simulationState.agents = data.agents ?? simulationState.agents;
      simulationState.metrics = data.metrics ?? simulationState.metrics;
      simulationState.raw = data;

    } catch (err) {
      console.error("Invalid simulation payload:", err);
    }
  });

  ws.on("close", () => {
    console.log("Simulation source disconnected");
  });
});

// ===============================
//   START SERVER
// ===============================
server.listen(PORT, () => {
  console.log(`Simulation-Bridge running on port ${PORT}`);
});
