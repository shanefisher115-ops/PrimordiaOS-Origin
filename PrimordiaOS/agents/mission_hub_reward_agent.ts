import { MissionHubRewardBalancer } from "../modules/mission_hub_reward_balancer";
import { TelemetryBus } from "../services/telemetry";
import { RealmEvent } from "../realms/realm-events";

export class MissionHubRewardAgent {
  constructor() {
    this.userId = "defaultUser";
    this.start();
  }

  start() {
    // Track velocity
    TelemetryBus.listen("moneyplughub.mission_activity", ({ velocity }) => {
      MissionHubRewardBalancer.pushVelocity(velocity);
    });

    // Track omega flux
    TelemetryBus.listen("amo.reward_flux", ({ flux }) => {
      MissionHubRewardBalancer.pushOmega(flux);
    });

    // Track XP gain
    RealmEvent.on("missionhub.mission.complete", ({ xp }) => {
      MissionHubRewardBalancer.pushXP(xp);
      MissionHubRewardBalancer.recordCompletion();
    });

    // Rebalance every 2 seconds
    setInterval(() => {
      MissionHubRewardBalancer.rebalance(this.userId);
    }, 2000);

    console.log("[MissionHubRewardAgent] Online.");
  }
}

export const MissionHubRewardAgentInstance = new MissionHubRewardAgent();
