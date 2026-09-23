import { eventBus } from "../../kernel/event-bus.js";

/**
 * Niagara Particle Stream telemetry and visual state controller.
 * Normalizes metrics schema for Unreal Engine 5 UPrimordiaBridgeSubsystem and WebSocket bridge.
 */
export class NiagaraStreamController {
  constructor() {
    this.activeEmitters = ["NS_PrimordiaBigBang", "NS_AuraStream", "NS_CognitionPulse"];
  }

  emitPulse(emitterName, color = "#00ffff", count = 100, metrics = {}) {
    const payload = {
      emitter: emitterName,
      color,
      count,
      timestamp: Date.now(),
      data: {
        metrics: {
          AuraSpeed: metrics.AuraSpeed !== undefined ? metrics.AuraSpeed : 0.85,
          ChaosLevel: metrics.ChaosLevel !== undefined ? metrics.ChaosLevel : 0.12,
          ParticleDensity: count,
          ...metrics
        }
      }
    };
    eventBus.emitRealmEvent("NIAGARA_PULSE", payload, "simulation_realm");
    eventBus.emitRealmEvent("TELEMETRY_UPDATE", payload, "simulation_realm");
    return payload;
  }

  emitMetrics(metrics = {}) {
    const payload = {
      type: "telemetry_update",
      data: {
        metrics: {
          AuraSpeed: metrics.AuraSpeed !== undefined ? metrics.AuraSpeed : 0.85,
          ChaosLevel: metrics.ChaosLevel !== undefined ? metrics.ChaosLevel : 0.12,
          coherence: metrics.coherence !== undefined ? metrics.coherence : 100,
          particle_rate: metrics.particle_rate !== undefined ? metrics.particle_rate : 60,
          ...metrics
        }
      },
      timestamp: Date.now()
    };
    eventBus.emitRealmEvent("TELEMETRY_UPDATE", payload, "simulation_realm");
    return payload;
  }
}

export const niagaraStream = new NiagaraStreamController();

