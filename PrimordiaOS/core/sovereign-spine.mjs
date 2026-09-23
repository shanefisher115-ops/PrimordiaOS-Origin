/* ============================================================
   PRIMORDIAOS // SOVEREIGN SPINE
   Realm Registry + Sovereign Scheduler + Global State Spine
   + Safety Governor + Sovereign Command Bus
   Location: core/sovereign-spine.mjs
   ============================================================ */

import express from "express";
import { globalEventBus } from "./event-bus.mjs";

/* ============================================================
   CINEMATIC BOOT LOGS
   ============================================================ */

console.log("✦ [SovereignSpine] Igniting sovereign spine...");
console.log("✦ [SovereignSpine] Realm registry warming...");
console.log("✦ [SovereignSpine] Global state threads binding...");
console.log("✦ [SovereignSpine] Safety governor online...");
console.log("✦ [SovereignSpine] Command bus awaiting Architect...");

/* ============================================================
   EXPRESS SERVER (SOVEREIGN API SURFACE)
   ============================================================ */

const app = express();
app.use(express.json());

/* ============================================================
   GLOBAL STATE SPINE
   ============================================================ */

import { globalState } from "./global-state.mjs";

/* ============================================================
   REALM REGISTRY
   ============================================================ */

function registerRealm({ id, name, type, capabilities = [] }) {
  globalState.realms[id] = {
    id,
    name,
    type,
    capabilities,
    registeredAt: Date.now(),
    status: "online",
  };

  console.log(
    `✦ [RealmRegistry] Realm registered: ${name} (id=${id}, type=${type})`
  );

  globalEventBus.emit("primordia", "realm:registered", globalState.realms[id]);

  return globalState.realms[id];
}

function setRealmStatus(id, status) {
  if (!globalState.realms[id]) return;
  globalState.realms[id].status = status;
  globalState.realms[id].statusUpdatedAt = Date.now();

  console.log(`✦ [RealmRegistry] Realm ${id} status → ${status}`);

  globalEventBus.emit("primordia", "realm:status", {
    id,
    status,
  });
}

/* ============================================================
   DAEMON REGISTRY
   ============================================================ */

function registerDaemonMeta({ name, realm, description }) {
  globalState.daemons[name] = {
    name,
    realm,
    description,
    registeredAt: Date.now(),
    status: "online",
  };

  console.log(
    `✦ [DaemonRegistry] Daemon registered: ${name} (realm=${realm})`
  );

  globalEventBus.emit("primordia", "daemon:registered", globalState.daemons[name]);

  return globalState.daemons[name];
}

function setDaemonStatus(name, status) {
  if (!globalState.daemons[name]) return;
  globalState.daemons[name].status = status;
  globalState.daemons[name].statusUpdatedAt = Date.now();

  console.log(`✦ [DaemonRegistry] Daemon ${name} status → ${status}`);

  globalEventBus.emit("primordia", "daemon:status", {
    name,
    status,
  });
}

/* ============================================================
   SAFETY GOVERNOR
   ============================================================ */

const safetyConfig = {
  maxPulsePerMinute: 120,
  maxCommandsPerMinute: 300,
  blockedRealms: new Set(),
};

function rateLimitCheck(bucket, limit, label) {
  const now = Date.now();
  const windowMs = 60_000;
  const recent = bucket.filter((x) => now - x.ts < windowMs);

  if (recent.length >= limit) {
    console.warn(
      `✦ [SafetyGovernor] Rate limit exceeded for ${label}: ${recent.length}/${limit}`
    );
    return false;
  }

  bucket.length = 0;
  bucket.push(...recent);
  return true;
}

const pulseBucket = [];
const commandBucket = [];

function recordPulse(ts) {
  pulseBucket.push({ ts });
  return rateLimitCheck(pulseBucket, safetyConfig.maxPulsePerMinute, "pulse");
}

function recordCommand(ts) {
  commandBucket.push({ ts });
  return rateLimitCheck(
    commandBucket,
    safetyConfig.maxCommandsPerMinute,
    "command"
  );
}

function isRealmBlocked(id) {
  return safetyConfig.blockedRealms.has(id);
}

function blockRealm(id) {
  safetyConfig.blockedRealms.add(id);
  setRealmStatus(id, "blocked");
  console.warn(`✦ [SafetyGovernor] Realm BLOCKED: ${id}`);
}

function unblockRealm(id) {
  safetyConfig.blockedRealms.delete(id);
  setRealmStatus(id, "online");
  console.log(`✦ [SafetyGovernor] Realm UNBLOCKED: ${id}`);
}

