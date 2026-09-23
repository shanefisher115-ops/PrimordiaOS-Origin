// continuity/systemAgingMonitor.ts
export class SystemAgingMonitor {
    config;
    lastSnapshot = null;
    constructor(config) {
        this.config = config;
    }
    computeSnapshot(driftScore, stalenessScore, globalHealthScore) {
        const snapshot = {
            timestamp: Date.now(),
            driftScore,
            stalenessScore,
            globalHealthScore,
        };
        this.lastSnapshot = snapshot;
        return snapshot;
    }
    analyze(snapshot) {
        const insights = [];
        if (snapshot.driftScore > this.config.maxAllowedDrift) {
            insights.push({
                id: `aging-drift-${snapshot.timestamp}`,
                type: "drift",
                severity: "warning",
                message: "System drift exceeds safe threshold.",
                timestamp: snapshot.timestamp,
            });
        }
        if (snapshot.stalenessScore > this.config.maxAllowedStalenessMs) {
            insights.push({
                id: `aging-staleness-${snapshot.timestamp}`,
                type: "staleness",
                severity: "critical",
                message: "System staleness detected; memory refresh required.",
                timestamp: snapshot.timestamp,
            });
        }
        const decayedHealth = snapshot.globalHealthScore * (1 - this.config.healthDecayRate);
        if (decayedHealth < snapshot.globalHealthScore * 0.9) {
            insights.push({
                id: `aging-health-decay-${snapshot.timestamp}`,
                type: "health-decay",
                severity: "info",
                message: "Global health score shows signs of decay.",
                timestamp: snapshot.timestamp,
            });
        }
        return insights;
    }
}
