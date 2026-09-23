/* ============================================================
   PRIMORDIAOS COCKPIT SIGNAL MATRIX — FULL FILE
   ============================================================

   Purpose:
   Bind concrete input sources (keyboard, UI, agents, modules)
   into the EventBus, so the cockpit becomes a signal field.

   Flow:
   Inputs → Signal Matrix → EventBus → Command Router → Runtime → DB
*/

import eventbus from "../eventbus/index.js";

// ============================================================
//   EMERALD / VIOLET LOGGING
// ============================================================
function logEmerald(message, data = null) {
  console.log(`\x1b[38;2;0;255;180m◆ SIGNAL MATRIX — ${message}\x1b[0m`);
  if (data) console.log(data);
}

function logViolet(message, data = null) {
  console.log(`\x1b[38;2;180;0;255m◇ SIGNAL MATRIX — ${message}\x1b[0m`);
  if (data) console.log(data);
}

// ============================================================
//   KEYBOARD BINDINGS
// ============================================================
//
// These are abstract bindings; your actual UI layer can call
// these functions when keys are pressed.
//

export function handleKeyPress(key, meta = {}) {
  logEmerald("Keyboard signal", { key, meta });

  return eventbus.emit("keyboard", {
    key,
    meta
  });
}

// ============================================================
//   UI COMPONENT BINDINGS
// ============================================================
//
// Your UI layer (React, Svelte, plain DOM, etc.) can call these
// when buttons, toggles, sliders, etc. are activated.
//

export function handleUIClick(id, meta = {}) {
  logEmerald("UI click signal", { id, meta });

  return eventbus.emit("ui.click", {
    id,
    meta
  });
}

export function handleModeSwitch(mode, meta = {}) {
  logEmerald("Mode switch signal", { mode, meta });

  return eventbus.emit("cockpit.mode", {
    mode,
    meta
  });
}

export function handleRealmSwitch(realm, meta = {}) {
  logEmerald("Realm switch signal", { realm, meta });

  return eventbus.emit("cockpit.realm", {
    realm,
    meta
  });
}

// ============================================================
//   AGENT MODULE BINDINGS
// ============================================================
//
// Agents can call these to broadcast their internal events.
//

export function handleAgentSignal(agent, event, data = {}) {
  logEmerald("Agent signal", { agent, event, data });

  return eventbus.emit("agent.signal", {
    agent,
    event,
    data
  });
}

// ============================================================
//   GENERIC SIGNAL EMITTER
// ============================================================
//
// For any other module that wants to emit into the cockpit field.
//

export function emitSignal(type, payload = {}) {
  logEmerald("Generic signal", { type, payload });

  return eventbus.emit(type, payload);
}

// ============================================================
//   MODULE EXPORT
// ============================================================
export default {
  handleKeyPress,
  handleUIClick,
  handleModeSwitch,
  handleRealmSwitch,
  handleAgentSignal,
  emitSignal
};
