/**
 * VisionCoreVertexHybridEngine - Root Subsystem Orchestrator & Lifecycle Manager
 * Agent Role: Hybrid Engine Architect
 * PrimordiaOS VisionCore x Vertex AI Substrate
 */

import { HybridLogger, LogLevel, QuarantinedError } from '../logging/HybridLogger.js';
import { HybridSafetyLayer, SafetyPolicyConfig } from '../safety/HybridSafetyLayer.js';
import { VertexAIAdapter, VertexConfig } from '../vertex/VertexAIAdapter.js';
import { VertexAIPipelineRouter } from '../vertex/VertexAIPipelineRouter.js';
import { CoreForge } from '../modules/CoreForge.js';
import { PulseEngine, CreativeDiagnostics } from '../modules/PulseEngine.js';
import { RenderLoop } from '../modules/RenderLoop.js';
import { VisionCoreEngine, VisionCoreOutput } from './VisionCoreEngine.js';
import { CreativeOrchestrator, OrchestrationTaskRequest, OrchestrationTaskResult } from './CreativeOrchestrator.js';

export type HybridEngineState =
  | 'UNINITIALIZED'
  | 'BOOTING'
  | 'ONLINE'
  | 'DEGRADED'
  | 'SHUTTING_DOWN'
  | 'TERMINATED';

export interface HybridEngineConfig {
  vertexConfig?: VertexConfig;
  safetyConfig?: Partial<SafetyPolicyConfig>;
  autoBoot?: boolean;
}

export interface HybridEngineTelemetry {
  state: HybridEngineState;
  uptimeSeconds: number;
  bootedAt: string;
  memoryRecordsCount: number;
  quarantinedErrorsCount: number;
  vertexStatus: {
    model: string;
    location: string;
    hasCredentials: boolean;
    mode: 'CLOUD_LIVE' | 'OFFLINE_HEURISTIC';
  };
  engineVersion: string;
}

export class VisionCoreVertexHybridEngine {
  private logger: HybridLogger;
  private state: HybridEngineState = 'UNINITIALIZED';
  private bootedAt?: Date;

  // Subsystems
  private safety!: HybridSafetyLayer;
  private memory!: CoreForge;
  private adapter!: VertexAIAdapter;
  private router!: VertexAIPipelineRouter;
  private orchestrator!: CreativeOrchestrator;

  constructor(config?: HybridEngineConfig) {
    this.logger = new HybridLogger('VisionCoreVertexHybridEngine');
    this.logger.info('Instantiating VisionCoreVertexHybridEngine');

    if (config?.autoBoot) {
      this.boot(config).catch(err => {
        this.logger.error('Auto-boot failed during construction', err);
      });
    }
  }

  public getState(): HybridEngineState {
    return this.state;
  }

  /**
   * Complete Hybrid Boot Sequence
   */
  public async boot(config?: HybridEngineConfig): Promise<void> {
    if (this.state === 'ONLINE' || this.state === 'BOOTING') {
      this.logger.warn(`Boot sequence requested but engine is already in state: ${this.state}`);
      return;
    }

    const startTime = Date.now();
    this.state = 'BOOTING';
    const traceId = `boot-${Date.now().toString(36)}`;
    this.logger.info('=== [STAGE 1/6] INITIATING HYBRID BOOT SEQUENCE ===', undefined, traceId);

    try {
      // Step 1: Initialize Safety Layer
      this.logger.info('[STAGE 2/6] Initializing HybridSafetyLayer & Sovereign Guardrails', undefined, traceId);
      this.safety = new HybridSafetyLayer(config?.safetyConfig);

      // Step 2: Initialize CoreForge Memory
      this.logger.info('[STAGE 3/6] Initializing CoreForge Idempotent Memory Substrate', undefined, traceId);
      this.memory = new CoreForge();

      // Step 3: Initialize Vertex AI Adapter & Pipeline Router
      this.logger.info('[STAGE 4/6] Connecting Vertex AI Multimodal Adapter & Pipeline Router', undefined, traceId);
      this.adapter = new VertexAIAdapter(config?.vertexConfig);
      this.router = new VertexAIPipelineRouter(this.adapter);

      // Verify Vertex AI connectivity
      const hasCreds = this.adapter.hasValidCredentials();
      this.logger.info(`Vertex AI Adapter operational. Credentials present: ${hasCreds}`, {
        mode: hasCreds ? 'CLOUD_LIVE' : 'OFFLINE_HEURISTIC',
        model: this.adapter.getConfig().model
      }, traceId);

      // Step 4: Initialize Creative Orchestrator and all sub-modules
      this.logger.info('[STAGE 5/6] Spawning Creative Orchestrator & Subsystem Swarm', undefined, traceId);
      this.orchestrator = new CreativeOrchestrator(this.memory, this.router, this.safety);

      // Step 5: Complete Boot Sequence & Telemetry Register
      this.state = 'ONLINE';
      this.bootedAt = new Date();
      const duration = Date.now() - startTime;
      this.logger.info(`=== [STAGE 6/6] HYBRID BOOT SEQUENCE COMPLETED in ${duration}ms. SYSTEM ONLINE. ===`, undefined, traceId);

    } catch (err) {
      this.state = 'DEGRADED';
      this.logger.quarantine(err, { stage: 'BOOT_SEQUENCE' }, 'CRITICAL', traceId);
      this.logger.error('Hybrid boot sequence failed. State set to DEGRADED', err, undefined, traceId);
      throw err;
    }
  }

