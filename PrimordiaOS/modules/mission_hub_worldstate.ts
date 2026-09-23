import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";

export const MissionHubWorldstate = {
  state: {
    fluxLevel: 1,          // Ω flux intensity
    stability: 1,          // world stability (0–1)
    mood: "neutral",       // calm, tense, volatile
    difficulty: 1,         // global difficulty multiplier
    phase: "normal",       // normal, storm, surge, collapse
    lastUpdate: Date.now()
  },

  update(partial) {
    Object.assign(this.state, partial);
    this.state.lastUpdate = Date.now();

    RealmEvent.emit("missionhub.worldstate.update", this.state);
    TelemetryBus.emit("missionhub.worldstate", this.state);

    console.log("[Worldstate] Updated:", this.state);
  },

  // ============================
  // Worldstate Mutators
  // ============================

  applyFlux(amount) {
    this.state.fluxLevel += amount;

    if (this.state.fluxLevel > 5) {
      this.state.phase = "storm";
      this.state.mood = "volatile";
      this.state.difficulty = 1.5;
    }

    if (this.state.fluxLevel < 1) {
      this.state.phase = "normal";
      this.state.mood = "calm";
      this.state.difficulty = 1;
    }

    this.update({});
  },

  applyInstability(amount) {
    this.state.stability = Math.max(0, Math.min(1, this.state.stability + amount));

    if (this.state.stability < 0.3) {
      this.state.phase = "collapse";
      this.state.mood = "tense";
      this.state.difficulty = 2;
    }

    this.update({});
  },

  tick() {
    // Natural drift
    this.state.fluxLevel *= 0.99;
    this.state.stability *= 0.995;

    // Phase transitions
    if (this.state.fluxLevel > 3 && this.state.stability > 0.5) {
      this.state.phase = "surge";
      this.state.mood = "volatile";
      this.state.difficulty = 1.3;
    }

    if (this.state.fluxLevel < 2 && this.state.stability > 0.7) {
      this.state.phase = "normal";
      this.state.mood = "calm";
      this.state.difficulty = 1;
    }

    this.update({});
  }
};

// Tick loop
setInterval(() => MissionHubWorldstate.tick(), 3000);
