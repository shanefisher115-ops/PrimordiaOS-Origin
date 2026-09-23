/* ==========================================
   PRIMORDIAOS GENERATOR MODULE (FULL FILE)
   ==========================================

   Purpose:
   Generator is the workflow creation engine of PrimordiaOS.
   It receives:
   - evaluations (VisionCore)
   - decisions (Vertex)

   And produces:
   - workflows
   - action packets
   - multi-step sequences

   Generator does NOT execute actions.
   Generator does NOT resolve conflicts.
   Generator ONLY generates structured workflows.

   This is a standalone Node.js service.
*/

import http from "http";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PRIMORDIA_GENERATOR_PORT || 3400;

// Middleware
app.use(cors());
app.use(express.json());

// ===============================
//   WORKFLOW HISTORY (in-memory)
// ===============================
const workflows = [];

// Utility: generate simple IDs
const createId = () => Math.random().toString(36).substring(2, 10);

// ===============================
//   HEALTH CHECK
// ===============================
app.get("/health", (req, res) => {
  res.json({
    module: "Generator",
    status: "ok",
    port: PORT,
    workflowsGenerated: workflows.length
  });
});

// ===============================
//   WORKFLOW GENERATION ENGINE
// ===============================
//
// Example payload:
// {
//   "source": "vertex",
//   "decision": {
//     "decisionType": "battery_low",
//     "payload": {
//       "action": "optimize_power",
//       "priority": "high",
//       "reason": "Battery below 20%"
//     }
//   },
//   "evaluation": {
//     "severity": "high",
//     "meaning": "battery critically low",
//     "domain": "power"
//   }
// }
//
app.post("/generate", (req, res) => {
  const { source, decision, evaluation } = req.body || {};

  if (!source || !decision || !evaluation) {
    return res.status(400).json({
      error: "source, decision, and evaluation are required"
    });
  }

  // ===============================
  //   BASIC WORKFLOW LOGIC
  // ===============================
  //
  // This is intentionally simple.
  // You can expand it later with:
  // - multi-step workflows
  // - conditional branches
  // - ML-driven workflow synthesis
  // - VisionCore scoring integration
  //

  let steps = [];
  let workflowType = "generic";

  // Battery workflow
  if (decision.decisionType === "battery_low") {
    workflowType = "power_optimization";

    steps = [
      {
        id: createId(),
        action: "reduce_screen_brightness",
        reason: "lower power consumption"
      },
      {
        id: createId(),
        action: "disable_background_sync",
        reason: "prevent unnecessary battery drain"
      },
      {
        id: createId(),
        action: "enable_power_saver_mode",
        reason: "battery critically low"
      }
    ];
  }

  // Thermal workflow
  if (decision.decisionType === "thermal_warning") {
    workflowType = "thermal_mitigation";

    steps = [
      {
        id: createId(),
        action: "reduce_cpu_load",
        reason: "prevent overheating"
      },
      {
        id: createId(),
        action: "limit_background_processes",
        reason: "reduce thermal output"
      },
      {
        id: createId(),
        action: "notify_user",
        reason: "device temperature high"
      }
    ];
  }

  // Fallback workflow
  if (steps.length === 0) {
    workflowType = "noop";

    steps = [
      {
        id: createId(),
        action: "none",
        reason: "no actionable workflow"
      }
    ];
  }

  // Build workflow packet
  const workflow = {
    id: createId(),
    source,
    workflowType,
    decision,
    evaluation,
    steps,
    timestamp: new Date().toISOString()
  };

  workflows.push(workflow);

  res.json({
    message: "Workflow generated",
    workflow
  });
});

// ===============================
//   GET WORKFLOW HISTORY
// ===============================
app.get("/workflows", (req, res) => {
  res.json({
    count: workflows.length,
    items: workflows
  });
});

// ===============================
//   ROOT ROUTE
// ===============================
app.get("/", (req, res) => {
  res.json({
    module: "Generator",
    description: "PrimordiaOS workflow generation engine",
    endpoints: {
      health: "/health",
      generate: "/generate",
      workflows: "/workflows"
    }
  });
});

// ===============================
//   START SERVER
// ===============================
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Generator module running on port ${PORT}`);
});
