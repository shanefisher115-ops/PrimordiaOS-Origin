import { MissionHubMultiverse } from "../modules/mission_hub_multiverse";
import { MissionHubWorldstate } from "../modules/mission_hub_worldstate";

export class MissionHubMultiverseAgent {
  constructor() {
    this.start();
  }

  start() {
    // Auto‑spawn universes based on worldstate extremes
    setInterval(() => {
      const ws = MissionHubWorldstate.state;

      if (ws.fluxLevel > 5) {
        MissionHubMultiverse.createUniverse("flux_realm_" + Date.now(), {
          fluxLevel: ws.fluxLevel * 1.5,
          mood: "volatile"
        });
      }

      if (ws.stability < 0.3) {
        MissionHubMultiverse.createUniverse("unstable_realm_" + Date.now(), {
          stability: ws.stability * 0.5,
          mood: "chaotic"
        });
      }
    }, 6000);

    // Auto‑collapse unstable universes
    setInterval(() => {
      Object.values(MissionHubMultiverse.universes).forEach((u) => {
        if (u.instability > 0.8) {
          MissionHubMultiverse.collapseUniverse(u.id);
        }
      });
    }, 8000);

    // Auto‑fuse universes occasionally
    setInterval(() => {
      const ids = Object.keys(MissionHubMultiverse.universes);
      if (ids.length >= 2) {
        const a = ids[Math.floor(Math.random() * ids.length)];
        const b = ids[Math.floor(Math.random() * ids.length)];
        if (a !== b) {
          MissionHubMultiverse.fuseUniverses(a, b, "fusion_" + Date.now());
        }
      }
    }, 12000);

    console.log("[MissionHubMultiverseAgent] Online.");
  }
}

export const MissionHubMultiverseAgentInstance =
  new MissionHubMultiverseAgent();
