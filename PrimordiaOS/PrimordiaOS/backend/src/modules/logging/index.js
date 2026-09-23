// logging/index.js
// PrimordiaOS Logging Module (Kernel‑Persistent)

import { PrimordiaKernel } from "../../kernel.js";

// -----------------------------------------------------
// Persistent State (loaded once, reused across commands)
// -----------------------------------------------------
const loggingState = PrimordiaKernel.getModuleState("logging", {
  running: false,
  started_at: null,
  logs: []
});

function save() {
  PrimordiaKernel.setModuleState("logging", loggingState);
}

// -----------------------------------------------------
// Commands
// -----------------------------------------------------

export function start() {
  if (loggingState.running) {
    console.log("[logging] Logging engine already running");
    return;
  }

  loggingState.running = true;
  loggingState.started_at = new Date().toISOString();
  save();

  console.log("[logging] Logging engine STARTED.");
  console.log("[logging] started_at:", loggingState.started_at);
}

export function stop() {
  if (!loggingState.running) {
    console.log("[logging] Logging engine is not running.");
    return;
  }

  loggingState.running = false;
  save();

  console.log("[logging] Logging engine STOPPED.");
}

export function status() {
  console.log("[logging] STATUS:");
  console.log("  running:", loggingState.running);
  console.log("  started_at:", loggingState.started_at);
  console.log("  buffered_logs:", loggingState.logs.length);
}

export function logDemo() {
  loggingState.logs.push({
    ts: new Date().toISOString(),
    msg: "demo log fired"
  });

  save();

  console.log("[logging] demo log fired");
}

// -----------------------------------------------------
// Command Map (supports dash‑style CLI commands)
// -----------------------------------------------------
export const commands = {
  "start": start,
  "stop": stop,
  "status": status,
  "log-demo": logDemo
};
