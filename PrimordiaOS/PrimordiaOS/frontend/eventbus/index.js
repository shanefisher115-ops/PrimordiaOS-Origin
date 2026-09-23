/* ============================================================
   PRIMORDIAOS COCKPIT EVENTBUS — FULL FILE
   ============================================================

   Purpose:
   The EventBus listens to cockpit-level events (keyboard,
   UI interactions, agent signals, module broadcasts) and
   routes them into the Command Router.

   This is the circulatory system:
   Inputs → EventBus → Command Router → Runtime Bridge → DB
*/

import { routeCommand } from "../router/commands.js";

// ============================================================
//   EMERALD / VIOLET LOGGING
// ============================================================
function logEmerald(message, data = null) {
  console.log(`\x1b[38;2;0;255;180m◆ EVENTBUS — ${message}\x1b[0m`);
  if (data) console.log(data);
}

function logViolet(message, data = null) {
  console.log(`\x1b[38;2;180;0;255m◇ EVENTBUS — ${message}\x1b[0m`);
  if (data) console.log(data);
}

// ============================================================
//   INTERNAL SUBSCRIBER REGISTRY
// ============================================================
//
//   eventType → [callbacks]
//
const subscribers = {};

// ============================================================
//   SUBSCRIBE
// ============================================================
//
//   eventbus.subscribe("keyboard", callback)
//   eventbus.subscribe("ui.click", callback)
//   eventbus.subscribe("agent.signal", callback)
//
export function subscribe(eventType, callback) {
  if (!subscribers[eventType]) {
    subscribers[eventType] = [];
  }

  subscribers[eventType].push(callback);

  logEmerald("Subscribed", { eventType });
}

// ============================================================
//   EMIT
// ============================================================
//
//   eventbus.emit("keyboard", { key: "F1" })
//   eventbus.emit("ui.click", { id: "boost" })
//
export async function emit(eventType, payload = {}) {
  logEmerald("Event emitted", { eventType, payload });

  const subs = subscribers[eventType] || [];

  for (const cb of subs) {
    try {
      await cb(payload);
    } catch (err) {
      logViolet("Subscriber error", {
        eventType,
        error: err.message
      });
    }
  }

  // After subscribers run, route into Command Router
  await forwardToCommandRouter(eventType, payload);
}

// ============================================================
//   FORWARD TO COMMAND ROUTER
// ============================================================
//
//   Converts raw events into cockpit commands.
//   This is where the EventBus becomes part of the OS.
//
async function forwardToCommandRouter(eventType, payload) {
  try {
    switch (eventType) {
      // --------------------------------------------------------
      // Keyboard Events
      // --------------------------------------------------------
      case "keyboard":
        return await routeCommand({
          type: "action",
          payload: {
            name: "keyboard",
            context: payload
          }
        });

      // --------------------------------------------------------
      // UI Clicks
      // --------------------------------------------------------
      case "ui.click":
        return await routeCommand({
          type: "action",
          payload: {
            name: "ui.click",
            context: payload
          }
        });

      // --------------------------------------------------------
      // Agent Signals
      // --------------------------------------------------------
      case "agent.signal":
        return await routeCommand({
          type: "agent_event",
          payload: {
            agent: payload.agent,
            event: payload.event,
            data: payload.data || {}
          }
        });

      // --------------------------------------------------------
      // Cockpit Mode Switch
      // --------------------------------------------------------
      case "cockpit.mode":
        return await routeCommand({
          type: "set_mode",
          payload: {
            mode: payload.mode,
            meta: payload.meta || {}
          }
        });

      // --------------------------------------------------------
      // Realm Switch
      // --------------------------------------------------------
      case "cockpit.realm":
        return await routeCommand({
          type: "set_realm",
          payload: {
            realm: payload.realm,
            meta: payload.meta || {}
          }
        });

      // --------------------------------------------------------
      // Default: Generic Action
      // --------------------------------------------------------
      default:
        return await routeCommand({
          type: "action",
          payload: {
            name: eventType,
            context: payload
          }
        });
    }
  } catch (err) {
    logViolet("Command routing failed", {
      eventType,
      payload,
      error: err.message
    });
    throw err;
  }
}

// ============================================================
//   MODULE EXPORT
// ============================================================
export default {
  subscribe,
  emit
};
