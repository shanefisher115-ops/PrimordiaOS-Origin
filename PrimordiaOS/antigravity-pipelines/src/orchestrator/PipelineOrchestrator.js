import { ExecutionGraphEngine } from '../graph/ExecutionGraphEngine.js';
import { MultiAgentRouter } from '../router/MultiAgentRouter.js';
import { PipelineSafetyLayer } from '../safety/PipelineSafetyLayer.js';
import { PipelineMemoryEngine } from '../memory/PipelineMemoryEngine.js';
import { PipelineLogger } from '../logging/PipelineLogger.js';
export class PipelineOrchestrator {
    router;
    safetyLayer;
    memoryEngine;
    logger;
    maxConcurrency;
    constructor(deps) {
        this.logger = deps?.logger ?? PipelineLogger.getInstance();
        this.router = deps?.router ?? new MultiAgentRouter({ logger: this.logger });
        this.safetyLayer = deps?.safetyLayer ?? new PipelineSafetyLayer(undefined, this.logger);
        this.memoryEngine = deps?.memoryEngine ?? PipelineMemoryEngine.getInstance();
        this.maxConcurrency = deps?.maxConcurrency ?? 8;
    }
    /**
     * Executes a pipeline definition from start to finish via DAG wavefront level orchestration.
     */
    async executePipeline(pipeline, options = {}) {
        const runId = options.runId ?? `run-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const traceId = options.traceId ?? `trace-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const startedAt = Date.now();
        this.logger.executionLog(pipeline.id, runId, 'STARTING', {
            pipelineName: pipeline.name,
            traceId,
            initialInput: options.initialInput,
        });
        // 1. Idempotency verification
        if (options.idempotencyKey) {
            const cached = this.memoryEngine.checkIdempotency(options.idempotencyKey);
            if (cached) {
                this.logger.info('PipelineOrchestrator', `Idempotency key '${options.idempotencyKey}' matched previous run '${cached.runId}'. Returning cached result.`);
                return cached;
            }
        }
        // 2. Pre-execution safety audit
        const safetyViolations = this.safetyLayer.validatePipelineSafety(pipeline);
        const fatalViolations = safetyViolations.filter((v) => v.severity === 'FATAL');
        if (fatalViolations.length > 0) {
            const errorMsg = `Safety validation failed: ${fatalViolations.map((v) => v.reason).join(' | ')}`;
            this.logger.error('PipelineOrchestrator', errorMsg, undefined, { pipelineId: pipeline.id, runId, traceId });
            const failureResult = {
                runId,
                pipelineId: pipeline.id,
                pipelineName: pipeline.name,
                success: false,
                startedAt,
                completedAt: Date.now(),
                totalDurationMs: Date.now() - startedAt,
                traces: {},
                finalOutputs: {},
                error: errorMsg,
                quarantinedNodes: fatalViolations.map((v) => v.nodeId || pipeline.id),
            };
            this.memoryEngine.recordExecutionResult(failureResult);
            return failureResult;
        }
        // 3. Compile DAG & Detect topological anomalies
        const graph = new ExecutionGraphEngine(pipeline.nodes, pipeline.edges);
        const topologyViolations = this.safetyLayer.validateGraphTopology(graph, pipeline.id);
        const fatalTopology = topologyViolations.filter((v) => v.severity === 'FATAL');
        if (fatalTopology.length > 0) {
            const errorMsg = `Graph topology invalid: ${fatalTopology.map((v) => v.reason).join(' | ')}`;
            this.logger.error('PipelineOrchestrator', errorMsg, undefined, { pipelineId: pipeline.id, runId, traceId });
            const failureResult = {
                runId,
                pipelineId: pipeline.id,
                pipelineName: pipeline.name,
                success: false,
                startedAt,
                completedAt: Date.now(),
                totalDurationMs: Date.now() - startedAt,
                traces: {},
                finalOutputs: {},
                error: errorMsg,
                quarantinedNodes: fatalTopology.map((v) => v.nodeId || pipeline.id),
            };
            this.memoryEngine.recordExecutionResult(failureResult);
            return failureResult;
        }
        // 4. Compute Wavefront levels (Parallel Execution Tiers)
        const wavefronts = graph.computeExecutionWavefronts();
        const nodeOutputs = new Map();
        const initialInput = options.initialInput ? { ...options.initialInput } : {};
        let pipelineSuccess = true;
        let pipelineError;
        try {
            for (let levelIndex = 0; levelIndex < wavefronts.length; levelIndex++) {
                const currentTier = wavefronts[levelIndex];
                this.logger.debug('PipelineOrchestrator', `Executing Wavefront Level ${levelIndex} (${currentTier.length} nodes parallel)`);
                // Execute nodes in current tier with bounded concurrency
                await this.executeWavefrontTier(currentTier, graph, nodeOutputs, initialInput, pipeline.id, runId, traceId);
                // Inspect for failures in critical nodes
                for (const node of currentTier) {
                    if (node.getStatus() === 'FAILED' && node.critical) {
                        pipelineSuccess = false;
                        pipelineError = `Critical node '${node.name}' (${node.id}) failed: ${node.getError()}`;
                        break;
                    }
                }
                if (!pipelineSuccess) {
                    break;
                }
            }
        }
        catch (err) {
            pipelineSuccess = false;
            pipelineError = err instanceof Error ? err.message : String(err);
            this.logger.error('PipelineOrchestrator', `Unexpected orchestration fault: ${pipelineError}`, err, {
                pipelineId: pipeline.id,
                runId,
                traceId,
            });
        }
        finally {
            this.safetyLayer.clearRunHops(runId);
        }
        // 5. Aggregate traces & compile result
        const completedAt = Date.now();
        const traces = graph.recordTrace(runId);
        const finalOutputs = {};
        for (const [nodeId, output] of nodeOutputs.entries()) {
            finalOutputs[nodeId] = output;
        }
        const quarantinedList = this.safetyLayer
            .getAllQuarantined()
            .map((q) => q.entityId);
        const executionResult = {
            runId,
            pipelineId: pipeline.id,
            pipelineName: pipeline.name,
            success: pipelineSuccess,
            startedAt,
            completedAt,
            totalDurationMs: completedAt - startedAt,
            traces,
            finalOutputs,
            error: pipelineError,
            quarantinedNodes: quarantinedList,
        };
        // 6. Record to memory engine and signal router kernel
        this.memoryEngine.recordExecutionResult(executionResult);
        if (options.idempotencyKey && pipelineSuccess) {
            this.memoryEngine.recordIdempotency(options.idempotencyKey, executionResult);
        }
        // Forward event to PrimordiaOS Kernel
        this.router.getKernelAdapter().emitEvent({
            eventType: 'PIPELINE_EXECUTION_COMPLETED',
            source: 'AntigravityPipelineOrchestrator',
            pipelineId: pipeline.id,
            runId,
            timestamp: completedAt,
            data: {
                success: pipelineSuccess,
                totalDurationMs: executionResult.totalDurationMs,
                error: pipelineError,
            },
        }).catch(() => null);
        this.logger.executionLog(pipeline.id, runId, pipelineSuccess ? 'COMPLETED' : 'FAILED', { durationMs: executionResult.totalDurationMs, error: pipelineError });
        return executionResult;
    }
    /**
     * Executes a tier of independent nodes in parallel with bounded concurrency.
     */
    async executeWavefrontTier(tier, graph, nodeOutputs, initialInput, pipelineId, runId, traceId) {
        const queue = [...tier];
        const workers = [];
        const runWorker = async () => {
            while (queue.length > 0) {
                const node = queue.shift();
                if (!node)
                    break;
                await this.executeSingleNode(node, graph, nodeOutputs, initialInput, pipelineId, runId, traceId);
            }
        };
        const workerCount = Math.min(this.maxConcurrency, tier.length);
        for (let i = 0; i < workerCount; i++) {
            workers.push(runWorker());
        }
        await Promise.all(workers);
    }
    /**
     * Executes a single DAG node, evaluating edge conditions, inputs, retries, and safety hops.
     */
    async executeSingleNode(node, graph, nodeOutputs, initialInput, pipelineId, runId, traceId) {
        // Check if quarantined
        if (this.safetyLayer.isQuarantined(node.id)) {
            node.quarantine(this.safetyLayer.getQuarantineRecord(node.id)?.reason || 'Isolated');
            return;
        }
        // Register execution hop in safety monitor
        this.safetyLayer.registerHop(runId, node.id);
        // Resolve inputs from upstream parent edges
        const incomingEdges = graph.getIncomingEdges(node.id);
        let resolvedInput = { ...initialInput };
        let conditionFailed = false;
        for (const edge of incomingEdges) {
            const upstreamOutput = nodeOutputs.get(edge.fromNodeId) ?? {};
            const passes = edge.evaluateCondition(upstreamOutput);
            if (!passes) {
                conditionFailed = true;
                break;
            }
            const transformed = edge.transformPayload(upstreamOutput);
            resolvedInput = { ...resolvedInput, ...transformed };
        }
        if (conditionFailed) {
            this.logger.debug('PipelineOrchestrator', `Edge condition failed for node '${node.name}' (${node.id}). Skipping.`);
            node.skip('Upstream edge condition evaluation returned false');
            return;
        }
        node.start(resolvedInput);
        let succeeded = false;
        while (!succeeded && node.canRetry()) {
            try {
                const taskRequest = this.router.normalizeTaskRequest({
                    id: node.id,
                    name: node.name,
                    agentTarget: node.agentTarget,
                    action: node.action,
                    params: node.params,
                    timeoutMs: node.timeoutMs,
                    fallbackTarget: node.fallbackTarget,
                    critical: node.critical,
                }, pipelineId, runId, node.getInput(), traceId);
                const response = await this.router.routeTask(taskRequest, node.fallbackTarget);
                if (response.success) {
                    node.complete(response.output);
                    nodeOutputs.set(node.id, response.output);
                    succeeded = true;
                }
                else {
                    node.incrementRetries();
                    if (!node.canRetry()) {
                        node.fail(response.error ?? 'Execution unsuccessful');
                        this.safetyLayer.recordNodeFailure(node.id, response.error ?? 'Max retries exhausted');
                    }
                }
            }
            catch (err) {
                node.incrementRetries();
                const errorMessage = err instanceof Error ? err.message : String(err);
                if (!node.canRetry()) {
                    node.fail(errorMessage);
                    this.safetyLayer.recordNodeFailure(node.id, errorMessage);
                }
            }
        }
    }
}
