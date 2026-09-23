// ============================================================
//   ANTIGRAVITY BRIDGE — PURL ↔ Antigravity Binding
// ============================================================
//
//   Binds Antigravity intents into the PURL routing table
//   at runtime. Called during Shell boot after startPURL().
//
//   This bridge makes Antigravity a runtime target:
//   when a command runs through HCL → PURL → engine,
//   Antigravity can render the output.
//

import { ENGINE_MAP } from "./engines";
import * as antigravityEngine from "./engines/antigravityEngine";

// ─── Constants ──────────────────────────────────────────────

export const ANTIGRAVITY_INTENTS = [
  "simulation.render",
  "world.project",
  "agent.visualize",
  "memory.spatial.map",
  "scene.generate",
] as const;

export type AntigravityIntent = (typeof ANTIGRAVITY_INTENTS)[number];

// ─── State ──────────────────────────────────────────────────

let bound = false;

// ─── Bind ───────────────────────────────────────────────────

export function bindAntigravityToPURL(): void {
  if (bound) return;

  for (const intent of ANTIGRAVITY_INTENTS) {
    ENGINE_MAP[intent] = antigravityEngine;
  }

  bound = true;
}

// ─── Unbind ─────────────────────────────────────────────────

export function unbindAntigravityFromPURL(): void {
  if (!bound) return;

  for (const intent of ANTIGRAVITY_INTENTS) {
    delete ENGINE_MAP[intent];
  }

  bound = false;
}

// ─── Status ─────────────────────────────────────────────────

export function isAntigravityBound(): boolean {
  return bound;
}

// ─── Intent List ────────────────────────────────────────────

export function getAntigravityIntents(): readonly string[] {
  return ANTIGRAVITY_INTENTS;
}
