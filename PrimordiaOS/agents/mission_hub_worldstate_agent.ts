import { MissionHubWorldstate } from "../modules/mission_hub_worldstate";
import { TelemetryBus } from "../services/telemetry";
import { RealmEvent } from "../realms/realm-events";

export class MissionHubWorldstateAgent {
  constructor() {
    this.userId = "defaultUser";
    this.start();
  }

  start() {
    // Flux storms increase world flux
    TelemetryBus.listen("amo.reward_flux", ({ flux }) => {
      MissionHubWorldstate.applyFlux(flux * 0.1);
    });

    // Mission failures reduce stability
    RealmEvent.on("missionhub.mission.fail", () => {
      MissionHubWorldstate.applyInstability(-0.1);
    });

    // Mission completions increase stability
    RealmEvent.on("missionhub.mission.complete", () => {
      MissionHubWorldstate.applyInstability(0.02);
    });

    // Seasonal events affect worldstate
    RealmEvent.on("missionhub.season.complete", () => {
      MissionHubWorldstate.applyFlux(1);
      MissionHubWorldstate.applyInstability(0.1);
    });

    console.log("[MissionHubWorldstateAgent] Online.");
  }
}

export const MissionHubWorldstateAgentInstance =
  new MissionHubWorldstateAgent();
