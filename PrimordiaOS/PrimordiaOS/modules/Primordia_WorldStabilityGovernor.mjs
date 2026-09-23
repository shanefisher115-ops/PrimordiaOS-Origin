// =============================================================
// PrimordiaOS World Stability Governor
// Automatically adjusts rules, thresholds, and correction strategies
// based on drift predictions and instability score
// =============================================================

import { WorldRules } from "./Primordia_WorldRulesEngine.mjs";
import { predictWorldDrift } from "./Primordia_WorldDriftPredictor.mjs";
import { recordRuleEvolution } from "./Primordia_WorldRulesMemoryEngine.mjs";

// -------------------------------------------------------------
// GOVERNOR CONFIG
// -------------------------------------------------------------

const governorConfig = {
    instabilityThreshold: 40,   // world becomes unstable above this
    criticalThreshold: 70,      // world becomes highly unstable above this
    maxIntensityBoost: 200,     // max increase for light rules
    maxMaterialFallback: "M_PrimordiaNeutral", // fallback material
    maxTransformCorrection: 150 // max transform offset allowed
};

// -------------------------------------------------------------
// ADAPTIVE RULE TUNING
// -------------------------------------------------------------

function tuneLightRules(instability) {
    const rule = WorldRules.minimumLightIntensity;

    if (!rule) return;

    const oldMin = rule.check.toString().match(/>=\s*(\d+)/);
    const currentMin = oldMin ? Number(oldMin[1]) : 500;

    let newMin = currentMin;

    if (instability > governorConfig.instabilityThreshold) {
        newMin += 50;
    }
    if (instability > governorConfig.criticalThreshold) {
        newMin += 100;
    }

    newMin = Math.min(newMin, currentMin + governorConfig.maxIntensityBoost);

    rule.check = function(actor) {
        if (actor.light_intensity !== undefined) {
            return actor.light_intensity >= newMin;
        }
        return true;
    };

    rule.fix = function(actor) {
        actor.light_intensity = newMin;
        return actor;
    };

    recordRuleEvolution("minimumLightIntensity", `Adjusted minimum intensity to ${newMin}`);
}

function tuneMaterialRules(highRiskActors) {
    const rule = WorldRules.primordiaMaterialPalette;
    if (!rule) return;

    if (highRiskActors.length === 0) return;

    const fallback = governorConfig.maxMaterialFallback;

    rule.fix = function(actor) {
        actor.materials = [fallback];
        return actor;
    };

    recordRuleEvolution("primordiaMaterialPalette", `Fallback material set to ${fallback}`);
}

function tuneTransformRules(instability) {
    const rule = WorldRules.noActorIntersection;
    if (!rule) return;

    const maxOffset = governorConfig.maxTransformCorrection;

    let offset = 50;

    if (instability > governorConfig.instabilityThreshold) {
        offset = 100;
    }
    if (instability > governorConfig.criticalThreshold) {
        offset = maxOffset;
    }

    rule.fix = function(actor) {
        actor.transform.location[0] += offset;
        return actor;
    };

    recordRuleEvolution("noActorIntersection", `Transform offset adjusted to ${offset}`);
}

// -------------------------------------------------------------
// MAIN GOVERNOR LOOP
// -------------------------------------------------------------

export function runStabilityGovernor() {
    console.log("[PrimordiaOS] Running World Stability Governor...");

    const prediction = predictWorldDrift();
    const instability = prediction.instability_score;

    console.log(`[PrimordiaOS] Instability score: ${instability}`);

    // ---------------------------------------------------------
    // ADAPT RULES BASED ON INSTABILITY
    // ---------------------------------------------------------

    tuneLightRules(instability);
    tuneMaterialRules(prediction.high_risk_actors);
    tuneTransformRules(instability);

    // ---------------------------------------------------------
    // RETURN GOVERNOR REPORT
    // ---------------------------------------------------------

    return {
        status: "rules_adjusted",
        instability,
        adjustments: {
            light_rules: "adaptive",
            material_rules: "fallback applied",
            transform_rules: "offset adjusted"
        },
        prediction_summary: prediction.summary
    };
}
