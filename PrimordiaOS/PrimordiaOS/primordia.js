/* ============================================================
   PRIMORDIAOS MASTER TERMINAL FILE
   Compiles and executes all modules + Bus + Cockpit
   ============================================================ */

import { spawn } from "child_process";
import fetch from "node-fetch";

const BASE = "C:\\Users\\Shane\\PrimordiaOS";

const MODULES = [
  { name: "Message-Bus",      path: `${BASE}\\message-bus\\index.js`, port: 3001 },
  { name: "Runtime",          path: `${BASE}\\runtime\\orchestrator.js`, port: 3900 },
  { name: "Kernel",           path: `${BASE}\\kernel\\index.js`, port: 3000 },
  { name: "VisionCore",       path: `${BASE}\\visioncore\\index.js`, port: 3100 },
  { name: "Vertex",           path: `${BASE}\\vertex\\index.js`, port: 3200 },
  { name: "Generator",        path: `${BASE}\\generator\\index.js`, port: 3400 },
  { name: "Osmium",           path: `${BASE}\\osmium\\index.js`, port: 3500 },
  { name: "Plugin-OS",        path: `${BASE}\\plugin-os\\index.js`, port: 3601 },
  { name: "Mobile-Node",      path: `${BASE}\\mobile-node\\index.js`, port: 3700 },
  { name: "Cockpit",          path: `${BASE}\\cockpit`, port: 3800, type: "next" },
  { name: "Simulation-Bridge", path: `${BASE}\\simulation-bridge\\index.js`, port: 4000 }
];

const processes = {};

function startModule(mod) {
  console.log(`\n[BOOT] Starting ${mod.name}...`);

  let command, args;

  if (mod.type === "next") {
    command = "npm";
    args = ["run", "start"];
  } else {
    command = "node";
    args = [mod.path];
  }

  const proc = spawn(command, args, {
    cwd: BASE,
    stdio: "inherit"
  });

  processes[mod.name] = proc;

  proc.on("exit", (code) => {
    console.log(`[WARN] ${mod.name} exited with code ${code}. Restarting...`);
    startModule(mod);
  });
}

async function checkHealth(mod) {
  try {
    const path = mod.name === "Cockpit" ? "/api/health" : "/health";
    const res = await fetch(`http://localhost:${mod.port}${path}`);
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

async function waitForModule(mod) {
  let attempts = 0;

  while (attempts < 50) {
    const healthy = await checkHealth(mod);
    if (healthy) {
      console.log(`[OK] ${mod.name} is online`);
      return true;
    }
    attempts++;
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[FAIL] ${mod.name} failed to start`);
  return false;
}

async function boot() {
  console.log("=======================================");
  console.log("      PRIMORDIAOS MASTER TERMINAL");
  console.log("=======================================");

  for (const mod of MODULES) {
    startModule(mod);
    await waitForModule(mod);
  }

  console.log("\n=======================================");
  console.log("   PRIMORDIAOS BOOT COMPLETE");
  console.log("   All modules online");
  console.log("=======================================\n");
}

boot();
