import { MissionHubRealmAnalytics } from "../modules/mission_hub_realm_analytics";
import { TelemetryBus } from "../services/telemetry";
import { RealmEvent } from "../realms/realm-events";
import { MissionHub } from "../modules/mission_hub_engine";

export class MissionHubRealmAnalyticsAgent {
  constructor() {
    this.userId = "defaultUser";
    this.start();
  }

  start() {
    // Velocity + progress telemetry
    TelemetryBus.listen("moneyplughub.mission_activity", ({ velocity }) => {
      MissionHubRealmAnalytics.pushVelocity(velocity);
    });

    // Omega flux telemetry
    TelemetryBus.listen("amo.reward_flux", ({ flux }) => {
      MissionHubRealmAnalytics.pushOmega(flux);
    });

    // XP telemetry
    RealmEvent.on("missionhub.mission.complete", ({ xp }) => {
      MissionHubRealmAnalytics.pushXP(xp);
      MissionHubRealmAnalytics.recordCompletion();
    });

    // Difficulty drift telemetry
    setInterval(() => {
      const state = MissionHub.getUserState(this.userId);
      if (state.active) {
        const mission = MissionHub.missions[state.active];
        MissionHubRealmAnalytics.pushDifficulty(
          mission?.difficulty === "hard" ? 1 : 0
        );
      }
    }, 1000);

    // Compute KPIs every 3 seconds
    setInterval(() => {
      MissionHubRealmAnalytics.compute();
    }, 3000);

    console.log("[MissionHubRealmAnalyticsAgent] Online.");
  }
}

export const MissionHubRealmAnalyticsAgentInstance =
  new MissionHubRealmAnalyticsAgent();
