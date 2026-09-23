import { eventBus } from "./event-bus.js";

/**
 * Reactive distributed state store for PrimordiaOS.
 */
export class DistributedStateBus {
  constructor() {
    this.state = {
      system: {
        status: "initializing",
        version: "1.0.0",
        boot_time: Date.now(),
        coherence_score: 100
      },
      realms: {
        local_realm: { status: "active", metrics: { active_agents: 5, cpu_load: "low" } },
        cloud_realm: { status: "active", metrics: { gateway_status: "connected", workers_active: 3 } },
        simulation_realm: { status: "active", metrics: { ue5_connected: false, particle_rate: 60 } },
        economic_realm: { status: "active", metrics: { loop_interval_s: 12, last_pulse: Date.now() } },
        identity_realm: { status: "active", metrics: { ledger_height: 1, signatures_valid: true } }
      },
      telemetry: {
        total_events: 0,
        last_antigrav_score: 95
      }
    };

    // Auto-update event count on every bus event
    eventBus.on("*", () => {
      this.state.telemetry.total_events++;
    });
  }

  /**
   * Update realm state.
   * @param {string} realmName 
   * @param {object} partialState 
   */
  updateRealmState(realmName, partialState) {
    if (!this.state.realms[realmName]) {
      this.state.realms[realmName] = { status: "active", metrics: {} };
    }
    this.state.realms[realmName] = {
      ...this.state.realms[realmName],
      ...partialState,
      metrics: {
        ...this.state.realms[realmName].metrics,
        ...(partialState.metrics || {})
      },
      updated_at: Date.now()
    };

    eventBus.emitRealmEvent("STATE_MUTATION", { realm: realmName, state: this.state.realms[realmName] }, realmName);
  }

  /**
   * Returns a complete state snapshot.
   */
  getSnapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }
}

export const stateBus = new DistributedStateBus();
