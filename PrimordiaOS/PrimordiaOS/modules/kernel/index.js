// PrimordiaOS Kernel Module (Fully Compatible Version)
// No fixed ports. No server. No EADDRINUSE. Implements start() + status().

let running = false;
let startedAt = null;
let heartbeatCount = 0;

// Read environment
const endpoint = process.env.PRIMORDIA_ENDPOINT || null;
const zeroTrust = process.env.ZERO_TRUST === "ENABLED";

// Simple logger
function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[PrimordiaOS:kernel] [${ts}] ${msg}`);
}

// Called by CLI: primordia start kernel
export function start() {
  if (running) {
    log("Kernel already running.");
    return;
  }

  running = true;
  startedAt = new Date().toISOString();

  log("Kernel STARTED.");
  log(`  started_at: ${startedAt}`);
  log(`  zero_trust_enabled: ${zeroTrust}`);
  log(`  endpoint: ${endpoint}`);

  // Keep kernel alive with heartbeat
  setInterval(() => {
    heartbeatCount++;
    log(`heartbeat #${heartbeatCount}`);
  }, 5000);
}

// Called by CLI: primordia status kernel
export function status() {
  return {
    running,
    started_at: startedAt,
    heartbeat_count: heartbeatCount,
    zero_trust_enabled: zeroTrust,
    endpoint
  };
}
