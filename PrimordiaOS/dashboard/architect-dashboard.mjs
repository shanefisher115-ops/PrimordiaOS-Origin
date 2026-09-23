// ============================================================
//  PRIMORDIAOS // ARCHITECT DASHBOARD BACKEND
//  Location: C:/Users/Shane/Documents/dev/PrimordiaOS/dashboard/architect-dashboard.mjs
//  Mode: Cinematic + Real
// ============================================================

import express from "express";
import fetch from "node-fetch";
import { globalEventBus } from "../core/event-bus.mjs";

// ============================================================
//  ENDPOINTS FOR ALL REALMS
// ============================================================

const SOVEREIGN_URL = "http://localhost:7000";
const NARRATIVE_URL = "http://localhost:7003";
const MONEY_URL = "http://localhost:7001";
const CINEMA_URL = "http://localhost:7002";

// ============================================================
//  BOOT LOGS
// ============================================================

console.log("✦ [ArchitectDashboard] Initializing sovereign dashboard backend...");
console.log("✦ [ArchitectDashboard] Binding all realm telemetry...");
console.log("✦ [ArchitectDashboard] Awaiting Architect...");

// ============================================================
//  EXPRESS SERVER
// ============================================================

const app = express();
app.use(express.json());

// ============================================================
//  HELPERS
// ============================================================

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ============================================================
//  DASHBOARD ROUTES
// ============================================================

// FULL SOVEREIGN STATE
app.get("/sovereign", async (req, res) => {
  const data = await getJson(`${SOVEREIGN_URL}/primordia/state`);
  res.json({ ok: true, sovereign: data.state });
});

// REALMS
app.get("/realms", async (req, res) => {
  const data = await getJson(`${SOVEREIGN_URL}/primordia/state`);
  res.json({ ok: true, realms: data.state.realms });
});

// DAEMONS
app.get("/daemons", async (req, res) => {
  const data = await getJson(`${SOVEREIGN_URL}/primordia/state`);
  res.json({ ok: true, daemons: data.state.daemons });
});

// PULSES
app.get("/pulse", async (req, res) => {
  const data = await getJson(`${SOVEREIGN_URL}/primordia/state`);
  const pulses = data.state.pulses || [];
  res.json({ ok: true, pulses });
});

// NARRATIVE ORIGIN
app.get("/origin", async (req, res) => {
  const data = await getJson(`${NARRATIVE_URL}/state`);
  res.json({ ok: true, origin: data.state.originUniverse });
});

// SCENES
app.get("/scenes", async (req, res) => {
  const data = await getJson(`${NARRATIVE_URL}/state`);
  res.json({ ok: true, scenes: data.state.scenes });
});

// MONEY ENGINE
app.get("/money", async (req, res) => {
  const data = await getJson(`${MONEY_URL}/ledger`);
  res.json({ ok: true, ledger: data.ledger });
});

// CINEMA ENGINE
app.get("/cinema", async (req, res) => {
  const data = await getJson(`${CINEMA_URL}/state`);
  res.json({ ok: true, cinema: data.state });
});

// ============================================================
//  COMMAND DISPATCH
// ============================================================

app.post("/command", async (req, res) => {
  const result = await postJson(`${SOVEREIGN_URL}/primordia/command`, req.body);
  res.json(result);
});

// ============================================================
//  EVENT BUS TELEMETRY STREAM
// ============================================================

const telemetry = [];

globalEventBus.on("primordia", "sovereign:pulse", (pulse) => {
  telemetry.push({
    type: "pulse",
    ts: pulse.ts,
  });
});

globalEventBus.on("primordia", "realm:registered", (realm) => {
  telemetry.push({
    type: "realm_registered",
    realm,
    ts: Date.now(),
  });
});

globalEventBus.on("primordia", "realm:status", (payload) => {
  telemetry.push({
    type: "realm_status",
    payload,
    ts: Date.now(),
  });
});

globalEventBus.on("primordia", "daemon:registered", (daemon) => {
  telemetry.push({
    type: "daemon_registered",
    daemon,
    ts: Date.now(),
  });
});

globalEventBus.on("primordia", "daemon:status", (payload) => {
  telemetry.push({
    type: "daemon_status",
    payload,
    ts: Date.now(),
  });
});

// TELEMETRY FEED
app.get("/telemetry", (req, res) => {
  res.json({ ok: true, telemetry });
});

// ============================================================
//  SERVER START
// ============================================================

const PORT = 7004;

app.listen(PORT, () => {
  console.log(
    `✦ [ArchitectDashboard] Sovereign dashboard backend online at http://localhost:${PORT}`
  );
  console.log("✦ [ArchitectDashboard] Architect, your visual command center awaits.");
});
