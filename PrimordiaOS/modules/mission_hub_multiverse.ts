import { RealmEvent } from "../realms/realm-events";
import { TelemetryBus } from "../services/telemetry";
import { MissionHubWorldstate } from "./mission_hub_worldstate";

export const MissionHubMultiverse = {
  universes: {},
  activeUniverse: "prime",

  createUniverse(id, overrides = {}) {
    this.universes[id] = {
      id,
      created: Date.now(),
      worldstate: {
        ...JSON.parse(JSON.stringify(MissionHubWorldstate.state)),
        ...overrides
      },
      agents: {},
      timelineOffset: Math.random() * 10000,
      instability: Math.random() * 0.5
    };

    RealmEvent.emit("missionhub.multiverse.create", { id });
    TelemetryBus.emit("missionhub.multiverse", { id });

    console.log(`[Multiverse] Universe created: ${id}`);
  },

  switchUniverse(id) {
    if (!this.universes[id]) return;

    this.activeUniverse = id;

    RealmEvent.emit("missionhub.multiverse.switch", { id });
    console.log(`[Multiverse] Switched to universe: ${id}`);
  },

  collapseUniverse(id) {
    if (!this.universes[id]) return;

    delete this.universes[id];

    RealmEvent.emit("missionhub.multiverse.collapse", { id });
    console.log(`[Multiverse] Universe collapsed: ${id}`);
  },

  fuseUniverses(a, b, fusedId) {
    if (!this.universes[a] || !this.universes[b]) return;

    const ua = this.universes[a];
    const ub = this.universes[b];

    const fused = {
      id: fusedId,
      created: Date.now(),
      worldstate: {
        fluxLevel: (ua.worldstate.fluxLevel + ub.worldstate.fluxLevel) / 2,
        stability: (ua.worldstate.stability + ub.worldstate.stability) / 2,
        difficulty: Math.max(ua.worldstate.difficulty, ub.worldstate.difficulty),
        mood: ua.worldstate.mood === ub.worldstate.mood ? ua.worldstate.mood : "chaotic",
        phase: ua.worldstate.phase === ub.worldstate.phase ? ua.worldstate.phase : "fusion"
      },
      agents: { ...ua.agents, ...ub.agents },
      timelineOffset: (ua.timelineOffset + ub.timelineOffset) / 2,
      instability: (ua.instability + ub.instability) / 2 + 0.1
    };

    this.universes[fusedId] = fused;

    RealmEvent.emit("missionhub.multiverse.fuse", { a, b, fusedId });
    console.log(`[Multiverse] Universes fused: ${a} + ${b} → ${fusedId}`);
  }
};
