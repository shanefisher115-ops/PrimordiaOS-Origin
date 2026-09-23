/* ============================================================
   PRIMORDIAOS COCKPIT RUNTIME SCHEMA — FULL FILE
   ============================================================

   Creates the two core tables required by the Cockpit Runtime
   Bridge: cockpit_events and cockpit_state.

   These tables form the persistent nervous system of PrimordiaOS.
*/

/* ============================================================
   TABLE: cockpit_events
   ============================================================

   Stores every cockpit action, agent event, or runtime signal.
*/

CREATE TABLE IF NOT EXISTS cockpit_events (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

/* ============================================================
   TABLE: cockpit_state
   ============================================================

   Stores persistent key/value state for cockpit mode, realm,
   agent status, etc. Upserted by the Runtime Bridge.
*/

CREATE TABLE IF NOT EXISTS cockpit_state (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
