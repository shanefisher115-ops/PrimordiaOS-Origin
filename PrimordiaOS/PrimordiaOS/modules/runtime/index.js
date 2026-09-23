// PrimordiaOS Runtime Module
// Provides CLI health, module loader state, environment state.
// No ports. No servers. Fully compatible with PrimordiaOS CLI.

let running = false;
let startedAt = null;
let heartbeatCount = 0;

// Read environment
const endpoint = process.env.PRIMORDIA_ENDPOINT || null;
const zeroTrust = process.env.ZERO_TRUST === "ENABLED";

// Simple logger
function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[PrimordiaOS:runtime] [${ts}] ${msg}`);
}

// Called by CLI: primordia start runtime
export function start() {
  if (running) {
    log("Runtime already running.");
    return;
  }

  running = true;
  startedAt = new Date().toISOString();

  log("Runtime STARTED.");
  log(`  started_at: ${startedAt}`);
  log(`  zero_trust_enabled: ${zeroTrust}`);
  log(`  endpoint: ${endpoint}`);

  // Keep runtime alive with heartbeat
  setInterval(() => {
    heartbeatCount++;
    log(`heartbeat #${heartbeatCount}`);
  }, 4000);
}

// Called by CLI: primordia status runtime
export function status() {
  return {
    running,
    started_at: startedAt,
    heartbeat_count: heartbeatCount,
    zero_trust_enabled: zeroTrust,
    endpoint
  };
}
