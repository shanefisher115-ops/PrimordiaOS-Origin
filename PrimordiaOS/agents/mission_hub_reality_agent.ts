import { MissionHubReality } from "../modules/mission_hub_reality";
import { MissionHubWorldstate } from "../modules/mission_hub_worldstate";

export class MissionHubRealityAgent {
  constructor() {
    this.start();
  }

  start() {
    // Trigger reality events based on extreme worldstate conditions
    setInterval(() => {
      const ws = MissionHubWorldstate.state;

      if (ws.fluxLevel > 6) {
        MissionHubReality.trigger("time_dilation");
      }

      if (ws.stability < 0.2) {
        MissionHubReality.trigger("world_inversion");
      }

      if (ws.phase === "collapse") {
        MissionHubReality.trigger("director_paradox");
      }

      if (ws.mood === "volatile") {
        MissionHubReality.trigger("fusion_supernova");
      }

      if (ws.difficulty > 2.5) {
        MissionHubReality.trigger("prime_singularity");
      }
    }, 4000);

    console.log("[MissionHubRealityAgent] Online.");
  }
}

export const MissionHubRealityAgentInstance =
  new MissionHubRealityAgent();
