import { MissionHubSeasons } from "../modules/mission_hub_seasons";
import { TelemetryBus } from "../services/telemetry";
import { RealmEvent } from "../realms/realm-events";

export class MissionHubSeasonAgent {
  constructor() {
    this.userId = "defaultUser";
    this.start();
  }

  start() {
    // Start the first season automatically
    MissionHubSeasons.startSeason("season_alpha");

    // Velocity contributes to seasonal progress
    TelemetryBus.listen("moneyplughub.mission_activity", ({ velocity }) => {
      if (velocity > 0.5) {
        MissionHubSeasons.updateProgress(velocity * 0.01);
      }
    });

    // Omega flux contributes to seasonal progress
    TelemetryBus.listen("amo.reward_flux", ({ flux }) => {
      MissionHubSeasons.updateProgress(flux * 0.005);
    });

    // Mission completions contribute to seasonal progress
    RealmEvent.on("missionhub.mission.complete", () => {
      MissionHubSeasons.updateProgress(0.05);
    });

    // Rotate seasons automatically
    setInterval(() => this.checkSeasonRotation(), 5000);

    console.log("[MissionHubSeasonAgent] Online.");
  }

  checkSeasonRotation() {
    const now = Date.now();

    if (now >= MissionHubSeasons.seasonEnd) {
      if (MissionHubSeasons.currentSeason === "season_alpha") {
        MissionHubSeasons.startSeason("season_fluxstorm");
      } else {
        MissionHubSeasons.startSeason("season_alpha");
      }
    }
  }
}

export const MissionHubSeasonAgentInstance = new MissionHubSeasonAgent();
