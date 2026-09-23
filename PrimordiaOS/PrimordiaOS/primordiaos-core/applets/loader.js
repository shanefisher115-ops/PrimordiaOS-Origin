/* ============================================================
   PRIMORDIAOS APPLET LOADER — FULL MODULE
   ============================================================

   Purpose:
   Dynamically load applets from the PrimordiaOS Applet Registry.
   Applets may come from:
     - Spanner (Antigravity)
     - GitHub imports
     - Local modules
     - Remote modules

   Flow:
   Registry → Loader → Signal Matrix → EventBus → Cockpit
*/

import fs from "fs";
import path from "path";
import { emitSignal } from "../cockpit/signals/matrix.js";
import { dispatchEvent } from "../eventbus/index.js";

// ============================================================
//   REGISTRY PATH
// ============================================================
//
// You can store your registry JSON anywhere.
// This path assumes you keep it inside primordiaos-core.
//
const REGISTRY_PATH = path.join(
  process.cwd(),
  "primordiaos-core",
  "applets",
  "registry.json"
);

// ============================================================
//   LOAD REGISTRY
// ============================================================
function loadRegistry() {
  try {
    const raw = fs.readFileSync(REGISTRY_PATH, "utf-8");
    const parsed = JSON.parse(raw);

    console.log("\x1b[38;2;0;255;180m◆ APPLET LOADER — Registry loaded\x1b[0m");
    return parsed.applets || [];
  } catch (err) {
    console.error("Applet registry missing or unreadable:", err);
    return [];
  }
}

// ============================================================
//   VALIDATE APPLET ENTRY
// ============================================================
function validateApplet(applet) {
  const required = ["name", "description", "source", "runtimeType"];

  for (const field of required) {
    if (!applet[field]) {
      console.warn(
        `Applet ${applet.name || "UNKNOWN"} missing required field: ${field}`
      );
      return false;
    }
  }

  return true;
}

// ============================================================
//   RESOLVE APPLET RUNTIME
// ============================================================
//
// runtimeType:
//   1 → Electron / Web runtime
//   2 → Node backend runtime
//   3 → Mobile (React Native) runtime
//
function resolveRuntime(applet) {
  switch (applet.runtimeType) {
    case 1:
      return "desktop";
    case 2:
      return "core";
    case 3:
      return "mobile";
    default:
      return "unknown";
  }
}

// ============================================================
//   LOAD APPLET MODULE (LOCAL OR REMOTE)
// ============================================================
function loadAppletModule(applet) {
  try {
    const localPath = path.join(
      process.cwd(),
      "primordiaos-applets",
      applet.name,
      "index.js"
    );

    if (fs.existsSync(localPath)) {
      const module = require(localPath);
      console.log(
        `\x1b[38;2;180;0;255m◇ APPLET LOADER — Loaded local applet: ${applet.name}\x1b[0m`
      );
      return module;
    }

    console.warn(
      `Applet ${applet.name} has no local module. It may be remote-only.`
    );
    return null;
  } catch (err) {
    console.error(`Failed to load applet module ${applet.name}:`, err);
    return null;
  }
}

// ============================================================
//   REGISTER APPLET WITH SIGNAL MATRIX + EVENTBUS
// ============================================================
function registerApplet(applet, module) {
  const runtime = resolveRuntime(applet);

  emitSignal("applet.register", {
    name: applet.name,
    runtime,
    description: applet.description
  });

  dispatchEvent("applet_registered", {
    name: applet.name,
    runtime,
    moduleLoaded: !!module
  });

  console.log(
    `\x1b[38;2;0;255;180m◆ APPLET REGISTERED — ${applet.name} (${runtime})\x1b[0m`
  );
}

// ============================================================
//   MAIN LOADER FUNCTION
// ============================================================
export function loadApplets() {
  const registry = loadRegistry();

  const loaded = [];

  for (const applet of registry) {
    if (!validateApplet(applet)) continue;

    const module = loadAppletModule(applet);

    registerApplet(applet, module);

    loaded.push({
      ...applet,
      runtime: resolveRuntime(applet),
      module
    });
  }

  console.log(
    `\x1b[38;2;180;0;255m◇ APPLET LOADER — ${loaded.length} applets loaded\x1b[0m`
  );

  return loaded;
}

// ============================================================
//   EXPORT DEFAULT
// ============================================================
export default {
  loadApplets
};
