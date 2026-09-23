// omniscience/safetyConstraints.ts
export class SafetyConstraints {
    config;
    constraints = [];
    changeHistory = [];
    constructor(config) {
        this.config = config;
        this.registerDefaultConstraints();
    }
    validateChange(change) {
        this.pruneHistory();
        for (const constraint of this.constraints) {
            if (!constraint.validate(change)) {
                return false;
            }
        }
        this.changeHistory.push(change);
        return true;
    }
    registerDefaultConstraints() {
        this.constraints.push({
            id: "forbidden-realms",
            description: "Block changes targeting forbidden realms.",
            validate: (change) => {
                return !this.config.forbiddenRealms.includes(change.targetRealm);
            },
        });
        this.constraints.push({
            id: "change-frequency",
            description: "Limit total change frequency per minute.",
            validate: (change) => {
                const now = Date.now();
                const oneMinuteAgo = now - 60_000;
                const recentChanges = this.changeHistory.filter((c) => c.timestamp >= oneMinuteAgo);
                return (recentChanges.length < this.config.maxChangeFrequencyPerMinute);
            },
        });
        this.constraints.push({
            id: "pipeline-rewrite-frequency",
            description: "Limit pipeline rewrites per hour.",
            validate: (change) => {
                if (change.type !== "pipeline-rewrite")
                    return true;
                const now = Date.now();
                const oneHourAgo = now - 3_600_000;
                const recentPipelineRewrites = this.changeHistory.filter((c) => c.timestamp >= oneHourAgo && c.type === "pipeline-rewrite");
                return (recentPipelineRewrites.length <
                    this.config.maxPipelineRewritePerHour);
            },
        });
        this.constraints.push({
            id: "autonomy-increase-step",
            description: "Limit autonomy score increases per change.",
            validate: (change) => {
                if (change.type !== "autonomy-adjustment")
                    return true;
                const delta = change.payload?.delta ?? 0;
                return delta <= this.config.maxAutonomyIncreaseStep;
            },
        });
    }
    pruneHistory() {
        const cutoff = Date.now() - 3_600_000;
        this.changeHistory = this.changeHistory.filter((c) => c.timestamp >= cutoff);
    }
}
