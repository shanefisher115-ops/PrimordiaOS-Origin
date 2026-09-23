// ============================================================
//  PRIMORDIAOS // UNIFIED BOOT DAEMON
//  Launches ALL realms + spine + orchestrator + dashboard
//  in ONE process, ONE terminal, ONE sovereign runtime.
// ============================================================

import { spawn } from "child_process";
import path from "path";

// Root directory
const ROOT = process.cwd();

// ============================================================
//  UTIL: SPAWN A DAEMON
// ============================================================

function startDaemon(label, file) {
  const fullPath = path.join(ROOT, file);

  console.log(`\n✦ [BOOT] Starting ${label} → ${file}`);

  const proc = spawn("node", [fullPath], {
    cwd: ROOT,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout.on("data", (data) => {
    process.stdout.write(`\x1b[36m[${label}]\x1b[0m ${data}`);
  });

  proc.stderr.on("data", (data) => {
    process.stdout.write(`\x1b[31m[${label} ERROR]\x1b[0m ${data}`);
  });

  proc.on("close", (code) => {
    console.log(`✦ [BOOT] ${label} exited with code ${code}`);
  });

  return proc;
}

// ============================================================
//  BOOT SEQUENCE
// ============================================================

console.log("==============================================");
console.log("✦ PRIMORDIAOS // UNIFIED BOOT DAEMON");
console.log("✦ Architect, your multiverse is igniting...");
console.log("==============================================");

// 1. Sovereign Spine (kernel)
startDaemon("SovereignSpine", "core/sovereign-spine.mjs");

// 2. Realm Orchestrator
startDaemon("RealmOrchestrator", "core/realm-orchestrator.mjs");

// 3. Pulse Engine
startDaemon("PulseEngine", "services/pulse-engine.mjs");

// 4. MoneyPlugHub
startDaemon("MoneyPlugHub", "apps/moneyplughub/server.mjs");

// 5. Cinema Suite
startDaemon("CinemaSuite", "apps/cinema/server.mjs");

// 6. Narrative Master
startDaemon("NarrativeMaster", "services/narrative-master.mjs");

// 7. Unreal Bridge
startDaemon("UnrealBridge", "services/unreal-bridge.mjs");

// 8. Dashboard Backend
startDaemon("DashboardBackend", "dashboard/architect-dashboard.mjs");

// ============================================================
//  FINAL MESSAGE
// ============================================================

console.log("\n==============================================");
console.log("✦ ALL REALMS ONLINE");
console.log("✦ Sovereign Spine active at http://localhost:7000");
console.log("✦ Dashboard Backend active at http://localhost:7004");
console.log("✦ Run `npm run dev` inside /dashboard for UI");
console.log("✦ Run `node cli/architect-console.mjs` for CLI");
console.log("==============================================\n");

console.log("✦ PrimordiaOS unified runtime is now ALIVE.");
console.log("✦ Architect, your multiverse awaits your command.");
