// omniscience/realmFusionEngine.ts
export class RealmFusionEngine {
    config;
    constructor(config) {
        this.config = config;
    }
    fuseSignals(signals) {
        const now = Date.now();
        const windowStart = now - this.config.maxFusionWindowMs;
        const recentSignals = signals.filter((s) => s.timestamp >= windowStart);
        const byRealm = new Map();
        for (const signal of recentSignals) {
            if (!byRealm.has(signal.realm)) {
                byRealm.set(signal.realm, []);
            }
            byRealm.get(signal.realm).push(signal);
        }
        const fused = [];
        const realms = Array.from(byRealm.keys());
        for (let i = 0; i < realms.length; i++) {
            for (let j = i + 1; j < realms.length; j++) {
                const r1 = realms[i];
                const r2 = realms[j];
                const s1 = byRealm.get(r1);
                const s2 = byRealm.get(r2);
                const fusion = this.fuseRealmPair(r1, s1, r2, s2);
                if (fusion)
                    fused.push(fusion);
            }
        }
        return fused;
    }
    fuseRealmPair(r1, s1, r2, s2) {
        const strength1 = this.aggregateStrength(s1);
        const strength2 = this.aggregateStrength(s2);
        if (strength1 < this.config.minSignalStrengthForFusion &&
            strength2 < this.config.minSignalStrengthForFusion) {
            return null;
        }
        const correlationScore = this.estimateCorrelation(s1, s2);
        if (correlationScore <= 0)
            return null;
        return {
            id: `fusion-${r1}-${r2}-${Date.now()}`,
            realms: [r1, r2],
            correlationScore,
            message: `Fusion insight between realms ${r1} and ${r2} with correlation score ${correlationScore.toFixed(3)}.`,
            tags: ["fusion", "multi-realm", "correlation"],
            timestamp: Date.now(),
        };
    }
    aggregateStrength(signals) {
        if (signals.length === 0)
            return 0;
        return signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;
    }
    estimateCorrelation(s1, s2) {
        if (s1.length === 0 || s2.length === 0)
            return 0;
        const avg1 = this.aggregateStrength(s1);
        const avg2 = this.aggregateStrength(s2);
        const timeOverlapScore = this.computeTimeOverlapScore(s1, s2);
        const baseCorrelation = (avg1 + avg2) / 2;
        return baseCorrelation * timeOverlapScore;
    }
    computeTimeOverlapScore(s1, s2) {
        const times1 = s1.map((s) => s.timestamp);
        const times2 = s2.map((s) => s.timestamp);
        const min1 = Math.min(...times1);
        const max1 = Math.max(...times1);
        const min2 = Math.min(...times2);
        const max2 = Math.max(...times2);
        const overlapStart = Math.max(min1, min2);
        const overlapEnd = Math.min(max1, max2);
        if (overlapEnd <= overlapStart)
            return 0;
        const duration1 = max1 - min1 || 1;
        const duration2 = max2 - min2 || 1;
        const overlapDuration = overlapEnd - overlapStart;
        const ratio1 = overlapDuration / duration1;
        const ratio2 = overlapDuration / duration2;
        return (ratio1 + ratio2) / 2;
    }
}
