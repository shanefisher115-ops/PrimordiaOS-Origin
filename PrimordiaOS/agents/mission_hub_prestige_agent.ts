import { MissionHubPrestige } from "../modules/mission_hub_prestige";
import { MissionHub } from "../modules/mission_hub_engine";
import { RealmEvent } from "../realms/realm-events";

export class MissionHubPrestigeAgent {
  constructor() {
    this.userId = "defaultUser";
    this.start();
  }

  start() {
    // Auto-check prestige eligibility every 3 seconds
    setInterval(() => {
      if (MissionHubPrestige.canPrestige(this.userId)) {
        MissionHubPrestige.performPrestige(this.userId);
      }
    }, 3000);

    // Boost rewards based on prestige multiplier
    RealmEvent.on("missionhub.mission.complete", ({ xp, omega }) => {
      const mult = MissionHubPrestige.multiplier;

      MissionHub.addXP(this.userId, xp * (mult - 1));
      MissionHub.addOmega(this.userId, omega * (mult - 1));
    });

    console.log("[MissionHubPrestigeAgent] Online.");
  }
}

export const MissionHubPrestigeAgentInstance =
  new MissionHubPrestigeAgent();
