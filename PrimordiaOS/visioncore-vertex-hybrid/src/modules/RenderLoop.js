/**
 * RenderLoop - Execution of Creative Directives & Multimodal Render Pipeline
 * Agent Role: RenderLoop Specialist
 * PrimordiaOS VisionCore x Vertex AI Substrate
 */
import { HybridLogger } from '../logging/HybridLogger.js';
export class RenderLoop {
    logger;
    router;
    memory;
    activeTraces = new Map();
    constructor(router, memory) {
        this.logger = new HybridLogger('RenderLoop');
        this.router = router;
        this.memory = memory;
    }
    /**
     * Executes a sequential batch of creative directives with forensic tracing
     */
    async executeDirectives(directives, traceId) {
        const executionId = `render-exec-${Date.now().toString(36)}`;
        const effectiveTraceId = traceId || `trace-${executionId}`;
        const startTime = Date.now();
        const traces = [];
        const outputs = [];
        this.logger.info(`Starting RenderLoop execution [${executionId}] with ${directives.length} directives`, undefined, effectiveTraceId);
        // Sort by priority descending
        const sortedDirectives = [...directives].sort((a, b) => b.priority - a.priority);
        let successCount = 0;
        let failCount = 0;
        for (let i = 0; i < sortedDirectives.length; i++) {
            const dir = sortedDirectives[i];
            const stepStartTime = Date.now();
            const traceStep = {
                stepIndex: i + 1,
                directiveId: dir.id,
                action: dir.action,
                status: 'EXECUTING',
                startedAt: new Date(stepStartTime).toISOString()
            };
            traces.push(traceStep);
            try {
                let normalizedResponse;
                if (dir.action === 'RENDER_STILL') {
                    normalizedResponse = await this.router.route({
                        taskType: 'IMAGE_GENERATION',
                        prompt: dir.prompt,
                        parameters: { aspectRatio: '16:9' },
                        traceId: effectiveTraceId
                    });
                }
                else if (dir.action === 'RENDER_SEQUENCE') {
                    normalizedResponse = await this.router.route({
                        taskType: 'VIDEO_GENERATION',
                        prompt: dir.prompt,
                        parameters: { aspectRatio: '21:9' },
                        traceId: effectiveTraceId
                    });
                }
                else {
                    normalizedResponse = await this.router.route({
                        taskType: 'TEXT_GENERATION',
                        prompt: dir.prompt,
                        traceId: effectiveTraceId
                    });
                }
                const stepDuration = Date.now() - stepStartTime;
                traceStep.status = 'COMPLETED';
                traceStep.completedAt = new Date().toISOString();
                traceStep.durationMs = stepDuration;
                traceStep.outputPreview = normalizedResponse.content.substring(0, 150);
                outputs.push({
                    directiveId: dir.id,
                    response: normalizedResponse
                });
                successCount++;
            }
            catch (err) {
                const stepDuration = Date.now() - stepStartTime;
                traceStep.status = 'FAILED';
                traceStep.completedAt = new Date().toISOString();
                traceStep.durationMs = stepDuration;
                traceStep.error = err instanceof Error ? err.message : String(err);
                failCount++;
                this.logger.error(`RenderLoop directive failed [${dir.id}]`, err, undefined, effectiveTraceId);
            }
        }
        const totalDuration = Date.now() - startTime;
        this.activeTraces.set(executionId, traces);
        // Save render execution telemetry to CoreForge memory
        this.memory.saveGeneric(`render-trace-${executionId}`, {
            executionId,
            directivesCount: directives.length,
            successCount,
            failCount,
            durationMs: totalDuration
        }, ['telemetry', 'render-loop']);
        this.logger.info(`RenderLoop execution completed in ${totalDuration}ms. (Success: ${successCount}, Fail: ${failCount})`, undefined, effectiveTraceId);
        return {
            executionId,
            totalDirectives: directives.length,
            successfulDirectives: successCount,
            failedDirectives: failCount,
            totalDurationMs: totalDuration,
            traces,
            outputs
        };
    }
    getTraceHistory(executionId) {
        return this.activeTraces.get(executionId);
    }
}
