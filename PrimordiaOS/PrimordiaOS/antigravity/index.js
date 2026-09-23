// ==========================================
//   PRIMORDIAOS ANTIGRAVITY MODULE (FULL FILE)
// ==========================================
//
// Purpose:
// Antigravity is the consistency resolver for PrimordiaOS.
// It watches system state, detects conflicts between realms,
// modules, and behaviors, and emits a "resolved" state.
//
// This is a standalone Node.js service that can be called
// by Plugin-OS, Kernel, Vertex, or any other module.
//

import http from "http";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PRIMORDIA_ANTIGRAVITY_PORT || 3600;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory state for now (can be replaced with Osmium later)
const inconsistencies = [];
const resolutions = [];

// Utility: create a simple ID
const createId = () => Math.random().toString(36).substring(2, 10);

// Health check
app.get("/health", (req, res) => {
  res.json({
    module: "Antigravity",
    status: "ok",
    port: PORT,
    inconsistenciesTracked: inconsistencies.length,
    resolutionsEmitted: resolutions.length,
  });
});

// POST /detect
// Accepts a description of an inconsistency in the system.
// Example:
// {
//   "realm": "cockpit",
//   "type": "state_conflict",
//   "details": "Battery module says 'low', UI says 'normal'"
// }
app.post("/detect", (req, res) => {
  const { realm, type, details, metadata } = req.body || {};

  if (!realm || !type || !details) {
    return res.status(400).json({
      error: "realm, type, and details are required",
    });
  }

  const inconsistency = {
    id: createId(),
    realm,
    type,
    details,
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
  };

  inconsistencies.push(inconsistency);

  return res.status(201).json({
    message: "Inconsistency recorded",
    inconsistency,
  });
});

// POST /resolve
// Accepts a resolution for a previously detected inconsistency.
// Example:
// {
//   "inconsistencyId": "abc123",
//   "strategy": "prefer_battery_module",
//   "resultState": { "battery": "low", "uiIndicator": "warning" }
// }
app.post("/resolve", (req, res) => {
  const { inconsistencyId, strategy, resultState, metadata } = req.body || {};

  if (!inconsistencyId || !strategy || !resultState) {
    return res.status(400).json({
      error: "inconsistencyId, strategy, and resultState are required",
    });
  }

  const target = inconsistencies.find((i) => i.id === inconsistencyId);

  const resolution = {
    id: createId(),
    inconsistencyId,
    strategy,
    resultState,
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
    resolvedAgainst: target || null,
  };

  resolutions.push(resolution);

  return res.status(201).json({
    message: "Resolution recorded",
    resolution,
  });
});

// GET /inconsistencies
// Returns all tracked inconsistencies.
app.get("/inconsistencies", (req, res) => {
  res.json({
    count: inconsistencies.length,
    items: inconsistencies,
  });
});

// GET /resolutions
// Returns all recorded resolutions.
app.get("/resolutions", (req, res) => {
  res.json({
    count: resolutions.length,
    items: resolutions,
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    module: "Antigravity",
    description: "PrimordiaOS consistency resolver",
    endpoints: {
      health: "/health",
      detect: "/detect",
      resolve: "/resolve",
      inconsistencies: "/inconsistencies",
      resolutions: "/resolutions",
    },
  });
});

// Create HTTP server
const server = http.createServer(app);

// Start listening
server.listen(PORT, () => {
  console.log(`Antigravity module running on port ${PORT}`);
});
