import { TelemetryBus } from "../services/telemetry";
import { RealmEvent } from "../realms/realm-events";

export const MissionHubRealmAnalytics = {
  kpi: {
    avgVelocity: 0,
    avgOmegaFlux: 0,
    avgXP: 0,
    completions: 0,
    difficultyDrift: 0
  },

  history: {
    velocity: [],
    omega: [],
    xp: [],
    difficulty: []
  },

  pushVelocity(v) {
    this.history.velocity.push(v);
    if (this.history.velocity.length > 200) this.history.velocity.shift();
  },

  pushOmega(o) {
    this.history.omega.push(o);
    if (this.history.omega.length > 200) this.history.omega.shift();
  },

  pushXP(x) {
    this.history.xp.push(x);
    if (this.history.xp.length > 200) this.history.xp.shift();
  },

  pushDifficulty(d) {
    this.history.difficulty.push(d);
    if (this.history.difficulty.length > 200) this.history.difficulty.shift();
  },

  recordCompletion() {
    this.kpi.completions++;
  },

  compute() {
    const avg = (arr) =>
      arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

    this.kpi.avgVelocity = avg(this.history.velocity);
    this.kpi.avgOmegaFlux = avg(this.history.omega);
    this.kpi.avgXP = avg(this.history.xp);
    this.kpi.difficultyDrift = avg(this.history.difficulty);

    RealmEvent.emit("missionhub.realm.analytics.update", {
      timestamp: Date.now(),
      ...this.kpi
    });

    TelemetryBus.emit("missionhub.realm.analytics", this.kpi);

    console.log("[RealmAnalytics] KPI update:", this.kpi);
  }
};
