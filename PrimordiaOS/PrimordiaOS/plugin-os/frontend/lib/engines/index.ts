// ============================================================
//   OVERMIND ENGINE ROUTING TABLE
// ============================================================
//
//   Maps intent strings to their target engine modules.
//   PURL uses this to route commands to the correct engine.
//

import * as selfModEngine from "./selfModEngine";
import * as replicatorEngine from "./replicatorEngine";
import * as swarmCoreEngine from "./swarmCoreEngine";
import * as temporalEngine from "./temporalEngine";
import * as cloudNodeEngine from "./cloudNodeEngine";
import * as antigravityEngine from "./antigravityEngine";

export type { EngineResult } from "./selfModEngine";

export interface Engine {
  execute(
    intent: string,
    payload: Record<string, unknown>
  ): Promise<{ engine: string; status: "OK" | "ERROR"; data: Record<string, unknown> }>;
}

// ─── Routing Table ──────────────────────────────────────────
export const ENGINE_MAP: Record<string, Engine> = {
  // Simulation
  "simulation.run": swarmCoreEngine,
  "simulation.step": swarmCoreEngine,

  // World
  "world.update": temporalEngine,
  "world.query": temporalEngine,

  // Agents
  "agent.spawn": replicatorEngine,
  "agent.modify": selfModEngine,
  "agent.inspect": selfModEngine,

  // Cloud
  "cloud.exec": cloudNodeEngine,
  "cloud.deploy": cloudNodeEngine,

  // Antigravity — Visual Cognition
  "simulation.render": antigravityEngine,
  "world.project": antigravityEngine,
  "agent.visualize": antigravityEngine,
  "memory.spatial.map": antigravityEngine,
  "scene.generate": antigravityEngine,
};

// ─── Engine Name Resolver ───────────────────────────────────
export function getEngineName(intent: string): string | null {
  const engine = ENGINE_MAP[intent];
  if (!engine) return null;

  // Exact intent mapping for Antigravity intents
  const antigravityIntents = [
    "simulation.render", "world.project", "agent.visualize",
    "memory.spatial.map", "scene.generate",
  ];
  if (antigravityIntents.includes(intent)) return "antigravityEngine";

  // Derive name from the module's execute return value convention
  // or from the map key prefix
  const prefix = intent.split(".")[0];
  const nameMap: Record<string, string> = {
    simulation: "swarmCoreEngine",
    world: "temporalEngine",
    agent: intent === "agent.spawn" ? "replicatorEngine" : "selfModEngine",
    cloud: "cloudNodeEngine",
  };

  return nameMap[prefix] ?? null;
}

// ─── Available Intents ──────────────────────────────────────
export function getAvailableIntents(): string[] {
  return Object.keys(ENGINE_MAP);
}

// ─── Engine Count ───────────────────────────────────────────
export function getEngineCount(): number {
  const unique = new Set(Object.values(ENGINE_MAP));
  return unique.size;
}
