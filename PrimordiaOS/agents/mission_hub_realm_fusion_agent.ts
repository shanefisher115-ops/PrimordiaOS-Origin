import { MissionHubRealmFusion } from "../modules/mission_hub_realm_fusion";
import { MissionHubWorldstate } from "../modules/mission_hub_worldstate";

export class MissionHubRealmFusionAgent {
  constructor() {
    this.start();
  }

  start() {
    // Auto‑activate fusion links based on worldstate
    setInterval(() => {
      const ws = MissionHubWorldstate.state;

      if (ws.fluxLevel > 3) {
        MissionHubRealmFusion.activateLink("fusion_fluxworld");
      }

      if (ws.difficulty > 1.5) {
        MissionHubRealmFusion.activateLink("fusion_prestige_core");
      }

      if (ws.mood === "volatile") {
        MissionHubRealmFusion.activateLink("fusion_seasonal_gate");
      }
    }, 5000);

    console.log("[MissionHubRealmFusionAgent] Online.");
  }
}

export const MissionHubRealmFusionAgentInstance =
  new MissionHubRealmFusionAgent();
