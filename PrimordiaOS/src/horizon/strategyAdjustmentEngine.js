// Strategy Adjustment Engine (SAE)
// Adjusts realm strategies based on evaluation + horizon projections.
export class StrategyAdjustmentEngine {
    adjust(current, evaluationScore) {
        // TODO: real logic: thresholds, trends, performance metrics.
        const changes = {};
        if (evaluationScore < 0.4) {
            changes["aggressiveness"] = "decrease";
        }
        else if (evaluationScore > 0.7) {
            changes["aggressiveness"] = "increase";
        }
        return {
            realm: current.realm,
            changes,
            reason: `Score=${evaluationScore}`,
        };
    }
}
