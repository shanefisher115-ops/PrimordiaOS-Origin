// continuity/continuityCoordinator.ts
export class ContinuityCoordinator {
    agingMonitor;
    memoryCompressor;
    lifecycleManager;
    governor;
    constructor(agingMonitor, memoryCompressor, lifecycleManager, governor) {
        this.agingMonitor = agingMonitor;
        this.memoryCompressor = memoryCompressor;
        this.lifecycleManager = lifecycleManager;
        this.governor = governor;
    }
    runContinuityCycle(current, memoryNodes) {
        const snapshot = this.agingMonitor.computeSnapshot(current.driftScore, current.stalenessScore, current.globalHealthScore);
        const agingInsights = this.agingMonitor.analyze(snapshot);
        const compressedBlocks = this.memoryCompressor.compress(memoryNodes);
        const lifecycleEvents = this.lifecycleManager.evaluate();
        const directives = this.governor.generateDirectives(agingInsights, lifecycleEvents);
        return {
            timestamp: Date.now(),
            agingInsightCount: agingInsights.length,
            compressedBlockCount: compressedBlocks.length,
            lifecycleEventCount: lifecycleEvents.length,
            directiveCount: directives.length,
            message: "Continuity cycle completed successfully.",
        };
    }
}
