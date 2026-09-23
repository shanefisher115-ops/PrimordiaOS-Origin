import { UEBridge } from "./ue-bridge.js";
import { UEEvents } from "./ue-events.js";

export function syncPulseWithUE(pulseState) {
  console.log(`?? [Pulse Sync ? UE] Transmitting pulse [${pulseState.toUpperCase()}] to Niagara & MetaSounds`);
  UEBridge.send(UEEvents.PULSE_SYNC, {
    state: pulseState,
    timestamp: Date.now(),
    intensity: pulseState === "void" ? 0.0 : 1.0
  });
}