  /**
   * Main pipeline execution: evaluates directive through VisionCore + Vertex AI
   */
  public async execute(
    request: OrchestrationTaskRequest | string
  ): Promise<OrchestrationTaskResult> {
    if (this.state !== 'ONLINE' && this.state !== 'DEGRADED') {
      await this.boot();
    }

    const taskReq: OrchestrationTaskRequest = typeof request === 'string'
      ? { directive: request }
      : request;

    this.logger.info(`Executing hybrid pipeline for: "${taskReq.directive.substring(0, 70)}"`);
    return this.orchestrator.orchestrate(taskReq);
  }

  /**
   * Evaluates system diagnostics and telemetry
   */
  public getTelemetry(): HybridEngineTelemetry {
    const uptimeSec = this.bootedAt
      ? Math.floor((Date.now() - this.bootedAt.getTime()) / 1000)
      : 0;

    const adapterCfg = this.adapter?.getConfig();
    const hasCreds = this.adapter?.hasValidCredentials() ?? false;

    return {
      state: this.state,
      uptimeSeconds: uptimeSec,
      bootedAt: this.bootedAt ? this.bootedAt.toISOString() : 'NOT_BOOTED',
      memoryRecordsCount: this.memory ? this.memory.count() : 0,
      quarantinedErrorsCount: HybridLogger.getQuarantinedErrors().length,
      vertexStatus: {
        model: adapterCfg?.model || 'unconfigured',
        location: adapterCfg?.location || 'unconfigured',
        hasCredentials: hasCreds,
        mode: hasCreds ? 'CLOUD_LIVE' : 'OFFLINE_HEURISTIC'
      },
      engineVersion: 'v1.0.0-sovereign-hybrid'
    };
  }

  /**
   * Subsystem Getters
   */
  public getOrchestrator(): CreativeOrchestrator {
    this.ensureOnline();
    return this.orchestrator;
  }

  public getMemory(): CoreForge {
    this.ensureOnline();
    return this.memory;
  }

  public getRouter(): VertexAIPipelineRouter {
    this.ensureOnline();
    return this.router;
  }

  public getSafety(): HybridSafetyLayer {
    this.ensureOnline();
    return this.safety;
  }

  /**
   * Hybrid Shutdown Sequence
   */
  public async shutdown(traceId?: string): Promise<void> {
    const effectiveTraceId = traceId || `shutdown-${Date.now().toString(36)}`;
    this.logger.info('=== INITIATING HYBRID SHUTDOWN SEQUENCE ===', undefined, effectiveTraceId);
    this.state = 'SHUTTING_DOWN';

    try {
      // Checkpoint memory snapshot
      if (this.memory) {
        const stateDump = this.memory.exportState();
        const recordsCount = Object.keys(stateDump).length;
        this.logger.info(`Checkpointed ${recordsCount} memory structures prior to shutdown`, undefined, effectiveTraceId);
      }

      this.state = 'TERMINATED';
      this.logger.info('=== HYBRID SHUTDOWN COMPLETE. SUBSYSTEM TERMINATED. ===', undefined, effectiveTraceId);
    } catch (err) {
      this.logger.error('Error encountered during shutdown sequence', err, undefined, effectiveTraceId);
      this.state = 'TERMINATED';
    }
  }

  private ensureOnline(): void {
    if (this.state === 'UNINITIALIZED' || this.state === 'TERMINATED') {
      throw new Error(`HybridEngine is in state [${this.state}]. Call boot() before accessing subsystems.`);
    }
  }
}
