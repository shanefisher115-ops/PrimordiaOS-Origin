import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";
import { MissionHubPrestige } from "./mission_hub_prestige";
import { MissionHubMetaTree } from "./mission_hub_metatree";
import { MissionHubWorldstate } from "./mission_hub_worldstate";
import { MissionHubRealmFusion } from "./mission_hub_realm_fusion";

export const MissionHubPrime = {
  primeLevel: 0,
  catalysts: 0,
  blessings: [],
  mutations: [],

  requirements: {
    prestige: 5,
    metaNodes: 5,
    worldPhase: "surge",
    fusionActive: true
  },

  canAscend() {
    const prestigeOK = MissionHubPrestige.prestigeLevel >= this.requirements.prestige;
    const metaOK = Object.keys(MissionHubMetaTree.unlocked).length >= this.requirements.metaNodes;
    const phaseOK = MissionHubWorldstate.state.phase === this.requirements.worldPhase;
    const fusionOK = Object.values(MissionHubRealmFusion.links).some((l) => l.active);

    return prestigeOK && metaOK && phaseOK && fusionOK;
  },

  ascend() {
    if (!this.canAscend()) return false;

    this.primeLevel++;
    this.catalysts++;

    const blessing = this.generateBlessing();
    const mutation = this.generateMutation();

    this.blessings.push(blessing);
    this.mutations.push(mutation);

    RealmEvent.emit("missionhub.prime.ascend", {
      level: this.primeLevel,
      blessing,
      mutation
    });

    TelemetryBus.emit("missionhub.prime", {
      level: this.primeLevel,
      blessing,
      mutation
    });

    console.log(`[Prime] Ascended to Prime Level ${this.primeLevel}`);
    console.log(`[Prime] Blessing: ${blessing}`);
    console.log(`[Prime] Mutation: ${mutation}`);

    return true;
  },

  generateBlessing() {
    const blessings = [
      "Prime Flux Surge (+50% Ω generation)",
      "Prime XP Torrent (+40% XP gain)",
      "Prime Stability Field (+30% world stability)",
      "Prime Velocity Echo (+25% mission velocity)",
      "Prime Director Insight (Director AI gains new decision tier)"
    ];
    return blessings[Math.floor(Math.random() * blessings.length)];
  },

  generateMutation() {
    const mutations = [
      "Worldstate Drift Mutation (phases shift faster)",
      "Flux Instability Mutation (storms last longer)",
      "Prestige Overdrive Mutation (prestige multiplier accelerates)",
      "Meta‑Tree Bloom Mutation (nodes unlock faster)",
      "Fusion Cascade Mutation (fusion links chain‑activate)"
    ];
    return mutations[Math.floor(Math.random() * mutations.length)];
  }
};
