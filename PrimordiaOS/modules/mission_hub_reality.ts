import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";
import { MissionHubWorldstate } from "./mission_hub_worldstate";
import { MissionHubDirector } from "./mission_hub_director";
import { MissionHubRealmFusion } from "./mission_hub_realm_fusion";
import { MissionHubPrime } from "./mission_hub_prime";

export const MissionHubReality = {
  events: {},
  activeEvents: [],

  define(id, data) {
    this.events[id] = {
      id,
      ...data,
      triggered: false
    };
  },

  trigger(id) {
    const e = this.events[id];
    if (!e || e.triggered) return;

    e.triggered = true;
    this.activeEvents.push(id);

    RealmEvent.emit("missionhub.reality.event", { id });
    TelemetryBus.emit("missionhub.reality", { id });

    console.log(`[Reality] Reality‑Bending Event Triggered: ${id}`);

    this.applyEffects(id);
  },

  applyEffects(id) {
    const e = this.events[id];
    if (!e) return;

    // ============================
    // Reality‑Bending Effects
    // ============================

    if (e.effects.timeWarp) {
      MissionHubWorldstate.update({
        fluxLevel: MissionHubWorldstate.state.fluxLevel * e.effects.timeWarp
      });
    }

    if (e.effects.worldFlip) {
      MissionHubWorldstate.update({
        stability: 1 - MissionHubWorldstate.state.stability,
        difficulty: 3 - MissionHubWorldstate.state.difficulty
      });
    }

    if (e.effects.directorOverride) {
      MissionHubDirector.lastDecision = e.effects.directorOverride;
    }

    if (e.effects.fusionCascade) {
      Object.keys(MissionHubRealmFusion.links).forEach((id) =>
        MissionHubRealmFusion.activateLink(id)
      );
    }

    if (e.effects.primeCatalyst) {
      MissionHubPrime.catalysts += e.effects.primeCatalyst;
    }

    console.log(`[Reality] Applied reality‑bending effects for: ${id}`);
  }
};

// ============================
// Reality‑Bending Event Definitions
// ============================

MissionHubReality.define("time_dilation", {
  title: "Time Dilation",
  description: "Flux accelerates exponentially.",
  effects: {
    timeWarp: 1.5
  }
});

MissionHubReality.define("world_inversion", {
  title: "World Inversion",
  description: "Stability and difficulty invert.",
  effects: {
    worldFlip: true
  }
});

MissionHubReality.define("director_paradox", {
  title: "Director Paradox",
  description: "Director AI receives an impossible decision.",
  effects: {
    directorOverride: "paradox_event"
  }
});

MissionHubReality.define("fusion_supernova", {
  title: "Fusion Supernova",
  description: "All fusion links activate simultaneously.",
  effects: {
    fusionCascade: true
  }
});

MissionHubReality.define("prime_singularity", {
  title: "Prime Singularity",
  description: "Prime catalysts surge.",
  effects: {
    primeCatalyst: 3
  }
});
