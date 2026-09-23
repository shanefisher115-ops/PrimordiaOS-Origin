import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";
import { AMO } from "../amo/amo-core";
import { MissionHub } from "./mission_hub_engine";

export const MissionHubPrestige = {
  prestigeLevel: 0,
  prestigePoints: 0,
  multiplier: 1,

  requirements: {
    xp: 2000,
    omega: 50,
    missions: 10
  },

  canPrestige(userId) {
    const state = MissionHub.getUserState(userId);

    return (
      state.xp >= this.requirements.xp &&
      state.omega >= this.requirements.omega &&
      state.completedMissions >= this.requirements.missions
    );
  },

  performPrestige(userId) {
    if (!this.canPrestige(userId)) return false;

    this.prestigeLevel++;
    this.prestigePoints += 1;
    this.multiplier = 1 + this.prestigePoints * 0.25;

    // Reset user state
    MissionHub.resetUser(userId);

    // Telemetry
    TelemetryBus.emit("missionhub.prestige", {
      userId,
      level: this.prestigeLevel,
      points: this.prestigePoints,
      multiplier: this.multiplier
    });

    // AMO reward
    AMO.fire("missionhub.prestige.reward", {
      userId,
      prestigeLevel: this.prestigeLevel,
      prestigePoints: this.prestigePoints,
      multiplier: this.multiplier
    });

    // Realm event
    RealmEvent.emit("missionhub.prestige", {
      userId,
      level: this.prestigeLevel,
      points: this.prestigePoints,
      multiplier: this.multiplier
    });

    console.log(
      `[MissionHubPrestige] Prestige performed. Level=${this.prestigeLevel}, Multiplier=${this.multiplier}`
    );

    return true;
  }
};
