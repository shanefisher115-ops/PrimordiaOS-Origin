// =============================================================
// PrimordiaOS World Drift Predictor
// Predicts future violations, drift patterns, instability zones
// =============================================================

import { getWorldHistory, getViolationHistory, getDriftHistory } 
    from "./Primordia_WorldRulesMemoryEngine.mjs";

// -------------------------------------------------------------
// SIMPLE STATISTICAL UTILITIES
// -------------------------------------------------------------

function frequencyMap(items, key) {
    const map = {};
    for (const item of items) {
        const k = item[key];
        map[k] = (map[k] || 0) + 1;
    }
    return map;
}

function topEntries(map, limit = 5) {
    return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key, count]) => ({ key, count }));
}

// -------------------------------------------------------------
// MAIN PREDICTION ENGINE
// -------------------------------------------------------------

export function predictWorldDrift() {
    const worldHistory = getWorldHistory();
    const violationHistory = getViolationHistory();
    const driftHistory = getDriftHistory();

    // ---------------------------------------------------------
    // 1. Predict actors likely to violate rules
    // ---------------------------------------------------------

    const actorViolations = [];

    for (const entry of violationHistory) {
        for (const v of entry.violations) {
            actorViolations.push(v.actor);
        }
    }

    const actorRiskMap = frequencyMap(actorViolations, null);
    const highRiskActors = topEntries(actorRiskMap);

    // ---------------------------------------------------------
    // 2. Predict rules likely to break
    // ---------------------------------------------------------

    const ruleViolations = [];

    for (const entry of violationHistory) {
        for (const v of entry.violations) {
            ruleViolations.push(v.rule);
        }
    }

    const ruleRiskMap = frequencyMap(ruleViolations, null);
    const highRiskRules = topEntries(ruleRiskMap);

    // ---------------------------------------------------------
    // 3. Predict unstable world regions (based on drift)
    // ---------------------------------------------------------

    const regionDrift = {};

    for (const drift of driftHistory) {
        const fromHash = drift.from;
        const toHash = drift.to;

        const regionKey = fromHash.substring(0, 4) + "→" + toHash.substring(0, 4);
        regionDrift[regionKey] = (regionDrift[regionKey] || 0) + 1;
    }

    const unstableRegions = topEntries(regionDrift);

    // ---------------------------------------------------------
    // 4. Predict world instability score
    // ---------------------------------------------------------

    const totalViolations = violationHistory.length;
    const totalDriftEvents = driftHistory.length;

    const instabilityScore = Math.min(
        100,
        Math.floor((totalViolations * 2 + totalDriftEvents * 1.5))
    );

    // ---------------------------------------------------------
    // 5. Predict future drift direction
    // ---------------------------------------------------------

    const driftDirection = driftHistory.slice(-5).map(d => ({
        from: d.from.substring(0, 6),
        to: d.to.substring(0, 6)
    }));

    // ---------------------------------------------------------
    // FINAL PREDICTION PACKET
    // ---------------------------------------------------------

    return {
        instability_score: instabilityScore,
        high_risk_actors: highRiskActors,
        high_risk_rules: highRiskRules,
        unstable_regions: unstableRegions,
        drift_direction: driftDirection,
        summary: `
World instability score: ${instabilityScore}/100

High-risk actors:
${highRiskActors.map(a => ` - ${a.key} (${a.count} violations)`).join("\n")}

High-risk rules:
${highRiskRules.map(r => ` - ${r.key} (${r.count} violations)`).join("\n")}

Unstable regions:
${unstableRegions.map(u => ` - ${u.key} (${u.count} drift events)`).join("\n")}

Drift direction (recent):
${driftDirection.map(d => ` - ${d.from} → ${d.to}`).join("\n")}
        `.trim()
    };
}
