// VisionRealm Engine — PrimordiaOS
// Handles perception, narrative synthesis, and renderer prompts.

import { emitSignal } from "../core/signals";

export interface VisionState {
  resonance: number;
  lastRevenue: number;
  frames: number;
}

export const visionState: VisionState = {
  resonance: 0,
  lastRevenue: 0,
  frames: 0
};

export function processVisionRealm(weight: number, revenue: number, depth: number) {
  // Update internal state
  visionState.frames++;
  visionState.lastRevenue = revenue;

  // Resonance = weighted emotional + financial signal
  visionState.resonance = (revenue * 0.1) + (weight * 0.05);

  // Emit VisionRealm signal
  emitSignal("vision.frame", {
    frame: visionState.frames,
    revenue,
    weight,
    resonance: visionState.resonance,
    depth
  });

  return visionState;
}
