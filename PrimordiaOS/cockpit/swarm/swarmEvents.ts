import { eventBus } from "../core/eventBus.js";

export class SwarmEvents {
  notifySwarmConsensus(roundId: number): void {
    eventBus.emit("swarm:consensus", { roundId, consensus: true });
  }
}