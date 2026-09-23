// =============================================================
// PrimordiaOS Autonomous World Rules Engine
// Defines world rules and detects violations in Unreal worldstate
// =============================================================

import { computeSceneHash } from "./Primordia_WorldstateEngine.mjs";
import { computeSceneDelta } from "./Primordia_SceneDeltaEngine.mjs";
import { applySceneCorrections } from "./Primordia_AutonomousSceneCorrectionEngine.mjs";

// -------------------------------------------------------------
// RULESET
// -------------------------------------------------------------

export const WorldRules = {

    // Floor must be level (Z = 0)
    floorLevel: {
        description: "Floor must always be level at Z = 0",
        check(actor) {
            if (actor.name.toLowerCase().includes("floor")) {
                return actor.transform.location[2] === 0;
            }
            return true;
        },
        fix(actor) {
            actor.transform.location[2] = 0;
            return actor;
        }
    },

    // Lights must have intensity >= 500
    minimumLightIntensity: {
        description: "Lights must have intensity >= 500",
        check(actor) {
            if (actor.light_intensity !== undefined) {
                return actor.light_intensity >= 500;
            }
            return true;
        },
        fix(actor) {
            actor.light_intensity = 500;
            return actor;
        }
    },

    // Materials must be from Primordia palette
    primordiaMaterialPalette: {
        description: "Materials must be from Primordia palette",
        allowed: ["M_PrimordiaNeutral", "M_PrimordiaGlass", "M_PrimordiaMetal"],
        check(actor) {
            if (actor.materials && actor.materials.length > 0) {
                return actor.materials.every(m => this.allowed.includes(m));
            }
            return true;
        },
        fix(actor) {
            actor.materials = ["M_PrimordiaNeutral"];
            return actor;
        }
    },

    // Actors must not intersect (simple bounding rule)
    noActorIntersection: {
        description: "Actors must not intersect each other",
        check(actor, allActors) {
            const locA = actor.transform.location;
            for (const other of allActors) {
                if (other.name === actor.name) continue;
                const locB = other.transform.location;

                const dx = Math.abs(locA[0] - locB[0]);
                const dy = Math.abs(locA[1] - locB[1]);
                const dz = Math.abs(locA[2] - locB[2]);

                if (dx < 50 && dy < 50 && dz < 50) {
                    return false;
                }
            }
            return true;
        },
        fix(actor) {
            actor.transform.location[0] += 100;
            return actor;
        }
    }
};

// -------------------------------------------------------------
// RULE EVALUATION ENGINE
// -------------------------------------------------------------

export function evaluateWorldRules(worldStateJson) {
    const world = JSON.parse(worldStateJson);
    const violations = [];

    for (const actor of world) {
        for (const ruleName in WorldRules) {
            const rule = WorldRules[ruleName];

            const ok = rule.check.length === 2
                ? rule.check(actor, world)
                : rule.check(actor);

            if (!ok) {
                violations.push({
                    actor: actor.name,
                    rule: ruleName,
                    description: rule.description
                });
            }
        }
    }

    return violations;
}

// -------------------------------------------------------------
// AUTONOMOUS RULE ENFORCEMENT
// -------------------------------------------------------------

export async function enforceWorldRules() {
    console.log("[PrimordiaOS] Enforcing world rules...");

    // 1. Get current worldstate
    const currentHash = await computeSceneHash();
    const currentState = currentHash.rawJson || currentHash.json;

    // 2. Evaluate rules
    const violations = evaluateWorldRules(currentState);

    if (violations.length === 0) {
        console.log("[PrimordiaOS] No rule violations detected.");
        return { status: "clean", violations: [] };
    }

    console.log("[PrimordiaOS] Violations detected:", violations);

    // 3. Build corrected worldstate
    const correctedState = JSON.parse(currentState);

    for (const v of violations) {
        const actor = correctedState.find(a => a.name === v.actor);
        const rule = WorldRules[v.rule];
        rule.fix(actor);
    }

    // 4. Compute delta between current and corrected
    const delta = computeSceneDelta(currentState, JSON.stringify(correctedState));

    // 5. Apply corrections
    await applySceneCorrections(delta);

    console.log("[PrimordiaOS] World rules enforced.");
    return { status: "corrected", violations };
}
