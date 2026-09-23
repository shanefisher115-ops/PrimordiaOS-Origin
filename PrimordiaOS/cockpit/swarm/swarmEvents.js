import { eventBus } from "../core/eventBus.js";
export class SwarmEvents {
    notifySwarmConsensus(roundId) {
        eventBus.emit("swarm:consensus", { roundId, consensus: true });
    }
}
