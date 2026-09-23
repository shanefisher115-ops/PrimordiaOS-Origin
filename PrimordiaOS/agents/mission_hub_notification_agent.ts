import { MissionHubNotifications } from "../modules/mission_hub_notifications";
import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";

export class MissionHubNotificationAgent {
  constructor() {
    this.start();
  }

  start() {
    // Mission completion
    RealmEvent.on("missionhub.mission.complete", ({ missionId, xp, omega }) => {
      MissionHubNotifications.push(
        "mission_complete",
        `Mission ${missionId} completed! +${xp} XP, +${omega} Ω`
      );
    });

    // Achievement unlock
    RealmEvent.on("missionhub.achievement.unlocked", ({ id, title }) => {
      MissionHubNotifications.push(
        "achievement",
        `Achievement unlocked: ${title}`
      );
    });

    // Prestige
    RealmEvent.on("missionhub.prestige", ({ level }) => {
      MissionHubNotifications.push(
        "prestige",
        `Prestige ascended to Level ${level}`
      );
    });

    // Seasonal progress
    TelemetryBus.listen("missionhub.season.progress", ({ id, progress }) => {
      MissionHubNotifications.push(
        "season",
        `Season ${id}: ${(progress * 100).toFixed(1)}%`
      );
    });

    // Reward flux
    TelemetryBus.listen("amo.reward_flux", ({ flux }) => {
      MissionHubNotifications.push(
        "flux",
        `Ω Flux Event: +${flux.toFixed(2)}`
      );
    });

    console.log("[MissionHubNotificationAgent] Online.");
  }
}

export const MissionHubNotificationAgentInstance =
  new MissionHubNotificationAgent();
