/* ============================================================
   PRIMORDIAOS COCKPIT COMMAND ROUTER — FULL FILE
   ============================================================

   Purpose:
   This router receives cockpit commands (UI actions, hotkeys,
   agent triggers, mode switches) and routes them into the
   Cockpit Runtime Bridge, which persists them into the DB.

   This is the spinal cord:
   Cockpit → Command Router → Runtime Bridge → DB
*/

import {
  bridgeCockpitAction,
  bridgeAgentEvent,
  bridgeSetRealm,
  bridgeGetRealm,
  bridgeSetMode,
  bridgeGetMode
} from "../runtime/bridge.js";

// ============================================================
//   EMERALD / VIOLET LOGGING
// ============================================================
function logEmerald(message, data = null) {
  console.log(`\x1b[38;2;0;255;180m◆ COMMAND ROUTER — ${message}\x1b[0m`);
  if (data) console.log(data);
}

function logViolet(message, data = null) {
  console.log(`\x1b[38;2;180;0;255m◇ COMMAND ROUTER — ${message}\x1b[0m`);
  if (data) console.log(data);
}

// ============================================================
//   COMMAND ROUTER CORE
// ============================================================
//
// Every cockpit command flows through here.
// Commands are simple objects:
//
//   {
//     type: "set_mode",
//     payload: { mode: "autonomous" }
//   }
//
// The router interprets them and calls the correct bridge fn.
//

export async function routeCommand(command) {
  const { type, payload = {} } = command;

  logEmerald("Routing command", { type, payload });

  try {
    switch (type) {
      // --------------------------------------------------------
      // Cockpit Mode
      // --------------------------------------------------------
      case "set_mode":
        return await bridgeSetMode(payload.mode, payload.meta);

      case "get_mode":
        return await bridgeGetMode();

      // --------------------------------------------------------
      // Realm Switching
      // --------------------------------------------------------
      case "set_realm":
        return await bridgeSetRealm(payload.realm, payload.meta);

      case "get_realm":
        return await bridgeGetRealm();

      // --------------------------------------------------------
      // Agent Events
      // --------------------------------------------------------
      case "agent_event":
        return await bridgeAgentEvent(
          payload.agent,
          payload.event,
          payload.data
        );

      // --------------------------------------------------------
      // Generic Cockpit Actions
      // --------------------------------------------------------
      case "action":
        return await bridgeCockpitAction(payload.name, payload.context);

      // --------------------------------------------------------
      // Unknown Command
      // --------------------------------------------------------
      default:
        logViolet("Unknown command type", { type });
        throw new Error(`Unknown cockpit command: ${type}`);
    }
  } catch (err) {
    logViolet("Command routing failed", {
      type,
      payload,
      error: err.message
    });
    throw err;
  }
}

// ============================================================
//   HIGH-LEVEL API (Optional)
// ============================================================
//
// These helpers let your cockpit call commands directly.
//

export async function sendMode(mode, meta = {}) {
  return routeCommand({
    type: "set_mode",
    payload: { mode, meta }
  });
}

export async function sendRealm(realm, meta = {}) {
  return routeCommand({
    type: "set_realm",
    payload: { realm, meta }
  });
}

export async function sendAgentEvent(agent, event, data = {}) {
  return routeCommand({
    type: "agent_event",
    payload: { agent, event, data }
  });
}

export async function sendAction(name, context = {}) {
  return routeCommand({
    type: "action",
    payload: { name, context }
  });
}

// ============================================================
//   MODULE EXPORTS
// ============================================================
export default {
  routeCommand,
  sendMode,
  sendRealm,
  sendAgentEvent,
  sendAction
};
