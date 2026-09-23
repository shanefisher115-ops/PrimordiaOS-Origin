import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";
import { AMO } from "../amo/amo-core";

export const MissionHubRituals = {
  rituals: {},
  events: {},
  activeRituals: [],
  activeEvents: [],

  defineRitual(id, data) {
    this.rituals[id] = {
      id,
      ...data,
      progress: 0,
      completed: false
    };
  },

  defineEvent(id, data) {
    this.events[id] = {
      id,
      ...data,
      triggered: false
    };
  },

  startRitual(id) {
    const r = this.rituals[id];
    if (!r) return;

    r.progress = 0;
    r.completed = false;

    this.activeRituals.push(id);

    RealmEvent.emit("missionhub.ritual.start", { id });
    console.log(`[Rituals] Ritual started: ${id}`);
  },

  updateRitual(id, amount) {
    const r = this.rituals[id];
    if (!r || r.completed) return;

    r.progress = Math.min(1, r.progress + amount);

    TelemetryBus.emit("missionhub.ritual.progress", {
      id,
      progress: r.progress
    });

    if (r.progress >= 1) {
      this.completeRitual(id);
    }
  },

  completeRitual(id) {
    const r = this.rituals[id];
    if (!r || r.completed) return;

    r.completed = true;

    AMO.fire("missionhub.ritual.reward", {
      ritualId: id,
      reward: r.reward
    });

    RealmEvent.emit("missionhub.ritual.complete", {
      id,
      reward: r.reward
    });

    console.log(`[Rituals] Ritual completed: ${id}`);
  },

  triggerEvent(id) {
    const e = this.events[id];
    if (!e || e.triggered) return;

    e.triggered = true;
    this.activeEvents.push(id);

    AMO.fire("missionhub.event.trigger", { eventId: id });
    RealmEvent.emit("missionhub.event.trigger", { id });

    console.log(`[Events] Triggered event: ${id}`);
  }
};

// ============================
// Ritual Definitions
// ============================

MissionHubRituals.defineRitual("daily_flux", {
  title: "Daily Flux Ritual",
  description: "Generate Ω flux through consistent mission activity.",
  reward: { omega: 5, xp: 50 }
});

MissionHubRituals.defineRitual("weekly_velocity", {
  title: "Weekly Velocity Rite",
  description: "Maintain high velocity for extended periods.",
  reward: { omega: 20, xp: 200 }
});

// ============================
// Event Definitions
// ============================

MissionHubRituals.defineEvent("flux_storm", {
  title: "Flux Storm",
  description: "A sudden surge of Ω flux across the realm.",
  rewardMultiplier: 2
});

MissionHubRituals.defineEvent("mission_frenzy", {
  title: "Mission Frenzy",
  description: "All missions generate double XP for 10 minutes."
});
