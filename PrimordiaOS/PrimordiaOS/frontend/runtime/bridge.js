/* ============================================================
   PRIMORDIAOS COCKPIT RUNTIME BRIDGE — FULL FILE
   ============================================================

   Purpose:
   Bind the Cockpit (UI / commands / agents) to the DB layer,
   so that runtime events, state changes, and logs are persisted.

   This is the "nervous system" bridge:
   Cockpit → Runtime → DB

   Dependencies:
   • ./../db/index.js  (the DB module you just wired up)
*/

import db from "../db/index.js";

// ============================================================
//   EMERALD / VIOLET LOGGING
// ============================================================
function logEmerald(message, data = null) {
  console.log(`\x1b[38;2;0;255;180m◆ COCKPIT RUNTIME — ${message}\x1b[0m`);
  if (data) console.log(data);
}

function logViolet(message, data = null) {
  console.log(`\x1b[38;2;180;0;255m◇ COCKPIT RUNTIME — ${message}\x1b[0m`);
  if (data) console.log(data);
}

// ============================================================
//   RUNTIME EVENT PERSISTENCE
// ============================================================
//
// Table assumptions (you can adjust names later):
//
//   cockpit_events
//   --------------
//   id           SERIAL PRIMARY KEY
//   type         TEXT NOT NULL
//   payload      JSONB
//   created_at   TIMESTAMPTZ DEFAULT NOW()
//
//   cockpit_state
//   -------------
//   id           SERIAL PRIMARY KEY
//   key          TEXT UNIQUE NOT NULL
//   value        JSONB
//   updated_at   TIMESTAMPTZ DEFAULT NOW()
//
// You can create these via migrations or manual SQL.
//

// Persist a single cockpit event (button press, agent action, etc.)
export async function recordCockpitEvent(type, payload = {}) {
  try {
    const sql = `
      INSERT INTO cockpit_events (type, payload)
      VALUES ($1, $2::jsonb)
      RETURNING id, created_at
    `;

    const params = [type, JSON.stringify(payload)];
    const result = await db.query(sql, params);

    const row = result.rows[0];

    logEmerald("Event recorded", {
      type,
      id: row.id,
      created_at: row.created_at
    });

    return row;
  } catch (err) {
    logViolet("Failed to record event", {
      type,
      payload,
      error: err.message
    });
    throw err;
  }
}

// Upsert cockpit state (current mode, active realm, agent status, etc.)
export async function setCockpitState(key, value = {}) {
  try {
    const sql = `
      INSERT INTO cockpit_state (key, value)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
      RETURNING id, updated_at
    `;

    const params = [key, JSON.stringify(value)];
    const result = await db.query(sql, params);

    const row = result.rows[0];

    logEmerald("State updated", {
      key,
      id: row.id,
      updated_at: row.updated_at
    });

    return row;
  } catch (err) {
    logViolet("Failed to set state", {
      key,
      value,
      error: err.message
    });
    throw err;
  }
}

// Retrieve cockpit state by key
export async function getCockpitState(key) {
  try {
    const sql = `
      SELECT value, updated_at
      FROM cockpit_state
      WHERE key = $1
    `;

    const params = [key];
    const result = await db.query(sql, params);

    if (result.rowCount === 0) {
      logViolet("State not found", { key });
      return null;
    }

    const row = result.rows[0];

    logEmerald("State retrieved", {
      key,
      updated_at: row.updated_at
    });

    return {
      key,
      value: row.value,
      updated_at: row.updated_at
    };
  } catch (err) {
    logViolet("Failed to get state", {
      key,
      error: err.message
    });
    throw err;
  }
}

// ============================================================
//   HIGH-LEVEL RUNTIME BRIDGE API
// ============================================================
//
// These are the functions your cockpit / agents / routes can call.
//

// Example: record a generic cockpit action
export async function bridgeCockpitAction(actionName, context = {}) {
  return recordCockpitEvent("cockpit.action", {
    action: actionName,
    context
  });
}

// Example: record an agent event
export async function bridgeAgentEvent(agentName, eventType, data = {}) {
  return recordCockpitEvent("agent.event", {
    agent: agentName,
    event: eventType,
    data
  });
}

// Example: set current realm
export async function bridgeSetRealm(realmName, meta = {}) {
  return setCockpitState("current_realm", {
    name: realmName,
    meta
  });
}

// Example: get current realm
export async function bridgeGetRealm() {
  return getCockpitState("current_realm");
}

// Example: set cockpit mode (e.g., "autonomous", "manual", "simulation")
export async function bridgeSetMode(modeName, meta = {}) {
  return setCockpitState("cockpit_mode", {
    mode: modeName,
    meta
  });
}

// Example: get cockpit mode
export async function bridgeGetMode() {
  return getCockpitState("cockpit_mode");
}

// ============================================================
//   MODULE EXPORTS
// ============================================================
export default {
  recordCockpitEvent,
  setCockpitState,
  getCockpitState,
  bridgeCockpitAction,
  bridgeAgentEvent,
  bridgeSetRealm,
  bridgeGetRealm,
  bridgeSetMode,
  bridgeGetMode
};
