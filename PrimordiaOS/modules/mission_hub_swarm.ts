import { TelemetryBus } from "../services/telemetry";
import { RealmEvent } from "../realms/realm-events";

export const MissionHubSwarm = {
  agents: {},
  health: {},
  priority: {},
  lastPulse: Date.now(),

  register(id, agent, priority = 1) {
    this.agents[id] = agent;
    this.priority[id] = priority;
    this.health[id] = { alive: true, lastBeat: Date.now() };

    console.log(`[Swarm] Registered agent: ${id}`);
  },

  beat(id) {
    if (!this.health[id]) return;
    this.health[id].alive = true;
    this.health[id].lastBeat = Date.now();
  },

  pulse() {
    const now = Date.now();

    Object.keys(this.agents).forEach((id) => {
      const h = this.health[id];

      if (now - h.lastBeat > 5000) {
        h.alive = false;
        console.warn(`[Swarm] Agent offline: ${id}`);
      }
    });

    this.lastPulse = now;

    TelemetryBus.emit("missionhub.swarm.pulse", {
      timestamp: now,
      health: this.health,
      priority: this.priority
    });
  },

  optimize() {
    const sorted = Object.keys(this.priority).sort(
      (a, b) => this.priority[b] - this.priority[a]
    );

    RealmEvent.emit("missionhub.swarm.optimize", {
      timestamp: Date.now(),
      order: sorted
    });

    console.log("[Swarm] Optimization order:", sorted);
  }
};

// Pulse loop
setInterval(() => MissionHubSwarm.pulse(), 2000);

// Optimization loop
setInterval(() => MissionHubSwarm.optimize(), 6000);
