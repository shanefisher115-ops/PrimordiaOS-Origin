// Primordia Bootstrap
// Wires kernel, realm coordinator, simulation bridge, intelligence core, event bus, and autonomy loop.
import { PrimordiaKernel } from "./primordiaKernel";
import { PrimordiaRealmCoordinator } from "./primordiaRealmCoordinator";
import { PrimordiaSimulationBridge } from "../simulation/primordiaSimulationBridge";
import { PrimordiaIntelligenceCore } from "../primordia/primordiaIntelligenceCore";
import { PrimordiaEventBus } from "../state/primordiaEventBus";
import { PrimordiaAutonomyLoop } from "./primordiaAutonomyLoop";
export class PrimordiaBootstrap {
    kernel = new PrimordiaKernel();
    coordinator = new PrimordiaRealmCoordinator();
    simBridge = new PrimordiaSimulationBridge();
    intelligence = new PrimordiaIntelligenceCore();
    eventBus = new PrimordiaEventBus();
    autonomyLoop = new PrimordiaAutonomyLoop();
    async start() {
        console.log("[Bootstrap] Starting PrimordiaOS...");
        await this.kernel.initialize();
        // TODO: wire eventBus into ATM, realms, simulation, intelligence, etc.
        this.autonomyLoop.start();
        console.log("[Bootstrap] PrimordiaOS is now running.");
    }
}
