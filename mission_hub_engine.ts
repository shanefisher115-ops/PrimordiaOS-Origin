import { TelemetryBus } from "../services/telemetry";
import { Persistence } from "../services/persistence";
import { AMO } from "../amo/amo-core";
import { RealmEvent } from "../realms/realm-events";

export const VelocityCurves = {
  linear: (delta: number) => delta,
  exponential: (delta: number) => Math.min(1, Math.pow(delta, 1.5)),
  momentum: (delta: number) => Math.min(1, delta * 0.5 + 0.3),
  burst: (delta: number) => (delta > 0.7 ? 1 : delta * 0.4),
  decay: (delta: number) => Math.max(0.1, 1 - Math.exp(-delta * 5))
};

export class MissionHubEngine {
  missions: any;
  userState: any;

  constructor() {
    this.missions = {};
    this.userState = {};
  }

  defineMission(id: string, config: any) {
    this.missions[id] = {
      id,
      title: config.title,
      description: config.description,
      difficulty: config.difficulty,
      xp_reward: config.xp_reward,
      omega_reward: config.omega_reward,
      velocity_curve: config.velocity_curve,
      steps: config.steps,
      onComplete: config.onComplete
    };
  }

  initUser(userId: string) {
    if (!this.userState[userId]) {
      this.userState[userId] = {
        active: null,
        progress: 0,
        velocity: 0,
        xp: 0,
        omega: 0
      };
    }
  }

  startMission(userId: string, missionId: string) {
    this.initUser(userId);

    const mission = this.missions[missionId];
    if (!mission) throw new Error("Mission not found");

    this.userState[userId].active = missionId;
    this.userState[userId].progress = 0;
    this.userState[userId].velocity = 0;

    RealmEvent.emit("missionhub.mission.start", { userId, missionId });
  }

  updateProgress(userId: string, delta: number) {
    const state = this.userState[userId];
    if (!state.active) return;

    const mission = this.missions[state.active];

    state.velocity = mission.velocity_curve(delta);
    state.progress += delta * state.velocity;

    if (state.progress >= 1.0) {
      this.completeMission(userId);
    }

    TelemetryBus.push("moneyplughub.mission_activity", {
      userId,
      velocity: state.velocity,
      progress: state.progress
    });
  }

  completeMission(userId: string) {
    const state = this.userState[userId];
    const mission = this.missions[state.active];

    state.xp += mission.xp_reward;

    const omegaFlux = AMO.generateFlux(mission.omega_reward);
    state.omega += omegaFlux;

    if (mission.onComplete) mission.onComplete(userId, state);

    Persistence.save("missionhub.userstate", userId, state);

    RealmEvent.emit("missionhub.mission.complete", {
      userId,
      missionId: mission.id,
      xp: mission.xp_reward,
      omega: omegaFlux
    });

    state.active = null;
    state.progress = 0;
    state.velocity = 0;
  }

  listMissions() {
    return Object.values(this.missions);
  }

  getUserState(userId: string) {
    this.initUser(userId);
    return this.userState[userId];
  }
}

export const MissionHub = new MissionHubEngine();
