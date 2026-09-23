/* ==========================================
   PRIMORDIAOS OSMIUM MODULE (FULL FILE)
   ==========================================

   Purpose:
   Osmium is the ledger + scoring engine of PrimordiaOS.
   It records all system events, scores them, and provides
   a historical timeline of the OS’s behavior.

   Osmium does NOT make decisions.
   Osmium does NOT resolve conflicts.
   Osmium ONLY logs, scores, and stores events.

   This is a standalone Node.js service.
*/

import http from "http";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PRIMORDIA_OSMIUM_PORT || 3500;

// Middleware
app.use(cors());
app.use(express.json());

// ===============================
//   LEDGER STORAGE (in-memory)
// ===============================
const ledger = [];

// Utility: generate simple IDs
const createId = () => Math.random().toString(36).substring(2, 10);

// ===============================
//   SCORING ENGINE
// ===============================
//
// Scores events based on severity, domain, and type.
// This is intentionally simple and can be expanded.
//
function scoreEvent(event) {
  let score = 0;

  // Severity scoring
  if (event.severity === "high") score += 50;
  if (event.severity === "medium") score += 25;
  if (event.severity === "low") score += 5;

  // Domain scoring
  if (event.domain === "power") score += 20;
  if (event.domain === "thermal") score += 20;
  if (event.domain === "ui") score += 10;

  // Type scoring
  if (event.type === "evaluation") score += 15;
  if (event.type === "decision") score += 25;
  if (event.type === "workflow") score += 35;
  if (event.type === "resolution") score += 40;
  if (event.type === "telemetry") score += 5;

  return score;
}

// ===============================
//   HEALTH CHECK
// ===============================
app.get("/health", (req, res) => {
  res.json({
    module: "Osmium",
    status: "ok",
    port: PORT,
    ledgerEntries: ledger.length
  });
});

// ===============================
//   RECORD EVENT
// ===============================
//
// Example payload:
// {
//   "type": "evaluation",
//   "source": "visioncore",
//   "payload": { ... },
//   "severity": "high",
//   "domain": "power"
// }
//
app.post("/record", (req, res) => {
  const { type, source, payload, severity, domain } = req.body || {};

  if (!type || !source || !payload) {
    return res.status(400).json({
      error: "type, source, and payload are required"
    });
  }

  const event = {
    id: createId(),
    type,
    source,
    payload,
    severity: severity || "low",
    domain: domain || "none",
    score: scoreEvent({ type, severity, domain }),
    timestamp: new Date().toISOString()
  };

  ledger.push(event);

  res.json({
    message: "Event recorded",
    event
  });
});

// ===============================
//   GET LEDGER
// ===============================
app.get("/ledger", (req, res) => {
  res.json({
    count: ledger.length,
    items: ledger
  });
});

// ===============================
//   GET SCORED SUMMARY
// ===============================
//
// Returns total score + breakdown.
//
app.get("/summary", (req, res) => {
  let totalScore = 0;
  const breakdown = {};

  ledger.forEach((event) => {
    totalScore += event.score;

    if (!breakdown[event.type]) breakdown[event.type] = 0;
    breakdown[event.type] += event.score;
  });

  res.json({
    totalScore,
    breakdown,
    entries: ledger.length
  });
});

// ===============================
//   ROOT ROUTE
// ===============================
app.get("/", (req, res) => {
  res.json({
    module: "Osmium",
    description: "PrimordiaOS ledger + scoring engine",
    endpoints: {
      health: "/health",
      record: "/record",
      ledger: "/ledger",
      summary: "/summary"
    }
  });
});

// ===============================
//   START SERVER
// ===============================
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Osmium module running on port ${PORT}`);
});
