import { MissionHubSwarm } from "../modules/mission_hub_swarm";
import { RealmEvent } from "../realms/realm-events";

export class MissionHubSwarmAgent {
  constructor() {
    this.id = "swarm_agent";
    this.start();
  }

  start() {
    MissionHubSwarm.register(this.id, this, 10);

    // Heartbeat
    setInterval(() => {
      MissionHubSwarm.beat(this.id);
    }, 1000);

    // Listen for optimization events
    RealmEvent.on("missionhub.swarm.optimize", ({ order }) => {
      console.log("[SwarmAgent] Optimization order received:", order);
    });

    console.log("[MissionHubSwarmAgent] Online.");
  }
}

export const MissionHubSwarmAgentInstance = new MissionHubSwarmAgent();
