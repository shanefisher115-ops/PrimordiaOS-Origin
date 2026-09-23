// vision/vision-core.ts
// PrimordiaOS Vision Core — full implementation
// Spatial Memory Engine + State Graph integration
import { eventBus } from "../shared/event-bus";
import { StateGraph } from "./state-graph";
export class VisionCore {
    graph;
    snapshots;
    constructor() {
        this.graph = new StateGraph();
        this.snapshots = [];
    }
    async start() {
        console.log("[VisionCore] Started.");
        eventBus.subscribe("vision.input", async (event) => {
            await this.processInput(event.payload);
        });
    }
    async stop() {
        console.log("[VisionCore] Stopped.");
    }
    async processInput(input) {
        console.log("[VisionCore] Processing vision input:", input);
        // Convert input into graph nodes
        const node = this.graph.addNode({
            id: input.id,
            ts: input.ts,
            data: input.data
        });
        // Emit event for downstream systems
        eventBus.emit("vision.node.created", { node }, "vision-core");
        // Create snapshot
        this.createSnapshot();
    }
    createSnapshot() {
        const snapshot = {
            ts: Date.now(),
            nodes: this.graph.getNodes()
        };
        this.snapshots.push(snapshot);
        eventBus.emit("vision.snapshot.created", snapshot, "vision-core");
    }
    getGraph() {
        return this.graph;
    }
    getSnapshots() {
        return this.snapshots;
    }
}
export const visionCore = new VisionCore();
