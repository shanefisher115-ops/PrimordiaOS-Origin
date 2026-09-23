import { eventBus } from "../kernel/event-bus.js";
import { unrealBridge } from "../realms/simulation/unreal-bridge.js";

/**
 * Unreal Simulation Pipeline: Bridges Unreal Engine 5, Niagara systems, and world state machine.
 */
export class UnrealPipeline {
  constructor() {
    this.name = "Unreal Simulation Pipeline";
    this.running = false;
    this.unrealMessageListener = null;
    this.playStartedListener = null;
    this.bigBangListener = null;
    this.simTickListener = null;
    this.lastGenesisTrigger = null;
  }

  async start() {
    this.running = true;
    console.log(`[Pipeline] ${this.name} started.`);

    // 1. Listen for inbound WebSocket RPC messages from Unreal Engine 5
    this.unrealMessageListener = (evt) => {
      const data = evt.payload || evt.data || evt;
      const msgType = data.type || data.name;

      if (msgType === "UNREAL_PLAY_STARTED" || msgType === "TRIGGER_BIG_BANG") {
        console.log("🌌 [Unreal Pipeline] Inbound UNREAL_PLAY_STARTED detected -> Auto-triggering BIG_BANG_TRIGGER genesis sequence...");
        const params = data.params || data.payload || data;
        this.lastGenesisTrigger = unrealBridge.triggerBigBang({
          singularity_intensity: params.singularity_intensity !== undefined ? params.singularity_intensity : params.intensity,
          intensity: params.intensity !== undefined ? params.intensity : params.singularity_intensity,
          niagara_system: params.niagara_system || params.niagara,
          niagara: params.niagara_system || params.niagara,
          cosmic_color: params.cosmic_color || params.color,
          color: params.cosmic_color || params.color,
          swarm_count: params.swarm_count !== undefined ? params.swarm_count : params.swarmCount,
          swarmCount: params.swarm_count !== undefined ? params.swarm_count : params.swarmCount
        });
      }
    };
    eventBus.on("UNREAL_MESSAGE_RECEIVED", this.unrealMessageListener);

    // 2. Direct event bus listener for UNREAL_PLAY_STARTED
    this.playStartedListener = (evt) => {
      const data = evt.payload || evt.data || evt;
      console.log("🌌 [Unreal Pipeline] Direct UNREAL_PLAY_STARTED event -> Auto-triggering BIG_BANG_TRIGGER...");
      const params = data.params || data.payload || data;
      this.lastGenesisTrigger = unrealBridge.triggerBigBang({
        singularity_intensity: params.singularity_intensity !== undefined ? params.singularity_intensity : params.intensity,
        intensity: params.intensity !== undefined ? params.intensity : params.singularity_intensity,
        niagara_system: params.niagara_system || params.niagara,
        niagara: params.niagara_system || params.niagara,
        cosmic_color: params.cosmic_color || params.color,
        color: params.cosmic_color || params.color,
        swarm_count: params.swarm_count !== undefined ? params.swarm_count : params.swarmCount,
        swarmCount: params.swarm_count !== undefined ? params.swarm_count : params.swarmCount
      });
    };
    eventBus.on("UNREAL_PLAY_STARTED", this.playStartedListener);

    // 3. Log and broadcast BIG_BANG_TRIGGER
    this.bigBangListener = (evt) => {
      console.log("🌌 [Unreal Pipeline] Processing BIG_BANG_TRIGGER -> Broadcasting to Unreal Niagara Streams...");
    };
    eventBus.on("BIG_BANG_TRIGGER", this.bigBangListener);

    // 4. Periodic simulation tick handling
    this.simTickListener = (evt) => {
      // Periodic telemetry emission
    };
    eventBus.on("SIMULATION_TICK", this.simTickListener);
  }

  stop() {
    this.running = false;
    if (this.unrealMessageListener) {
      eventBus.off("UNREAL_MESSAGE_RECEIVED", this.unrealMessageListener);
      this.unrealMessageListener = null;
    }
    if (this.playStartedListener) {
      eventBus.off("UNREAL_PLAY_STARTED", this.playStartedListener);
      this.playStartedListener = null;
    }
    if (this.bigBangListener) {
      eventBus.off("BIG_BANG_TRIGGER", this.bigBangListener);
      this.bigBangListener = null;
    }
    if (this.simTickListener) {
      eventBus.off("SIMULATION_TICK", this.simTickListener);
      this.simTickListener = null;
    }
    console.log(`[Pipeline] ${this.name} stopped.`);
  }
}

export const unrealPipeline = new UnrealPipeline();

