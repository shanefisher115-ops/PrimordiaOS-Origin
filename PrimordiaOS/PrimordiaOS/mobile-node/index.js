/* ============================================================
   PRIMORDIAOS MOBILE-NODE MODULE
   Android Termux Edge Node with Telemetry & Sensor Bridge
   ============================================================ */

const NAME = "MOBILE-NODE";
const VESSEL_ID = "vessel-termux-android";
const SPINE_PORT = process.env.SPINE_PORT || 3000;
const TELEMETRY_URL = `http://localhost:${SPINE_PORT}/api/telemetry/mobile`;
const INTERVAL = 2000;

export function collectSensorTelemetry() {
  return {
    vesselId: VESSEL_ID,
    realm: NAME,
    type: "heartbeat",
    timestamp: Date.now(),
    battery: {
      percentage: 85,
      plugged: "UNPLUGGED",
      temperature: 31.5
    },
    accelerometer: {
      x: 0.12,
      y: 9.78,
      z: 0.45
    },
    network: "WIFI",
    gps: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 4.2
    },
    cpu: {
      load: [1.2, 0.9, 0.7],
      memory_free_mb: 2450
    },
    thermal: "optimal"
  };
}

export async function forwardEvent(event = collectSensorTelemetry()) {
  try {
    const fetchFn = globalThis.fetch;
    if (typeof fetchFn !== "function") {
      throw new Error("global fetch is not available in current environment");
    }
    const res = await fetchFn(TELEMETRY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });
    console.log(`[${NAME}] Event forwarded to Spine: ${event.type || "telemetry"} (Status: ${res.status})`);
    return { success: true, status: res.status };
  } catch (err) {
    console.log(`[${NAME}] Failed to forward event to Spine (${err.message})`);
    return { success: false, error: err.message };
  }
}

export const sendTelemetry = forwardEvent;

export function start() {
  console.log(`[${NAME}] Online. Forwarding telemetry to ${TELEMETRY_URL}...`);
  return setInterval(() => {
    forwardEvent(collectSensorTelemetry());
  }, INTERVAL);
}

// Start if executed directly
if (process.argv[1] && process.argv[1].endsWith("mobile-node\\index.js")) {
  start();
}

