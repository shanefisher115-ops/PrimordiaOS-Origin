import { eventBus } from "../../kernel/event-bus.js";

/**
 * Unreal Engine 5 Bridge Adapter for Simulation Realm.
 * Connects directly with the Port 17800 Event Server and Unreal Engine instances.
 */
export class UnrealBridgeAdapter {
  constructor(port = 17800) {
    this.realmId = "simulation_realm";
    this.port = port;
    this.connected = false;
    this.activeSimulations = new Set();
  }

  async init() {
    console.log(`[Simulation Realm] Initializing Unreal Engine Bridge on port ${this.port}...`);
    this.connected = true;

    eventBus.emitRealmEvent("UNREAL_BRIDGE_READY", {
      port: this.port,
      connected: this.connected,
      protocol: "ws"
    }, this.realmId);
  }

  /**
   * Broadcasts Big Bang / Genesis event to Unreal Engine and Niagara emitters.
   * @param {object} params 
   */
  triggerBigBang(params = {}) {
    const payload = {
      genesis: true,
      singularity_intensity: params.singularity_intensity !== undefined ? params.singularity_intensity : (params.intensity !== undefined ? params.intensity : 2.5),
      niagara_system: params.niagara_system || params.niagara || "NS_PrimordiaBigBang",
      cosmic_color: params.cosmic_color || params.color || "#33bbff",
      swarm_count: params.swarm_count !== undefined ? params.swarm_count : (params.swarmCount !== undefined ? params.swarmCount : 6),
      timestamp: new Date().toISOString()
    };

    console.log("★ [Simulation Realm] Emitting BIG_BANG_TRIGGER to Unreal Engine...");
    eventBus.emitRealmEvent("BIG_BANG_TRIGGER", payload, this.realmId);
    return payload;
  }
}

export const unrealBridge = new UnrealBridgeAdapter();
