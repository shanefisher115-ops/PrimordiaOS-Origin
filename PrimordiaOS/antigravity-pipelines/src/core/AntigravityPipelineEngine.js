import { PipelineLogger } from '../logging/PipelineLogger.js';
import { PipelineRegistry } from '../registry/PipelineRegistry.js';
import { PipelineOrchestrator } from '../orchestrator/PipelineOrchestrator.js';
import { MultiAgentRouter } from '../router/MultiAgentRouter.js';
import { PipelineMemoryEngine } from '../memory/PipelineMemoryEngine.js';
import { PipelineSafetyLayer } from '../safety/PipelineSafetyLayer.js';
import { PipelineBoot } from './PipelineBoot.js';
import { PipelineShutdown } from './PipelineShutdown.js';
export class AntigravityPipelineEngine {
    static instance = null;
    state = 'UNINITIALIZED';
    config;
    activeRuns = new Set();
    logger;
    registry;
    memory;
    safety;
    router;
    orchestrator;
    bootloader;
    shutdownCoordinator;
    constructor(customConfig) {
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
    static getInstance() {
        if (!AntigravityPipelineEngine.instance) {
            AntigravityPipelineEngine.instance = new AntigravityPipelineEngine();
        }
        return AntigravityPipelineEngine.instance;
    }
    getState() {
        return this.state;
    }
    getConfig() {
        return { ...this.config };
    }
    getRegistry() {
        return this.registry;
    }
    getOrchestrator() {
        return this.orchestrator;
    }
    getRouter() {
        return this.router;
    }
    getMemory() {
        return this.memory;
    }
    getSafety() {
        return this.safety;
    }
    getLogger() {
        return this.logger;
    }
    getActiveRunCount() {
        return this.activeRuns.size;
    }
    /**
     * Boots the engine, verifies all distributed adapters, loads registries and memory.
     */
    async boot() {
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
            const bootResult = await this.bootloader.boot(this.registry, this.memory, this.safety, this.router);
            this.config = bootResult.config;
            this.state = 'RUNNING';
            return bootResult;
        }
        catch (err) {
            this.state = 'FAILED';
            this.logger.fatal('AntigravityPipelineEngine', 'Engine boot failed', err);
            throw err;
        }
    }
    /**
     * Pauses the engine, rejecting new pipeline runs while letting in-flight runs proceed.
     */
    pause() {
        if (this.state !== 'RUNNING') {
            throw new Error(`Cannot pause engine in state '${this.state}'`);
        }
        this.state = 'PAUSED';
        this.logger.info('AntigravityPipelineEngine', 'Engine state set to PAUSED');
    }
    /**
     * Resumes engine execution.
     */
    resume() {
        if (this.state !== 'PAUSED') {
            throw new Error(`Cannot resume engine from state '${this.state}'`);
        }
        this.state = 'RUNNING';
        this.logger.info('AntigravityPipelineEngine', 'Engine state resumed to RUNNING');
    }
    /**
     * Executes a pipeline by ID or direct definition.
     */
    async runPipeline(pipelineIdOrDef, options = {}) {
        if (this.state !== 'RUNNING') {
            throw new Error(`Cannot run pipeline: AntigravityPipelineEngine is in state '${this.state}'`);
        }
        let pipeline;
        if (typeof pipelineIdOrDef === 'string') {
            pipeline = this.registry.getPipeline(pipelineIdOrDef);
            if (!pipeline) {
                throw new Error(`Pipeline '${pipelineIdOrDef}' not found in registry`);
            }
        }
        else {
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
        }
        finally {
            this.activeRuns.delete(runId);
        }
    }
    /**
     * Shuts down the engine gracefully.
     */
    async shutdown(timeoutMs = 10000) {
        if (this.state === 'TERMINATED' || this.state === 'SHUTTING_DOWN') {
            return { success: true, drainedExecutions: 0, durationMs: 0 };
        }
        this.state = 'SHUTTING_DOWN';
        try {
            const result = await this.shutdownCoordinator.shutdown(this.activeRuns, this.memory, this.safety, this.router, timeoutMs);
            this.state = 'TERMINATED';
            return result;
        }
        catch (err) {
            this.state = 'FAILED';
            this.logger.error('AntigravityPipelineEngine', 'Error during shutdown', err);
            throw err;
        }
    }
}
