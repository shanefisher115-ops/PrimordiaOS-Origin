import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";
import { MissionHubWorldstate } from "./mission_hub_worldstate";
import { MissionHubPrestige } from "./mission_hub_prestige";
import { MissionHubMetaTree } from "./mission_hub_metatree";
import { MissionHubSeasons } from "./mission_hub_seasons";
import { MissionHubRituals } from "./mission_hub_rituals";

export const MissionHubRealmFusion = {
  links: {},
  fusionEvents: [],

  defineLink(id, data) {
    this.links[id] = {
      id,
      ...data,
      active: false
    };
  },

  activateLink(id) {
    const link = this.links[id];
    if (!link) return;

    link.active = true;

    this.fusionEvents.push({
      id,
      time: Date.now(),
      type: "fusion_activated"
    });

    RealmEvent.emit("missionhub.realmfusion.activate", { id });
    TelemetryBus.emit("missionhub.realmfusion", { id, active: true });

    console.log(`[RealmFusion] Activated link: ${id}`);

    this.applyFusionEffects(id);
  },

  applyFusionEffects(id) {
    const link = this.links[id];
    if (!link || !link.active) return;

    // ============================
    // Fusion Rules
    // ============================

    if (link.effects.worldstateBoost) {
      MissionHubWorldstate.update({
        fluxLevel: MissionHubWorldstate.state.fluxLevel + link.effects.worldstateBoost
      });
    }

    if (link.effects.prestigeBoost) {
      MissionHubPrestige.prestigePoints += link.effects.prestigeBoost;
      MissionHubPrestige.multiplier += link.effects.prestigeBoost * 0.1;
    }

    if (link.effects.metaUnlock) {
      MissionHubMetaTree.unlock(link.effects.metaUnlock, "defaultUser");
    }

    if (link.effects.seasonProgress) {
      MissionHubSeasons.updateProgress(link.effects.seasonProgress);
    }

    if (link.effects.ritualTrigger) {
      MissionHubRituals.triggerEvent(link.effects.ritualTrigger);
    }

    console.log(`[RealmFusion] Applied fusion effects for: ${id}`);
  }
};

// ============================
// Realm Fusion Definitions
// ============================

MissionHubRealmFusion.defineLink("fusion_fluxworld", {
  title: "Flux‑World Convergence",
  description: "Worldstate flux merges with mission flux.",
  effects: {
    worldstateBoost: 1,
    ritualTrigger: "flux_storm"
  }
});

MissionHubRealmFusion.defineLink("fusion_prestige_core", {
  title: "Prestige‑Core Alignment",
  description: "Prestige ascension merges with meta‑progression.",
  effects: {
    prestigeBoost: 2,
    metaUnlock: "prestige_path"
  }
});

MissionHubRealmFusion.defineLink("fusion_seasonal_gate", {
  title: "Seasonal Gate Opening",
  description: "Seasonal progression merges with ritual progression.",
  effects: {
    seasonProgress: 0.2,
    ritualTrigger: "daily_flux"
  }
});
