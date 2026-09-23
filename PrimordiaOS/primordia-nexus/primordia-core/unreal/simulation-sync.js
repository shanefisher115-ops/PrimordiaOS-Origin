// unreal/simulation-sync.ts
// PrimordiaOS Simulation Sync — full implementation
// Synchronizes PrimordiaOS state with Unreal Engine simulation
import { eventBus } from "../shared/event-bus";
import { unrealBridge } from "./unreal-bridge";
export class SimulationSync {
    lastState;
    constructor() {
        this.lastState = null;
    }
    async start() {
        console.log("[SimulationSync] Started.");
        // Listen for vision snapshots
        eventBus.subscribe("vision.snapshot.created", async (event) => {
            await this.sync(event.payload);
        });
    }
    async stop() {
        console.log("[SimulationSync] Stopped.");
    }
    async sync(snapshot) {
        const state = {
            id: `sim-${Date.now()}`,
            ts: Date.now(),
            nodes: snapshot.nodes,
            metadata: {
                sourceSnapshot: snapshot.id
            }
        };
        this.lastState = state;
        console.log("[SimulationSync] Syncing state to Unreal:", state);
        await unrealBridge.send("syncState", state);
        eventBus.emit("simulation.synced", state, "simulation-sync");
    }
    getLastState() {
        return this.lastState;
    }
}
export const simulationSync = new SimulationSync();
