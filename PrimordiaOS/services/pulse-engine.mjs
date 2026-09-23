// ============================================================
//  PRIMORDIAOS // PULSE ENGINE
//  Location: C:/Users/Shane/Documents/dev/PrimordiaOS/services/pulse-engine.mjs
//  Mode: Cinematic + Real
// ============================================================

import { globalEventBus } from "../core/event-bus.mjs";

// ============================================================
//  CINEMATIC BOOT LOGS
// ============================================================

console.log("✦ [PulseEngine] Initializing sovereign pulse lattice...");
console.log("✦ [PulseEngine] Harmonic overtones aligning...");
console.log("✦ [PulseEngine] Energy threads warming...");
console.log("✦ [PulseEngine] Awaiting PrimordiaOS runtime handshake...");

// ============================================================
//  STATE
// ============================================================

let pulseInterval = null;

const pulseState = {
  lastPulse: null,
  energy: 0,
  frequency: 1.0,
};

// ============================================================
//  INTERNAL: GENERATE PULSE
// ============================================================

function generatePulse() {
  const energy = Math.random() * 1.0;
  const ts = Date.now();

  pulseState.lastPulse = ts;
  pulseState.energy = energy;

  const payload = {
    ts,
    energy,
    frequency: pulseState.frequency,
  };

  console.log(
    `✦ [PulseEngine] Sovereign pulse emitted: energy=${energy.toFixed(2)}`
  );

  globalEventBus.emit("pulse", "tick", payload);
}

// ============================================================
//  START PULSE LOOP
// ============================================================

function startPulseLoop() {
  if (pulseInterval) return;

  console.log("✦ [PulseEngine] Pulse loop online (sovereign heartbeat).");

  pulseInterval = setInterval(() => {
    generatePulse();
  }, 1000 / pulseState.frequency);
}

// ============================================================
//  STOP PULSE LOOP
// ============================================================

function stopPulseLoop() {
  if (!pulseInterval) return;

  clearInterval(pulseInterval);
  pulseInterval = null;

  console.log("✦ [PulseEngine] Pulse loop halted.");
}

// ============================================================
//  EVENT BUS LISTENERS
// ============================================================

globalEventBus.on("primordia", "runtime:ready", () => {
  console.log("✦ [PulseEngine] Runtime ready pulse received.");
  startPulseLoop();
});

globalEventBus.on("pulse", "frequency:set", ({ frequency }) => {
  console.log(`✦ [PulseEngine] Frequency updated → ${frequency} Hz`);
  pulseState.frequency = frequency;

  // restart loop with new frequency
  stopPulseLoop();
  startPulseLoop();
});

// ============================================================
//  EXPORTS
// ============================================================

export function setPulseFrequency(freq) {
  globalEventBus.emit("pulse", "frequency:set", { frequency: freq });
}

export function getPulseState() {
  return pulseState;
}

console.log("✦ [PulseEngine] Service online. Awaiting sovereign directives...");
