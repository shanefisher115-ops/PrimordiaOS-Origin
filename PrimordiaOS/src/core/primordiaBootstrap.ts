// Primordia Bootstrap
// Wires kernel, realm coordinator, simulation bridge, intelligence core, event bus, and autonomy loop.

import { PrimordiaKernel } from "./primordiaKernel";
import { PrimordiaRealmCoordinator } from "./primordiaRealmCoordinator";
import { PrimordiaSimulationBridge } from "../simulation/primordiaSimulationBridge";
import { PrimordiaIntelligenceCore } from "../primordia/primordiaIntelligenceCore";
import { PrimordiaEventBus } from "../state/primordiaEventBus";
import { PrimordiaAutonomyLoop } from "./primordiaAutonomyLoop";

export class PrimordiaBootstrap {
  private kernel = new PrimordiaKernel();
  private coordinator = new PrimordiaRealmCoordinator();
  private simBridge = new PrimordiaSimulationBridge();
  private intelligence = new PrimordiaIntelligenceCore();
  private eventBus = new PrimordiaEventBus();
  private autonomyLoop = new PrimordiaAutonomyLoop();

  async start() {
    console.log("[Bootstrap] Starting PrimordiaOS...");

    await this.kernel.initialize();

    // TODO: wire eventBus into ATM, realms, simulation, intelligence, etc.
    this.autonomyLoop.start();

    console.log("[Bootstrap] PrimordiaOS is now running.");
  }
}
