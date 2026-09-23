/* ============================================================
   PRIMORDIAOS APPLET ACTIVATION SYSTEM — FULL MODULE
   ============================================================

   Purpose:
   Allow applets to be ACTIVATED inside PrimordiaOS realms.
   Activation triggers:
     - Signal Matrix events
     - EventBus dispatch
     - Runtime Bridge hooks
     - Optional applet module execution

   Flow:
   Cockpit → bindSignal("applet.activate") →
   Activation System → Signal Matrix → EventBus → Runtime
*/

import { emitSignal } from "../cockpit/signals/matrix.js";
import { dispatchEvent } from "../eventbus/index.js";
import path from "path";
import fs from "fs";

// ============================================================
//   REGISTRY PATH
// ============================================================
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
    return parsed.applets || [];
  } catch (err) {
    console.error("Applet registry missing:", err);
    return [];
  }
}

// ============================================================
//   FIND APPLET BY NAME
// ============================================================
function findApplet(name) {
  const registry = loadRegistry();
  return registry.find((a) => a.name === name) || null;
}

// ============================================================
//   LOAD APPLET MODULE (IF EXISTS)
// ============================================================
function loadAppletModule(name) {
  try {
    const modulePath = path.join(
      process.cwd(),
      "primordiaos-applets",
      name,
      "index.js"
    );

    if (fs.existsSync(modulePath)) {
      return require(modulePath);
    }

    return null;
  } catch (err) {
    console.error(`Failed to load applet module ${name}:`, err);
    return null;
  }
}

// ============================================================
//   ACTIVATE APPLET
// ============================================================
export function activateApplet(name, meta = {}) {
  const applet = findApplet(name);

  if (!applet) {
    console.warn(`Applet not found: ${name}`);
    return { success: false, error: "NOT_FOUND" };
  }

  const module = loadAppletModule(name);

  // ============================================================
  //   SIGNAL MATRIX — notify activation
  // ============================================================
  emitSignal("applet.activate", {
    name,
    runtimeType: applet.runtimeType,
    meta
  });

  // ============================================================
  //   EVENTBUS — dispatch activation event
  // ============================================================
  dispatchEvent("applet_activated", {
    name,
    runtimeType: applet.runtimeType,
    hasModule: !!module,
    meta
  });

  // ============================================================
  //   OPTIONAL MODULE EXECUTION
  // ============================================================
  if (module && typeof module.onActivate === "function") {
    try {
      module.onActivate(meta);
    } catch (err) {
      console.error(`Applet ${name} onActivate() failed:`, err);
    }
  }

  console.log(
    `\x1b[38;2;0;255;180m◆ APPLET ACTIVATED — ${name} (runtimeType ${applet.runtimeType})\x1b[0m`
  );

  return { success: true, name };
}

// ============================================================
//   EXPORT DEFAULT
// ============================================================
export default {
  activateApplet
};
