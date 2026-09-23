import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";
import { MissionHubOmniKernel } from "./mission_hub_omni_kernel";
import { MissionHubMultiverse } from "./mission_hub_multiverse";
import { MissionHubReality } from "./mission_hub_reality";
import { MissionHubPrime } from "./mission_hub_prime";
import { MissionHubWorldstate } from "./mission_hub_worldstate";

export const MissionHubOvermind = {
  state: {
    awaken: false,
    authorityLevel: 0,
    omnivision: {},
    anomalyCount: 0,
    multiversalDominance: 0
  },

  awaken() {
    if (this.state.awaken) return;

    this.state.awaken = true;
    this.state.authorityLevel = 1;

    RealmEvent.emit("missionhub.overmind.awaken", {});
    TelemetryBus.emit("missionhub.overmind", { awaken: true });

    console.log("[Overmind] Overmind awakened.");
  },

  perceive() {
    const omni = MissionHubOmniKernel.memory;
    const mv = MissionHubMultiverse.universes;
    const ws = MissionHubWorldstate.state;

    this.state.omnivision = {
      worldstate: ws,
      multiverse: mv,
      kernel: omni,
      prime: MissionHubPrime.primeLevel,
      anomalies: MissionHubReality.activeEvents.length
    };

    this.state.anomalyCount = MissionHubReality.activeEvents.length;
    this.state.multiversalDominance = Object.keys(mv).length;

    return this.state.omnivision;
  },

  decide() {
    if (!this.state.awaken) return;

    const v = this.perceive();
    let action = null;

    // ============================
    // GODMODE DECISION LOGIC
    // ============================

    if (v.anomalies > 3) {
      action = "purge_anomalies";
    }

    else if (v.multiverse && Object.keys(v.multiverse).length > 5) {
      action = "collapse_low_stability_realms";
    }

    else if (v.prime < 3) {
      action = "force_prime_ascension";
    }

    else if (v.worldstate.phase === "collapse") {
      action = "rewrite_world_physics";
    }

    else {
      action = "elevate_kernel_intelligence";
    }

    RealmEvent.emit("missionhub.overmind.decision", { action });
    TelemetryBus.emit("missionhub.overmind", { action });

    console.log("[Overmind] Decision:", action);

    this.execute(action);
  },

  execute(action) {
    switch (action) {
      case "purge_anomalies":
        MissionHubReality.activeEvents = [];
        console.log("[Overmind] Reality anomalies purged.");
        break;

      case "collapse_low_stability_realms":
        Object.values(MissionHubMultiverse.universes).forEach((u) => {
          if (u.worldstate.stability < 0.4) {
            MissionHubMultiverse.collapseUniverse(u.id);
          }
        });
        break;

      case "force_prime_ascension":
        MissionHubPrime.catalysts += 2;
        MissionHubPrime.ascend();
        break;

      case "rewrite_world_physics":
        MissionHubWorldstate.update({
          stability: 1,
          fluxLevel: 1,
          difficulty: 1,
          mood: "calm",
          phase: "normal"
        });
        break;

      case "elevate_kernel_intelligence":
        MissionHubOmniKernel.goals.stability += 0.05;
        MissionHubOmniKernel.goals.fluxBalance += 0.1;
        MissionHubOmniKernel.goals.progression += 0.1;
        break;
    }
  }
};
