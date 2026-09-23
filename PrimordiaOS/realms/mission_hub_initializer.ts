import { RealmRegistry } from "../realms/realm-registry";
import { RealmEvent } from "../realms/realm-events";
import { MissionHub } from "../modules/mission_hub_engine";
import "../modules/mission_hub_missions"; // auto-load missions
import { TelemetryBus } from "../services/telemetry";

export const MissionHubInitializer = {
  realm_id: "realm_mission_hub",

  async initialize() {
    RealmRegistry.register({
      id: "realm_mission_hub",
      name: "Mission Hub",
      surface: "MissionHubUI",
      icon: "missionhub",
      priority: 4
    });

    TelemetryBus.bind("moneyplughub.mission_activity");
    TelemetryBus.bind("amo.reward_flux");

    RealmEvent.emit("realm.missionhub.initialized", {
      realm: "realm_mission_hub",
      timestamp: Date.now()
    });

    console.log("[PrimordiaOS] Mission Hub Realm initialized.");
  },

  async shutdown() {
    RealmEvent.emit("realm.missionhub.shutdown", {
      realm: "realm_mission_hub",
      timestamp: Date.now()
    });

    console.log("[PrimordiaOS] Mission Hub Realm shut down.");
  }
};

MissionHubInitializer.initialize();
