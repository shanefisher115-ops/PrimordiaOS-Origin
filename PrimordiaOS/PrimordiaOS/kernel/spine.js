import { eventBus } from "./event-bus.js";
import { stateBus } from "./state-bus.js";
import { orchestrator } from "./orchestrator.js";

/**
 * PrimordiaSpine — Master Cognition Organism Kernel.
 * Unifies all 5 realms physically and logically into one continuous system.
 */
export class PrimordiaSpine {
  constructor() {
    this.booted = false;
    this.realms = new Map();
    this.agents = new Map();
    this.pipelines = new Map();
  }

  /**
   * Register a realm within the master spine.
   * @param {string} realmId 
   * @param {object} realmInstance 
   */
  registerRealm(realmId, realmInstance) {
    this.realms.set(realmId, realmInstance);
    console.log(`[PrimordiaSpine] Registered Realm: ${realmId}`);
    stateBus.updateRealmState(realmId, { status: "registered" });
  }

  /**
   * Register an agent in the hierarchy.
   * @param {string} agentId 
   * @param {object} agentInstance 
   */
  registerAgent(agentId, agentInstance) {
    this.agents.set(agentId, agentInstance);
    console.log(`[PrimordiaSpine] Registered Agent: ${agentId}`);
  }

  /**
   * Register a pipeline.
   * @param {string} pipelineId 
   * @param {object} pipelineInstance 
   */
  registerPipeline(pipelineId, pipelineInstance) {
    this.pipelines.set(pipelineId, pipelineInstance);
    console.log(`[PrimordiaSpine] Registered Pipeline: ${pipelineId}`);
  }

  /**
   * Boot all realms, pipelines, and autonomous coherence loops.
   */
  async boot() {
    if (this.booted) return;
    console.log("================================================================================");
    console.log("★ PRIMORDIAOS MASTER SPINE BOOT SEQUENCE INITIATED");
    console.log("★ UNIFYING: Local | Cloud | Simulation | Economic | Identity Realms");
    console.log("================================================================================");

    // 1. Mark state initializing
    stateBus.updateRealmState("local_realm", { status: "booting" });

    // 2. Initialize all registered realms
    for (const [id, realm] of this.realms.entries()) {
      if (typeof realm.init === "function") {
        await realm.init();
      }
      stateBus.updateRealmState(id, { status: "online" });
    }

    // 3. Initialize all registered pipelines
    for (const [id, pipeline] of this.pipelines.entries()) {
      if (typeof pipeline.start === "function") {
        await pipeline.start();
      }
    }

    // 4. Start Autonomous Coherence Orchestrator
    orchestrator.start();

    this.booted = true;
    stateBus.state.system.status = "operational";
    eventBus.emitRealmEvent("SPINE_READY", {
      realms_count: this.realms.size,
      agents_count: this.agents.size,
      pipelines_count: this.pipelines.size,
      timestamp: Date.now()
    }, "local_realm");

    console.log("✔ PRIMORDIAOS COGNITION ORGANISM IS LIVE AND COHERENT.");
    return this.getStatus();
  }

  /**
   * Returns current health and realm map status.
   */
  getStatus() {
    const realmsSnapshot = stateBus.getSnapshot().realms;
    const uptimeSeconds = process.uptime ? Math.floor(process.uptime()) : 0;
    const pulseCount = orchestrator ? orchestrator.cycleCount : 0;

    return {
      status: this.booted ? "running" : "initializing",
      spine_booted: this.booted,
      booted: this.booted,
      system: "PrimordiaOS Unified Multi-Realm Cognition Organism",
      uptime: uptimeSeconds,
      uptime_seconds: uptimeSeconds,
      pulse_count: pulseCount,
      realms: realmsSnapshot,
      registered_realms: realmsSnapshot,
      registered_realms_list: Array.from(this.realms.keys()),
      agents: Array.from(this.agents.keys()),
      pipelines: Array.from(this.pipelines.keys()),
      state_snapshot: stateBus.getSnapshot()
    };
  }
}

export const spine = new PrimordiaSpine();
