// realms/simulation/simulationRealmAdapter.ts
import { signalBus } from "../../state/signalBus";
import { realmRegistry } from "../../state/realmRegistry";
import { memoryGraph } from "../../state/memoryGraphInstance";
export class SimulationRealmAdapter {
    recordSimulationResult(result) {
        const timestamp = Date.now();
        realmRegistry.markActive("simulation");
        signalBus.emit({
            id: `simulation-result-${timestamp}`,
            realm: "simulation",
            strength: result.confidence ?? 0.5,
            payload: result,
            timestamp,
        });
        memoryGraph.upsertNode({
            id: `simulation-mem-${timestamp}`,
            kind: "SimulationResult",
            label: "sim-result",
            importance: 0.7,
            payload: result,
            timestamp,
        });
    }
    recordPhysicsEvent(event) {
        const timestamp = Date.now();
        realmRegistry.markActive("simulation");
        signalBus.emit({
            id: `simulation-physics-${timestamp}`,
            realm: "simulation",
            strength: 0.6,
            payload: event,
            timestamp,
        });
        memoryGraph.upsertNode({
            id: `simulation-phys-${timestamp}`,
            kind: "PhysicsEvent",
            label: "physics",
            importance: 0.5,
            payload: event,
            timestamp,
        });
    }
}
export const simulationRealm = new SimulationRealmAdapter();
