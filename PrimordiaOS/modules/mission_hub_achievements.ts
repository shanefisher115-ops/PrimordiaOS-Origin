import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";
import { AMO } from "../amo/amo-core";

export const MissionHubAchievements = {
  achievements: {},

  define(id, data) {
    this.achievements[id] = {
      id,
      unlocked: false,
      ...data
    };
  },

  unlock(id, userId) {
    const ach = this.achievements[id];
    if (!ach || ach.unlocked) return;

    ach.unlocked = true;

    // Telemetry
    TelemetryBus.emit("missionhub.achievement.unlocked", {
      id,
      userId,
      title: ach.title,
      reward: ach.reward
    });

    // AMO reward
    if (ach.reward?.omega) {
      AMO.fire("missionhub.achievement.reward", {
        userId,
        achievement: id,
        omega: ach.reward.omega
      });
    }

    // Realm event
    RealmEvent.emit("missionhub.achievement.unlocked", {
      id,
      userId,
      timestamp: Date.now()
    });

    console.log(`[MissionHubAchievements] Unlocked: ${id}`);
  },

  getAll() {
    return Object.values(this.achievements);
  }
};

// ============================
// Achievement Definitions
// ============================

MissionHubAchievements.define("first_steps", {
  title: "First Steps",
  description: "Complete your first mission.",
  reward: { omega: 1 }
});

MissionHubAchievements.define("velocity_master", {
  title: "Velocity Master",
  description: "Reach 90% velocity.",
  reward: { omega: 3 }
});

MissionHubAchievements.define("xp_grinder", {
  title: "XP Grinder",
  description: "Accumulate 500 XP.",
  reward: { omega: 5 }
});

MissionHubAchievements.define("omega_surge", {
  title: "Omega Surge",
  description: "Generate 20 Ω in a single session.",
  reward: { omega: 10 }
});
