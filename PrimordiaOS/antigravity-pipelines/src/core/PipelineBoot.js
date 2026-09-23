import { PipelineLogger } from '../logging/PipelineLogger.js';
export class PipelineBoot {
    logger;
    constructor(logger) {
        this.logger = logger ?? PipelineLogger.getInstance();
    }
    resolveConfig() {
        const port = parseInt(process.env['PORT'] || '8080', 10);
        const env = process.env['NODE_ENV'] || 'production';
        return {
            antigravityGatewayUrl: process.env['ANTIGRAVITY_GATEWAY_URL'] || 'http://localhost:5055/api/gateway',
            vertexAiUrl: process.env['VERTEX_AI_URL'] || 'https://generativelanguage.googleapis.com/v1beta',
            primordiaOsKernelUrl: process.env['PRIMORDIAOS_KERNEL_URL'] || 'http://localhost:3000',
            port: isNaN(port) ? 8080 : port,
            environment: env,
            maxConcurrentNodes: parseInt(process.env['MAX_CONCURRENT_NODES'] || '8', 10),
            defaultNodeTimeoutMs: parseInt(process.env['DEFAULT_NODE_TIMEOUT_MS'] || '30000', 10),
            maxExecutionHops: parseInt(process.env['MAX_EXECUTION_HOPS'] || '100', 10),
        };
    }
    /**
     * Executes the full pipeline boot sequence.
     */
    async boot(registry, memory, safety, router) {
        const start = Date.now();
        this.logger.bootLog('START', 'Initiating Antigravity Pipeline Engine boot sequence...');
        const config = this.resolveConfig();
        this.logger.bootLog('CONFIG', 'Environment configuration resolved', {
            gateway: config.antigravityGatewayUrl,
            vertex: config.vertexAiUrl,
            kernel: config.primordiaOsKernelUrl,
            port: config.port,
            env: config.environment,
        });
        // 1. Check Adapters
        this.logger.bootLog('ADAPTERS', 'Probing distributed adapters...');
        const [antigravityPing, vertexPing, kernelPing] = await Promise.all([
            router.getAntigravityAdapter().ping(),
            router.getVertexAiAdapter().ping(),
            router.getKernelAdapter().ping(),
        ]);
        this.logger.bootLog('ADAPTERS_STATUS', 'Adapter connectivity evaluated', {
            antigravity: antigravityPing,
            vertexAi: vertexPing,
            kernel: kernelPing,
        });
        // 2. Initialize Memory Engine
        this.logger.bootLog('MEMORY', `Memory engine initialized at version ${memory.getVersion()}`);
        // 3. Audit Registered Pipelines
        const pipelines = registry.listPipelines();
        this.logger.bootLog('REGISTRY', `Loaded ${pipelines.length} pipelines into registry`);
        for (const pipeline of pipelines) {
            const violations = safety.validatePipelineSafety(pipeline);
            if (violations.length > 0) {
                this.logger.warn('PipelineBoot', `Pipeline '${pipeline.id}' has safety warnings: ${violations.map((v) => v.reason).join(', ')}`);
            }
        }
        const durationMs = Date.now() - start;
        this.logger.bootLog('COMPLETE', `Antigravity Pipeline Engine booted successfully in ${durationMs}ms`);
        return {
            success: true,
            config,
            adapterStatus: {
                antigravity: { reachable: antigravityPing.ok, latencyMs: antigravityPing.latencyMs, error: antigravityPing.error },
                vertexAi: { reachable: vertexPing.ok, latencyMs: vertexPing.latencyMs, error: vertexPing.error },
                kernel: { reachable: kernelPing.ok, latencyMs: kernelPing.latencyMs, error: kernelPing.error },
            },
            pipelinesLoaded: pipelines.length,
            durationMs,
        };
    }
}
