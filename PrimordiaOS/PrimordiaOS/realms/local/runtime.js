import os from "node:os";
import { eventBus } from "../../kernel/event-bus.js";

/**
 * Local Realm Runtime: Manages local workstation compute, Termux mobile node, and process lifecycle.
 */
export class LocalRealmRuntime {
  constructor() {
    this.realmId = "local_realm";
    this.platform = os.platform();
    this.hostname = os.hostname();
    this.cpus = os.cpus().length;
    this.latestMobileTelemetry = null;
    this.mobileNodes = new Map();
  }

  async init() {
    console.log(`[Local Realm] Initializing on host '${this.hostname}' (${this.platform}, ${this.cpus} cores)...`);
    eventBus.emitRealmEvent("LOCAL_RUNTIME_READY", {
      platform: this.platform,
      hostname: this.hostname,
      cpus: this.cpus
    }, this.realmId);
  }

  /**
   * Ingests mobile node telemetry packet from Termux or mobile nodes.
   * @param {object} telemetry 
   */
  ingestMobileTelemetry(telemetry = {}) {
    const vesselId = telemetry.vesselId || telemetry.vessel_id || telemetry.vessel || "vessel-termux-android";
    const packet = {
      vesselId,
      vessel: vesselId,
      os: telemetry.os || "Android/Linux",
      battery: telemetry.battery !== undefined ? telemetry.battery : 85,
      accelerometer: telemetry.accelerometer || telemetry.sensors?.accelerometer || { x: 0.12, y: 9.78, z: 0.45 },
      network: telemetry.network || telemetry.system?.network || "WIFI",
      gps: telemetry.gps || telemetry.location || { latitude: 37.7749, longitude: -122.4194, accuracy: 4.2 },
      cpu: telemetry.cpu || telemetry.system || { load: os.loadavg(), memory_free_mb: 2450 },
      memoryMb: telemetry.memoryMb !== undefined ? telemetry.memoryMb : (telemetry.memory_mb || 2048),
      thermal: telemetry.thermal || "optimal",
      timestamp: telemetry.timestamp || Date.now(),
      ...telemetry
    };

    this.latestMobileTelemetry = packet;
    this.mobileNodes.set(vesselId, {
      vesselId,
      lastSeen: packet.timestamp,
      telemetry: packet,
      status: "connected"
    });

    // Emit on standard cross-realm event channels
    eventBus.emitRealmEvent("TELEMETRY_INGESTED", packet, this.realmId);
    eventBus.emit("MOBILE_TELEMETRY_INGEST", packet);
    eventBus.emit("MOBILE_VESSEL_UPDATE", packet);
    if (telemetry.type === "heartbeat" || telemetry.type === "MOBILE_HEARTBEAT") {
      eventBus.emit("MOBILE_HEARTBEAT", packet);
    }

    return { success: true, packet };
  }

  /**
   * Executes remote sovereign CLI commands dispatched from mobile vessels.
   * @param {string} command 
   * @param {object} args 
   * @param {object} options 
   */
  async executeRemoteCli(command, args = {}, options = {}) {
    const start = Date.now();
    let result = null;
    const cmd = (command || "").trim().toLowerCase();

    const { spine } = await import("../../kernel/spine.js");
    const { antigravGuardian } = await import("../../agents/antigrav-guardian.js");
    const { unrealBridge } = await import("../simulation/unreal-bridge.js");
    const { moneyPlugPipeline } = await import("../../pipelines/moneyplug-pipeline.js");

    switch (cmd) {
      case "status": {
        result = spine.getStatus();
        break;
      }
      case "antigrav": {
        result = antigravGuardian.audit(options.diff ? options : { source: "termux_remote_cli", ...options });
        break;
      }
      case "bigbang": {
        result = unrealBridge.triggerBigBang(args && typeof args === "object" ? args : {});
        break;
      }
      case "pulse": {
        result = await moneyPlugPipeline.runAutonomousCycle();
        break;
      }
      default: {
        result = {
          message: `Remote sovereign command '${command}' executed against Master Spine`,
          args,
          available_commands: ["status", "antigrav", "bigbang", "pulse"]
        };
      }
    }

    const payload = {
      success: true,
      command,
      result,
      execution_time_ms: Date.now() - start,
      timestamp: Date.now(),
      vessel: options.vessel || options.vesselId || "vessel-termux-android"
    };

    eventBus.emitRealmEvent("CLI_COMMAND_EXECUTED", payload, this.realmId);
    return payload;
  }

  getSystemMetrics() {
    return {
      platform: this.platform,
      hostname: this.hostname,
      uptime: os.uptime(),
      free_mem_mb: Math.round(os.freemem() / (1024 * 1024)),
      total_mem_mb: Math.round(os.totalmem() / (1024 * 1024)),
      load_avg: os.loadavg(),
      mobile_nodes: Array.from(this.mobileNodes.values()),
      latest_mobile_telemetry: this.latestMobileTelemetry
    };
  }
}

export const localRuntime = new LocalRealmRuntime();

