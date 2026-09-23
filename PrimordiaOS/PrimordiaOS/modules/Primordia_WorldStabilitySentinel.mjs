// =============================================================
// PrimordiaOS World Stability Sentinel
// Real-time alert system for instability spikes, drift, violations,
// rule mutations, and actor destabilization
// =============================================================

import { predictWorldDrift } from "./Primordia_WorldDriftPredictor.mjs";
import { getViolationHistory, getDriftHistory, getRuleEvolutionHistory }
    from "./Primordia_WorldRulesMemoryEngine.mjs";
import { computeSceneHash } from "./Primordia_WorldstateEngine.mjs";

// -------------------------------------------------------------
// SENTINEL CONFIG
// -------------------------------------------------------------

const sentinelConfig = {
    intervalMs: 5000, // check every 5 seconds
    instabilitySpike: 60,
    criticalInstability: 80,
    driftSpike: 5,
    violationSpike: 3,
    ruleMutationSpike: 2,
    hashVolatilityThreshold: 4,
    log: true
};

// -------------------------------------------------------------
// ALERT HANDLERS
// -------------------------------------------------------------

function alert(type, message) {
    console.log(`\n[PrimordiaOS Sentinel ALERT] (${type})`);
    console.log(message);
}

// -------------------------------------------------------------
// MAIN SENTINEL LOOP
// -------------------------------------------------------------

export function startWorldStabilitySentinel() {
    console.log("[PrimordiaOS] World Stability Sentinel activated.");

    let lastHash = null;
    let hashVolatility = 0;

    setInterval(async () => {
        try {
            if (sentinelConfig.log) {
                console.log("\n[PrimordiaOS] Sentinel scan...");
            }

            // -------------------------------------------------
            // 1. Predict drift & instability
            // -------------------------------------------------
            const prediction = predictWorldDrift();
            const instability = prediction.instability_score;

            if (instability > sentinelConfig.instabilitySpike) {
                alert("Instability Spike", `Instability score reached ${instability}`);
            }

            if (instability > sentinelConfig.criticalInstability) {
                alert("Critical Instability", `World instability is CRITICAL (${instability})`);
            }

            // -------------------------------------------------
            // 2. Drift velocity detection
            // -------------------------------------------------
            const driftHistory = getDriftHistory();
            const recentDrift = driftHistory.slice(-sentinelConfig.driftSpike);

            if (recentDrift.length >= sentinelConfig.driftSpike) {
                alert("Drift Acceleration", "Drift velocity has increased significantly.");
            }

            // -------------------------------------------------
            // 3. Violation frequency detection
            // -------------------------------------------------
            const violations = getViolationHistory();
            const recentViolations = violations.slice(-sentinelConfig.violationSpike);

            if (recentViolations.length >= sentinelConfig.violationSpike) {
                alert("Violation Spike", "Multiple rule violations detected in short succession.");
            }

            // -------------------------------------------------
            // 4. Rule mutation detection
            // -------------------------------------------------
            const ruleEvolution = getRuleEvolutionHistory();
            const recentRuleChanges = ruleEvolution.slice(-sentinelConfig.ruleMutationSpike);

            if (recentRuleChanges.length >= sentinelConfig.ruleMutationSpike) {
                alert("Rule Mutation Spike", "Rules are mutating rapidly.");
            }

            // -------------------------------------------------
            // 5. Hash volatility detection
            // -------------------------------------------------
            const newHash = await computeSceneHash();

            if (lastHash && lastHash !== newHash) {
                hashVolatility++;
            }

            if (hashVolatility >= sentinelConfig.hashVolatilityThreshold) {
                alert("Hash Volatility", "Worldstate hash is changing too frequently.");
                hashVolatility = 0; // reset
            }

            lastHash = newHash;

        } catch (err) {
            console.error("[PrimordiaOS Sentinel ERROR]", err);
        }
    }, sentinelConfig.intervalMs);
}
