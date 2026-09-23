import { MissionHub } from "../modules/mission_hub_engine";
import { MissionHubAchievements } from "../modules/mission_hub_achievements";
import { RealmEvent } from "../realms/realm-events";

export class MissionHubAchievementAgent {
  constructor() {
    this.userId = "defaultUser";
    this.start();
  }

  start() {
    // Mission completion unlocks "first_steps"
    RealmEvent.on("missionhub.mission.complete", () => {
      MissionHubAchievements.unlock("first_steps", this.userId);
    });

    // Velocity unlocks "velocity_master"
    RealmEvent.on("missionhub.mission.activity", ({ velocity }) => {
      if (velocity >= 0.9) {
        MissionHubAchievements.unlock("velocity_master", this.userId);
      }
    });

    // XP unlocks "xp_grinder"
    setInterval(() => {
      const state = MissionHub.getUserState(this.userId);
      if (state.xp >= 500) {
        MissionHubAchievements.unlock("xp_grinder", this.userId);
      }
    }, 1000);

    // Omega unlocks "omega_surge"
    setInterval(() => {
      const state = MissionHub.getUserState(this.userId);
      if (state.omega >= 20) {
        MissionHubAchievements.unlock("omega_surge", this.userId);
      }
    }, 1000);

    console.log("[MissionHubAchievementAgent] Online.");
  }
}

export const MissionHubAchievementAgentInstance = new MissionHubAchievementAgent();
