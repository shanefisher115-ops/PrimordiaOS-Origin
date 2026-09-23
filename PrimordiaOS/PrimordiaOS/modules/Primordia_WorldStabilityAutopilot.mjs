// =============================================================
// PrimordiaOS World Stability Autopilot
// Runs the Stability Governor automatically every N seconds
// =============================================================

import { runStabilityGovernor } from "./Primordia_WorldStabilityGovernor.mjs";
import { enforceWorldRules } from "./Primordia_WorldRulesEngine.mjs";
import { recordWorldstate, recordViolations, recordCorrections, recordDrift }
    from "./Primordia_WorldRulesMemoryEngine.mjs";
import { computeSceneHash } from "./Primordia_WorldstateEngine.mjs";

// -------------------------------------------------------------
// AUTOPILOT CONFIG
// -------------------------------------------------------------

const autopilotConfig = {
    intervalMs: 10000, // run every 10 seconds
    log: true
};

// -------------------------------------------------------------
// AUTOPILOT LOOP
// -------------------------------------------------------------

export function startWorldStabilityAutopilot() {
    console.log("[PrimordiaOS] World Stability Autopilot engaged.");

    let lastHash = null;

    setInterval(async () => {
        try {
            if (autopilotConfig.log) {
                console.log("\n[PrimordiaOS] === Autopilot Cycle Start ===");
            }

            // -------------------------------------------------
            // 1. Run Stability Governor (adaptive rule tuning)
            // -------------------------------------------------
            const governorReport = runStabilityGovernor();

            if (autopilotConfig.log) {
                console.log("[Autopilot] Governor report:");
                console.log(governorReport.summary);
            }

            // -------------------------------------------------
            // 2. Enforce updated rules
            // -------------------------------------------------
            const enforcementResult = await enforceWorldRules();

            if (autopilotConfig.log) {
                console.log("[Autopilot] Enforcement result:");
                console.log(enforcementResult);
            }

            // -------------------------------------------------
            // 3. Record worldstate hash
            // -------------------------------------------------
            const newHash = await computeSceneHash();
            await recordWorldstate();

            // -------------------------------------------------
            // 4. Record violations
            // -------------------------------------------------
            const violations = await recordViolations();

            // -------------------------------------------------
            // 5. Record corrections
            // -------------------------------------------------
            if (enforcementResult.status === "corrected") {
                recordCorrections(enforcementResult.delta || {});
            }

            // -------------------------------------------------
            // 6. Record drift
            // -------------------------------------------------
            if (lastHash && lastHash !== newHash) {
                recordDrift(lastHash, newHash);
            }

            lastHash = newHash;

            if (autopilotConfig.log) {
                console.log("[PrimordiaOS] === Autopilot Cycle Complete ===\n");
            }

        } catch (err) {
            console.error("[PrimordiaOS] Autopilot error:", err);
        }
    }, autopilotConfig.intervalMs);
}
