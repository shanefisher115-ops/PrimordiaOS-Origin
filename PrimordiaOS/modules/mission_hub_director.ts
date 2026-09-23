import { MissionHubWorldstate } from "./mission_hub_worldstate";
import { MissionHub } from "./mission_hub_engine";
import { MissionHubRituals } from "./mission_hub_rituals";
import { MissionHubSeasons } from "./mission_hub_seasons";
import { MissionHubPrestige } from "./mission_hub_prestige";
import { MissionHubMetaTree } from "./mission_hub_metatree";
import { MissionHubSwarm } from "./mission_hub_swarm";
import { TelemetryBus } from "../services/telemetry";
import { RealmEvent } from "../realms/realm-events";

export const MissionHubDirector = {
  decisions: [],
  lastDecision: null,

  evaluate(userId) {
    const ws = MissionHubWorldstate.state;
    const state = MissionHub.getUserState(userId);

    const score = {
      flux: ws.fluxLevel,
      stability: ws.stability,
      difficulty: ws.difficulty,
      xp: state.xp,
      omega: state.omega,
      prestige: MissionHubPrestige.prestigeLevel,
      season: MissionHubSeasons.currentSeason,
      rituals: MissionHubRituals.activeRituals.length,
      meta: Object.keys(MissionHubMetaTree.unlocked).length
    };

    return score;
  },

  decide(userId) {
    const s = this.evaluate(userId);

    let action = null;

    // ============================
    // Director Decision Logic
    // ============================

    if (s.flux > 4 && s.stability < 0.4) {
      action = "trigger_flux_storm_event";
    }

    else if (s.difficulty > 1.5 && s.xp < 500) {
      action = "reduce_global_difficulty";
    }

    else if (s.prestige >= 3 && s.meta < 3) {
      action = "unlock_meta_node";
    }

    else if (s.rituals === 0 && s.stability > 0.7) {
      action = "start_daily_ritual";
    }

    else if (s.season === "season_alpha" && s.xp > 1000) {
      action = "accelerate_season_progress";
    }

    else {
      action = "boost_mission_rewards";
    }

    this.lastDecision = action;
    this.decisions.push({ time: Date.now(), action });

    RealmEvent.emit("missionhub.director.decision", { action });
    TelemetryBus.emit("missionhub.director", { action });

    console.log("[Director] Decision:", action);

    this.execute(action, userId);
  },

  execute(action, userId) {
    switch (action) {
      case "trigger_flux_storm_event":
        MissionHubRituals.triggerEvent("flux_storm");
        break;

      case "reduce_global_difficulty":
        MissionHubWorldstate.update({ difficulty: 1 });
        break;

      case "unlock_meta_node":
        Object.keys(MissionHubMetaTree.nodes).forEach((id) => {
          MissionHubMetaTree.unlock(id, userId);
        });
        break;

      case "start_daily_ritual":
        MissionHubRituals.startRitual("daily_flux");
        break;

      case "accelerate_season_progress":
        MissionHubSeasons.updateProgress(0.1);
        break;

      case "boost_mission_rewards":
        MissionHub.addXP(userId, 20);
        MissionHub.addOmega(userId, 1);
        break;
    }
  }
};
