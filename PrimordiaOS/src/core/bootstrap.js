// src/core/bootstrap.ts
import { IntelligenceCoordinator } from "./intelligenceCoordinator";
export class CoreEngine {
    state;
    constructor() {
        this.state = {
            realms: [],
            agents: [],
            signals: []
        };
    }
    addRealm(id) {
        this.state.realms.push(id);
        console.log("Realm added:", id);
    }
    addAgent(id) {
        this.state.agents.push(id);
        console.log("Agent added:", id);
    }
    addSignal(id) {
        this.state.signals.push(id);
        console.log("Signal emitted:", id);
    }
}
export function bootstrapCore() {
    const engine = new CoreEngine();
    engine.addRealm("Realm_Seed");
    engine.addAgent("Agent_Seed");
    engine.addSignal("Signal_Seed");
    console.log("PrimordiaOS Core bootstrap complete.");
    const coordinator = new IntelligenceCoordinator();
    return { engine, coordinator };
}
export async function startIntelligenceLoop(engine, coordinator, intervalMs = 5000) {
    console.log("PrimordiaOS Intelligence Loop: STARTED");
    setInterval(async () => {
        const summary = await coordinator.runCycle(engine.state);
        console.log("Intelligence Cycle Summary:", summary);
    }, intervalMs);
}
