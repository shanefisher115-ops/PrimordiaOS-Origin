import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";
import { MissionHubPrestige } from "./mission_hub_prestige";
import { MissionHubSeasons } from "./mission_hub_seasons";
import { MissionHubRituals } from "./mission_hub_rituals";
import { MissionHub } from "./mission_hub_engine";

export const MissionHubMetaTree = {
  nodes: {},
  unlocked: {},

  defineNode(id, data) {
    this.nodes[id] = {
      id,
      ...data
    };
  },

  canUnlock(id, userId) {
    const n = this.nodes[id];
    if (!n) return false;

    const state = MissionHub.getUserState(userId);

    return (
      (n.requirements.xp ? state.xp >= n.requirements.xp : true) &&
      (n.requirements.omega ? state.omega >= n.requirements.omega : true) &&
      (n.requirements.prestige
        ? MissionHubPrestige.prestigeLevel >= n.requirements.prestige
        : true) &&
      (n.requirements.season
        ? MissionHubSeasons.currentSeason === n.requirements.season
        : true) &&
      (n.requirements.ritual
        ? MissionHubRituals.rituals[n.requirements.ritual]?.completed
        : true)
    );
  },

  unlock(id, userId) {
    if (!this.canUnlock(id, userId)) return false;

    this.unlocked[id] = true;

    RealmEvent.emit("missionhub.metatree.unlock", {
      id,
      userId
    });

    TelemetryBus.emit("missionhub.metatree.unlock", {
      id,
      userId
    });

    console.log(`[MetaTree] Node unlocked: ${id}`);

    // Apply rewards
    const node = this.nodes[id];
    if (node.reward?.multiplier) {
      MissionHubPrestige.multiplier += node.reward.multiplier;
    }

    if (node.reward?.agent) {
      RealmEvent.emit("missionhub.agent.enable", {
        agent: node.reward.agent
      });
    }

    return true;
  }
};

// ============================
// Meta‑Tree Node Definitions
// ============================

MissionHubMetaTree.defineNode("root_awaken", {
  title: "Awakening",
  description: "Begin your journey into the Mission Hub meta‑realm.",
  requirements: { xp: 100 },
  reward: { multiplier: 0.1 }
});

MissionHubMetaTree.defineNode("flux_mastery", {
  title: "Flux Mastery",
  description: "Harness Ω flux at a higher level.",
  requirements: { omega: 20 },
  reward: { multiplier: 0.2 }
});

MissionHubMetaTree.defineNode("prestige_path", {
  title: "Prestige Path",
  description: "Unlock deeper ascension.",
  requirements: { prestige: 2 },
  reward: { multiplier: 0.3 }
});

MissionHubMetaTree.defineNode("ritual_path", {
  title: "Ritual Path",
  description: "Unlock ritual‑driven progression.",
  requirements: { ritual: "daily_flux" },
  reward: { multiplier: 0.15 }
});

MissionHubMetaTree.defineNode("season_path", {
  title: "Season Path",
  description: "Unlock seasonal progression bonuses.",
  requirements: { season: "season_alpha" },
  reward: { multiplier: 0.25 }
});
