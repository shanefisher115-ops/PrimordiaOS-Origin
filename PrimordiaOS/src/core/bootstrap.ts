// src/core/bootstrap.ts

import { IntelligenceCoordinator } from "./intelligenceCoordinator";

export interface CoreState {
  realms: string[];
  agents: string[];
  signals: string[];
}

export class CoreEngine {
  state: CoreState;

  constructor() {
    this.state = {
      realms: [],
      agents: [],
      signals: []
    };
  }

  addRealm(id: string) {
    this.state.realms.push(id);
    console.log("Realm added:", id);
  }

  addAgent(id: string) {
    this.state.agents.push(id);
    console.log("Agent added:", id);
  }

  addSignal(id: string) {
    this.state.signals.push(id);
    console.log("Signal emitted:", id);
  }
}

export function bootstrapCore(): {
  engine: CoreEngine;
  coordinator: IntelligenceCoordinator;
} {
  const engine = new CoreEngine();

  engine.addRealm("Realm_Seed");
  engine.addAgent("Agent_Seed");
  engine.addSignal("Signal_Seed");

  console.log("PrimordiaOS Core bootstrap complete.");

  const coordinator = new IntelligenceCoordinator();

  return { engine, coordinator };
}

export async function startIntelligenceLoop(
  engine: CoreEngine,
  coordinator: IntelligenceCoordinator,
  intervalMs: number = 5000
) {
  console.log("PrimordiaOS Intelligence Loop: STARTED");

  setInterval(async () => {
    const summary = await coordinator.runCycle(engine.state);

    console.log("Intelligence Cycle Summary:", summary);
  }, intervalMs);
}
