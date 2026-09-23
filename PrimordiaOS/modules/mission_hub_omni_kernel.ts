import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";
import { MissionHubWorldstate } from "./mission_hub_worldstate";
import { MissionHubMultiverse } from "./mission_hub_multiverse";
import { MissionHubDirector } from "./mission_hub_director";
import { MissionHubPrime } from "./mission_hub_prime";

export const MissionHubOmniKernel = {
  agents: {},
  memory: {
    worldstateHistory: [],
    multiverseHistory: [],
    decisions: [],
    anomalies: []
  },

  goals: {
    stability: 0.7,
    fluxBalance: 3,
    progression: 1,
    multiversalExpansion: true,
    primeAscension: true
  },

  register(id, agent) {
    this.agents[id] = agent;

    RealmEvent.emit("missionhub.omnikernel.register", { id });
    console.log(`[OmniKernel] Registered agent: ${id}`);
  },

  perceive() {
    const ws = MissionHubWorldstate.state;
    const mv = MissionHubMultiverse.universes;

    this.memory.worldstateHistory.push(ws);
    this.memory.multiverseHistory.push(JSON.parse(JSON.stringify(mv)));

    return { ws, mv };
  },

  decide() {
    const { ws, mv } = this.perceive();

    let action = null;

    // ============================
    // Omni‑Agent Decision Logic
    // ============================

    if (ws.stability < this.goals.stability) {
      action = "increase_stability";
    }

    else if (ws.fluxLevel > this.goals.fluxBalance) {
      action = "reduce_flux";
    }

    else if (Object.keys(mv).length < 3 && this.goals.multiversalExpansion) {
      action = "spawn_universe";
    }

    else if (MissionHubPrime.primeLevel < 2 && this.goals.primeAscension) {
      action = "accelerate_prime";
    }

    else {
      action = "optimize_agents";
    }

    this.memory.decisions.push({ time: Date.now(), action });

    RealmEvent.emit("missionhub.omnikernel.decision", { action });
    TelemetryBus.emit("missionhub.omnikernel", { action });

    console.log("[OmniKernel] Decision:", action);

    this.execute(action);
  },

  execute(action) {
    switch (action) {
      case "increase_stability":
        MissionHubWorldstate.update({ stability: MissionHubWorldstate.state.stability + 0.1 });
        break;

      case "reduce_flux":
        MissionHubWorldstate.update({ fluxLevel: MissionHubWorldstate.state.fluxLevel * 0.9 });
        break;

      case "spawn_universe":
        MissionHubMultiverse.createUniverse("omni_spawn_" + Date.now(), {
          fluxLevel: MissionHubWorldstate.state.fluxLevel * 1.2,
          mood: "neutral"
        });
        break;

      case "accelerate_prime":
        MissionHubPrime.catalysts += 1;
        break;

      case "optimize_agents":
        Object.values(this.agents).forEach((agent) => {
          if (agent.optimize) agent.optimize();
        });
        break;
    }
  }
};
