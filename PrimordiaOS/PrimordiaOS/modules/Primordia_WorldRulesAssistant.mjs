// =============================================================
// PrimordiaOS World Rules AI Assistant
// Conversational explanations for rules, violations, corrections
// =============================================================

import { WorldRules } from "./Primordia_WorldRulesEngine.mjs";
import { evaluateWorldRules } from "./Primordia_WorldRulesEngine.mjs";
import { computeSceneHash } from "./Primordia_WorldstateEngine.mjs";

// -------------------------------------------------------------
// NATURAL LANGUAGE EXPLANATION ENGINE
// -------------------------------------------------------------

function explainRule(name, rule) {
    return `
Rule: ${name}

Purpose:
${rule.description}

What it enforces:
- Ensures world consistency
- Prevents drift in actor behavior
- Maintains PrimordiaOS simulation integrity

How it works:
The rule checks specific actor properties (name, class, materials, transforms)
and ensures they match the expected world constraints.

If violated:
PrimordiaOS will automatically correct the actor to restore world stability.
    `.trim();
}

function explainViolation(v) {
    return `
Violation detected:

Actor: ${v.actor}
Rule: ${v.rule}

Meaning:
The actor is currently in a state that breaks the world’s intended laws.

Why this matters:
World rules define the structural integrity of the PrimordiaOS simulation.
Violations indicate drift, corruption, or unintended world evolution.

Next step:
PrimordiaOS can automatically correct this violation using autonomous repair.
    `.trim();
}

function explainCorrection(v) {
    return `
Correction applied:

Actor: ${v.actor}
Rule: ${v.rule}

What was fixed:
The actor was adjusted to match the world rule’s expected state.

Why this is important:
Corrections maintain world stability, prevent cascading errors,
and ensure the simulation remains deterministic and predictable.

PrimordiaOS guarantees:
After correction, the worldstate hash will reflect a stable, rule-compliant world.
    `.trim();
}

// -------------------------------------------------------------
// MAIN ASSISTANT INTERFACE
// -------------------------------------------------------------

export async function worldRulesAssistant(query) {
    query = query.toLowerCase();

    // ---------------------------------------------------------
    // EXPLAIN A SPECIFIC RULE
    // ---------------------------------------------------------
    for (const name in WorldRules) {
        if (query.includes(name.toLowerCase())) {
            return explainRule(name, WorldRules[name]);
        }
    }

    // ---------------------------------------------------------
    // EXPLAIN VIOLATIONS
    // ---------------------------------------------------------
    if (query.includes("violations") || query.includes("what is wrong")) {
        const hash = await computeSceneHash();
        const state = hash.rawJson || hash.json;
        const violations = evaluateWorldRules(state);

        if (violations.length === 0) {
            return "The world is stable. No rule violations detected.";
        }

        return violations.map(explainViolation).join("\n\n");
    }

    // ---------------------------------------------------------
    // EXPLAIN CORRECTIONS
    // ---------------------------------------------------------
    if (query.includes("correction") || query.includes("fixed")) {
        const hash = await computeSceneHash();
        const state = hash.rawJson || hash.json;
        const violations = evaluateWorldRules(state);

        if (violations.length === 0) {
            return "All corrections have been applied. The world is now stable.";
        }

        return violations.map(explainCorrection).join("\n\n");
    }

    // ---------------------------------------------------------
    // GENERAL WORLDSTATE EXPLANATION
    // ---------------------------------------------------------
    if (query.includes("world") || query.includes("state")) {
        const hash = await computeSceneHash();
        return `
Current worldstate hash: ${hash}

Meaning:
This hash represents the entire Unreal scene — actors, transforms,
materials, lights, and metadata. Any change produces a new hash.

Why it matters:
PrimordiaOS uses this hash to detect drift, enforce rules,
and maintain simulation integrity.
        `.trim();
    }

    // ---------------------------------------------------------
    // DEFAULT RESPONSE
    // ---------------------------------------------------------
    return `
I can explain:

- any world rule
- any violation
- any correction
- the worldstate hash
- how the simulation maintains stability

Ask me:
"Explain FloorLevel"
"Explain violations"
"What corrections were applied?"
"What is the worldstate?"
    `.trim();
}
