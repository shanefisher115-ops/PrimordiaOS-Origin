import { eventBus } from "./event-bus.js";
import { stateBus } from "./state-bus.js";

/**
 * Autonomous Coherence Loop and Multi-Realm Heartbeat Orchestrator.
 */
export class CoherenceOrchestrator {
  constructor() {
    this.heartbeatIntervalMs = 12000;
    this.simTickIntervalMs = 2000;
    this.heartbeatTimer = null;
    this.simTimer = null;
    this.cycleCount = 0;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    console.log("[PrimordiaOS Orchestrator] Activating Autonomous Multi-Realm Coherence...");

    // Primary Autonomous Pulse (12s)
    this.heartbeatTimer = setInterval(() => this.pulse(), this.heartbeatIntervalMs);

    // Simulation Tick Pulse (2s)
    this.simTimer = setInterval(() => this.simTick(), this.simTickIntervalMs);

    // Initial immediate pulse
    this.pulse();
  }

  stop() {
    if (!this.running) return;
    clearInterval(this.heartbeatTimer);
    clearInterval(this.simTimer);
    this.running = false;
    console.log("[PrimordiaOS Orchestrator] Heartbeat paused.");
  }

  pulse() {
    this.cycleCount++;
    const now = Date.now();

    // 1. Update Economic Realm state
    stateBus.updateRealmState("economic_realm", {
      metrics: {
        last_pulse: now,
        cycle_index: this.cycleCount
      }
    });

    // 2. Broadcast Heartbeat
    eventBus.emitRealmEvent("HEARTBEAT_PULSE", {
      cycle: this.cycleCount,
      timestamp: now,
      coherence: 100
    }, "local_realm");

    console.log(`⚡ [PrimordiaOS Spine] Coherence Pulse #${this.cycleCount} at ${new Date().toLocaleTimeString()} — All 5 Realms Synchronized.`);
  }

  simTick() {
    const now = Date.now();
    eventBus.emitRealmEvent("SIMULATION_TICK", {
      timestamp: now,
      coherence: 100,
      particle_rate: 60
    }, "simulation_realm");

    eventBus.emitRealmEvent("TELEMETRY_UPDATE", {
      timestamp: now,
      metrics: {
        coherence: 100,
        particle_rate: 60,
        pulse_count: this.cycleCount
      }
    }, "simulation_realm");
  }
}

export const orchestrator = new CoherenceOrchestrator();
