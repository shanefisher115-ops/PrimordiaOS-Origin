import { PipelineLogger } from '../logging/PipelineLogger.js';
export class PipelineShutdown {
    logger;
    constructor(logger) {
        this.logger = logger ?? PipelineLogger.getInstance();
    }
    /**
     * Executes the full pipeline shutdown sequence.
     */
    async shutdown(activeRuns, memory, safety, router, timeoutMs = 10000) {
        const start = Date.now();
        this.logger.info('PipelineShutdown', 'Initiating Antigravity Pipeline Engine shutdown sequence...');
        // 1. Drain active executions with timeout
        const drained = activeRuns.size;
        if (activeRuns.size > 0) {
            this.logger.info('PipelineShutdown', `Waiting for ${activeRuns.size} in-flight pipeline executions to finish (timeout: ${timeoutMs}ms)...`);
            const deadline = Date.now() + timeoutMs;
            while (activeRuns.size > 0 && Date.now() < deadline) {
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
            if (activeRuns.size > 0) {
                this.logger.warn('PipelineShutdown', `Shutdown deadline exceeded. Force-terminating ${activeRuns.size} remaining runs.`);
            }
        }
        // 2. Snapshot memory
        const quarantinedMap = {};
        for (const q of safety.getAllQuarantined()) {
            quarantinedMap[q.entityId] = q;
        }
        const snapshot = memory.createSnapshot(quarantinedMap);
        this.logger.info('PipelineShutdown', `Created final memory snapshot '${snapshot.snapshotId}' (v${snapshot.version})`);
        // 3. Notify Kernel
        try {
            await router.getKernelAdapter().emitEvent({
                eventType: 'PIPELINE_ENGINE_SHUTDOWN',
                source: 'AntigravityPipelineEngine',
                timestamp: Date.now(),
                data: {
                    snapshotId: snapshot.snapshotId,
                    version: snapshot.version,
                },
            });
        }
        catch {
            // Non-fatal during shutdown
        }
        const durationMs = Date.now() - start;
        this.logger.info('PipelineShutdown', `Antigravity Pipeline Engine shutdown complete in ${durationMs}ms`);
        return {
            success: true,
            drainedExecutions: drained,
            durationMs,
            snapshotId: snapshot.snapshotId,
        };
    }
}
