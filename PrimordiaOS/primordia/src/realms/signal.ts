// SignalRealm Engine — PrimordiaOS
// Handles cross-realm propagation, global signal amplification, and mesh routing.

import { emitSignal } from "../core/signals";

export interface SignalRealmState {
  pulses: number;
  globalCharge: number;
  propagationScore: number;
}

export const signalRealmState: SignalRealmState = {
  pulses: 0,
  globalCharge: 0,
  propagationScore: 0
};

export function processSignalRealm(weight: number, revenue: number, depth: number) {
  signalRealmState.pulses++;

  // Global charge increases with realm weight + revenue spikes
  signalRealmState.globalCharge =
    (signalRealmState.globalCharge * 0.92) +
    (revenue * 0.04) +
    (weight * 0.03);

  // Propagation score determines how strongly signals spread across realms
  signalRealmState.propagationScore =
    (signalRealmState.globalCharge * 0.15) +
    (depth * 0.01);

  // Emit SignalRealm pulse
  emitSignal("signal.pulse", {
    pulses: signalRealmState.pulses,
    globalCharge: signalRealmState.globalCharge,
    propagationScore: signalRealmState.propagationScore,
    revenue,
    weight,
    depth
  });

  return signalRealmState;
}