/* ============================================================
   SOVEREIGN SCHEDULER
   ============================================================ */

let schedulerInterval = null;

function sovereignTick() {
  const ts = Date.now();

  if (!recordPulse(ts)) {
    console.warn("✦ [SovereignScheduler] Pulse suppressed by SafetyGovernor.");
    return;
  }

  const payload = { ts };

  globalState.pulses.push(payload);

  globalEventBus.emit("primordia", "sovereign:pulse", payload);
}

function startScheduler() {
  if (schedulerInterval) return;

  console.log("✦ [SovereignScheduler] Sovereign scheduler online.");
  schedulerInterval = setInterval(sovereignTick, 1000);
}

function stopScheduler() {
  if (!schedulerInterval) return;
  clearInterval(schedulerInterval);
  schedulerInterval = null;
  console.log("✦ [SovereignScheduler] Sovereign scheduler halted.");
}

/* ============================================================
   SOVEREIGN COMMAND BUS
   ============================================================ */

function dispatchCommand({ scope, target, action, payload }) {
  const ts = Date.now();

  const cmd = {
    scope,
    target,
    action,
    payload,
    ts,
  };

  if (!recordCommand(ts)) {
    console.warn("✦ [CommandBus] Command suppressed by SafetyGovernor.");
    return { ok: false, reason: "rate_limited" };
  }

  globalState.commands.push(cmd);

  if (scope === "primordia") {
    if (action === "register_realm") {
      registerRealm(payload);
    }
    if (action === "set_realm_status") {
      setRealmStatus(payload.id, payload.status);
    }

    globalEventBus.emit("primordia", "command", cmd);
  }

  if (scope === "realm") {
    globalEventBus.emit("primordia", "realm:command", cmd);
  }
  if (scope === "world") {
    globalEventBus.emit("unreal", "world:command", cmd);
  }
  if (scope === "cinema") {
    globalEventBus.emit("cinema", "command", cmd);
  }
  if (scope === "money") {
    globalEventBus.emit("money", "command", cmd);
  }

  console.log(
    `✦ [CommandBus] Command dispatched: scope=${scope}, target=${target}, action=${action}`
  );

  return { ok: true, command: cmd };
}

/* ============================================================
   API ROUTES
   ============================================================ */

app.get("/primordia/health", (req, res) => {
  globalState.health.lastCheck = Date.now();
  globalState.health.status = "online";
  res.json({ ok: true, health: globalState.health });
});

app.post("/primordia/realm/register", (req, res) => {
  const realm = registerRealm(req.body);
  res.json({ ok: true, realm });
});

app.post("/primordia/realm/status", (req, res) => {
  const { id, status } = req.body;
  setRealmStatus(id, status);
  res.json({ ok: true });
});

app.post("/primordia/realm/block", (req, res) => {
  const { id } = req.body;
  blockRealm(id);
  res.json({ ok: true });
});

app.post("/primordia/realm/unblock", (req, res) => {
  const { id } = req.body;
  unblockRealm(id);
  res.json({ ok: true });
});

app.post("/primordia/daemon/register", (req, res) => {
  const daemon = registerDaemonMeta(req.body);
  res.json({ ok: true, daemon });
});

app.post("/primordia/daemon/status", (req, res) => {
  const { name, status } = req.body;
  setDaemonStatus(name, status);
  res.json({ ok: true });
});

app.post("/primordia/command", (req, res) => {
  const result = dispatchCommand(req.body);
  res.json(result);
});

app.get("/primordia/state", (req, res) => {
  res.json({ ok: true, state: globalState });
});

/* ============================================================
   EVENT BUS LISTENERS
   ============================================================ */

globalEventBus.on("primordia", "runtime:ready", () => {
  console.log("✦ [SovereignSpine] Runtime ready pulse received. Starting scheduler.");
  startScheduler();
});

/* ============================================================
   SERVER START
   ============================================================ */

const PORT = 7000;

app.listen(PORT, () => {
  console.log(
    `✦ [SovereignSpine] Sovereign spine online at http://localhost:${PORT}`
  );
  console.log("✦ [SovereignSpine] Architect, your multiverse kernel is now active.");
});

/* ============================================================
   EXPORTS
   ============================================================ */

export {
  globalState,
  registerRealm,
  setRealmStatus,
  registerDaemonMeta,
  setDaemonStatus,
  blockRealm,
  unblockRealm,
  dispatchCommand,
  startScheduler,
  stopScheduler,
};
