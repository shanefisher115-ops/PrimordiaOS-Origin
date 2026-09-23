import {
  EngineEnvironmentConfig,
  EngineLifecycleState,
  PipelineDefinition,
  PipelineExecutionOptions,
  PipelineExecutionResult,
} from './types.js';
import { PipelineLogger } from '../logging/PipelineLogger.js';
import { PipelineRegistry } from '../registry/PipelineRegistry.js';
import { PipelineOrchestrator } from '../orchestrator/PipelineOrchestrator.js';
import { MultiAgentRouter } from '../router/MultiAgentRouter.js';
import { PipelineMemoryEngine } from '../memory/PipelineMemoryEngine.js';
import { PipelineSafetyLayer } from '../safety/PipelineSafetyLayer.js';
import { PipelineBoot, BootResult } from './PipelineBoot.js';
import { PipelineShutdown, ShutdownResult } from './PipelineShutdown.js';

export class AntigravityPipelineEngine {
  private static instance: AntigravityPipelineEngine | null = null;
  private state: EngineLifecycleState = 'UNINITIALIZED';
  private config: EngineEnvironmentConfig;
  private activeRuns: Set<string> = new Set();

  private logger: PipelineLogger;
  private registry: PipelineRegistry;
  private memory: PipelineMemoryEngine;
  private safety: PipelineSafetyLayer;
  private router: MultiAgentRouter;
  private orchestrator: PipelineOrchestrator;
  private bootloader: PipelineBoot;
  private shutdownCoordinator: PipelineShutdown;

  constructor(customConfig?: Partial<EngineEnvironmentConfig>) {
    this.logger = PipelineLogger.getInstance();
    this.bootloader = new PipelineBoot(this.logger);
    this.shutdownCoordinator = new PipelineShutdown(this.logger);

    const baseConfig = this.bootloader.resolveConfig();
    this.config = { ...baseConfig, ...customConfig };

    this.registry = PipelineRegistry.getInstance();
    this.memory = PipelineMemoryEngine.getInstance();
    this.safety = new PipelineSafetyLayer(undefined, this.logger);
    this.router = new MultiAgentRouter({ logger: this.logger });
    this.orchestrator = new PipelineOrchestrator({
      router: this.router,
      safetyLayer: this.safety,
      memoryEngine: this.memory,
      logger: this.logger,
      maxConcurrency: this.config.maxConcurrentNodes,
    });
  }

  public static getInstance(): AntigravityPipelineEngine {
    if (!AntigravityPipelineEngine.instance) {
      AntigravityPipelineEngine.instance = new AntigravityPipelineEngine();
    }
    return AntigravityPipelineEngine.instance;
  }

  public getState(): EngineLifecycleState {
    return this.state;
  }

  public getConfig(): EngineEnvironmentConfig {
    return { ...this.config };
  }

  public getRegistry(): PipelineRegistry {
    return this.registry;
  }

  public getOrchestrator(): PipelineOrchestrator {
    return this.orchestrator;
  }

  public getRouter(): MultiAgentRouter {
    return this.router;
  }

  public getMemory(): PipelineMemoryEngine {
    return this.memory;
  }

  public getSafety(): PipelineSafetyLayer {
    return this.safety;
  }

  public getLogger(): PipelineLogger {
    return this.logger;
  }

  public getActiveRunCount(): number {
    return this.activeRuns.size;
  }

  /**
   * Boots the engine, verifies all distributed adapters, loads registries and memory.
   */
  public async boot(): Promise<BootResult> {
    if (this.state === 'RUNNING') {
      this.logger.warn('AntigravityPipelineEngine', 'Engine is already running.');
      return {
        success: true,
        config: this.config,
        adapterStatus: {
          antigravity: { reachable: true, latencyMs: 0 },
          vertexAi: { reachable: true, latencyMs: 0 },
          kernel: { reachable: true, latencyMs: 0 },
        },
        pipelinesLoaded: this.registry.listPipelines().length,
        durationMs: 0,
      };
    }

    this.state = 'BOOTING';
    try {
      const bootResult = await this.bootloader.boot(
        this.registry,
        this.memory,
        this.safety,
        this.router
      );
      this.config = bootResult.config;
      this.state = 'RUNNING';
      return bootResult;
    } catch (err) {
      this.state = 'FAILED';
      this.logger.fatal('AntigravityPipelineEngine', 'Engine boot failed', err);
      throw err;
    }
  }

  /**
   * Pauses the engine, rejecting new pipeline runs while letting in-flight runs proceed.
   */
  public pause(): void {
    if (this.state !== 'RUNNING') {
      throw new Error(`Cannot pause engine in state '${this.state}'`);
    }
    this.state = 'PAUSED';
    this.logger.info('AntigravityPipelineEngine', 'Engine state set to PAUSED');
  }

  /**
   * Resumes engine execution.
   */
  public resume(): void {
    if (this.state !== 'PAUSED') {
      throw new Error(`Cannot resume engine from state '${this.state}'`);
    }
    this.state = 'RUNNING';
    this.logger.info('AntigravityPipelineEngine', 'Engine state resumed to RUNNING');
  }

  /**
   * Executes a pipeline by ID or direct definition.
   */
  public async runPipeline(
    pipelineIdOrDef: string | PipelineDefinition,
    options: PipelineExecutionOptions = {}
  ): Promise<PipelineExecutionResult> {
    if (this.state !== 'RUNNING') {
      throw new Error(`Cannot run pipeline: AntigravityPipelineEngine is in state '${this.state}'`);
    }

    let pipeline: PipelineDefinition | undefined;
    if (typeof pipelineIdOrDef === 'string') {
      pipeline = this.registry.getPipeline(pipelineIdOrDef);
      if (!pipeline) {
        throw new Error(`Pipeline '${pipelineIdOrDef}' not found in registry`);
      }
    } else {
      pipeline = pipelineIdOrDef;
    }

    const runId = options.runId ?? `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.activeRuns.add(runId);

    try {
      const result = await this.orchestrator.executePipeline(pipeline, {
        ...options,
        runId,
      });
      return result;
    } finally {
      this.activeRuns.delete(runId);
    }
  }

  /**
   * Shuts down the engine gracefully.
   */
  public async shutdown(timeoutMs = 10000): Promise<ShutdownResult> {
    if (this.state === 'TERMINATED' || this.state === 'SHUTTING_DOWN') {
      return { success: true, drainedExecutions: 0, durationMs: 0 };
    }

    this.state = 'SHUTTING_DOWN';
    try {
      const result = await this.shutdownCoordinator.shutdown(
        this.activeRuns,
        this.memory,
        this.safety,
        this.router,
        timeoutMs
      );
      this.state = 'TERMINATED';
      return result;
    } catch (err) {
      this.state = 'FAILED';
      this.logger.error('AntigravityPipelineEngine', 'Error during shutdown', err);
      throw err;
    }
  }
}
