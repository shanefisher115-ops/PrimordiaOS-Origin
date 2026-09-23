// horizon/projectionEngine.ts
export class ProjectionEngine {
    config;
    constructor(config) {
        this.config = config;
    }
    project(current, temporalInsights) {
        const now = Date.now();
        const projections = [];
        for (const insight of temporalInsights) {
            const horizon = this.estimateHorizon(insight);
            const projectedTimestamp = now + horizon;
            const projectedScore = current.globalHealthScore *
                this.computeAdjustmentFactor(insight);
            projections.push({
                id: `projection-${insight.id}-${projectedTimestamp}`,
                timestamp: projectedTimestamp,
                projectedGlobalHealthScore: projectedScore,
                sourceInsightId: insight.id,
                message: `Projected global health score adjusted based on temporal insight ${insight.id}.`,
            });
        }
        return projections;
    }
    estimateHorizon(insight) {
        const base = this.config.maxProjectionHorizonMs / 2;
        if (insight.type === "trend") {
            return base * this.config.sensitivity;
        }
        if (insight.type === "anomaly") {
            return base * 0.5 * this.config.sensitivity;
        }
        return base;
    }
    computeAdjustmentFactor(insight) {
        if (insight.type === "trend") {
            return insight.direction === "up" ? 1.05 : 0.95;
        }
        if (insight.type === "anomaly") {
            return insight.direction === "up" ? 1.02 : 0.9;
        }
        return 1.0;
    }
}
