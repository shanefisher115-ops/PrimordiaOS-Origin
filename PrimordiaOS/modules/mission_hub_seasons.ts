import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";
import { AMO } from "../amo/amo-core";
import { MissionHub } from "./mission_hub_engine";

export const MissionHubSeasons = {
  currentSeason: null,
  challenges: {},
  seasonStart: 0,
  seasonEnd: 0,

  defineSeason(id, data) {
    this.challenges[id] = {
      id,
      ...data,
      progress: 0,
      completed: false
    };
  },

  startSeason(id) {
    const season = this.challenges[id];
    if (!season) return;

    this.currentSeason = id;
    this.seasonStart = Date.now();
    this.seasonEnd = Date.now() + season.duration;

    season.progress = 0;
    season.completed = false;

    RealmEvent.emit("missionhub.season.start", {
      id,
      start: this.seasonStart,
      end: this.seasonEnd
    });

    console.log(`[MissionHubSeasons] Season started: ${id}`);
  },

  updateProgress(amount) {
    const season = this.challenges[this.currentSeason];
    if (!season || season.completed) return;

    season.progress = Math.min(1, season.progress + amount);

    TelemetryBus.emit("missionhub.season.progress", {
      id: season.id,
      progress: season.progress
    });

    if (season.progress >= 1) {
      this.completeSeason(season.id);
    }
  },

  completeSeason(id) {
    const season = this.challenges[id];
    if (!season || season.completed) return;

    season.completed = true;

    AMO.fire("missionhub.season.reward", {
      seasonId: id,
      reward: season.reward
    });

    RealmEvent.emit("missionhub.season.complete", {
      id,
      reward: season.reward
    });

    console.log(`[MissionHubSeasons] Season completed: ${id}`);
  }
};

// ============================
// Seasonal Challenge Definitions
// ============================

MissionHubSeasons.defineSeason("season_alpha", {
  title: "Season Alpha — Velocity Ascension",
  description: "Maintain high velocity and complete missions rapidly.",
  duration: 1000 * 60 * 60 * 24 * 7, // 7 days
  reward: { omega: 25, xp: 500 }
});

MissionHubSeasons.defineSeason("season_fluxstorm", {
  title: "Season Fluxstorm — Omega Surge",
  description: "Generate massive Ω flux through mission mastery.",
  duration: 1000 * 60 * 60 * 24 * 7,
  reward: { omega: 40, xp: 300 }
});
