// =============================================================
// PrimordiaOS World Rules DSL
// Parses human-readable rule definitions into executable rules
// =============================================================

import { WorldRules } from "./Primordia_WorldRulesEngine.mjs";

// -------------------------------------------------------------
// DSL PARSER
// -------------------------------------------------------------

export function parseRuleDSL(dslText) {
    const rules = {};

    // Split into rule blocks
    const blocks = dslText.split(/rule\s+/).slice(1);

    for (const block of blocks) {
        const nameMatch = block.match(/"(.*?)"/);
        if (!nameMatch) continue;

        const ruleName = nameMatch[1];

        const body = block.split("{")[1].split("}")[0].trim();

        const lines = body.split("\n").map(l => l.trim()).filter(Boolean);

        let condition = null;
        let enforcement = null;

        for (const line of lines) {
            if (line.startsWith("actor.")) {
                condition = parseCondition(line);
            }
            if (line.startsWith("enforce")) {
                enforcement = parseEnforcement(line);
            }
        }

        rules[ruleName] = {
            description: ruleName,
            check: condition,
            fix: enforcement
        };
    }

    return rules;
}

// -------------------------------------------------------------
// CONDITION PARSER
// -------------------------------------------------------------

function parseCondition(line) {
    // Examples:
    // actor.name contains "Floor"
    // actor.class == "PointLight"

    if (line.includes("contains")) {
        const [left, right] = line.split("contains").map(s => s.trim());
        const field = left.replace("actor.", "");
        const value = right.replace(/"/g, "");

        return function(actor) {
            return actor[field].includes(value);
        };
    }

    if (line.includes("==")) {
        const [left, right] = line.split("==").map(s => s.trim());
        const field = left.replace("actor.", "");
        const value = right.replace(/"/g, "");

        return function(actor) {
            return actor[field] === value;
        };
    }

    return () => true;
}

// -------------------------------------------------------------
// ENFORCEMENT PARSER
// -------------------------------------------------------------

function parseEnforcement(line) {
    // Example:
    // enforce transform.location.z = 0
    const expr = line.replace("enforce", "").trim();

    const [left, right] = expr.split("=").map(s => s.trim());
    const path = left.split(".");
    const value = Number(right);

    return function(actor) {
        let target = actor;
        for (let i = 0; i < path.length - 1; i++) {
            target = target[path[i]];
        }
        target[path[path.length - 1]] = value;
        return actor;
    };
}

// -------------------------------------------------------------
// REGISTER DSL RULES INTO WORLD RULE ENGINE
// -------------------------------------------------------------

export function registerDSLRules(dslText) {
    const parsed = parseRuleDSL(dslText);

    for (const name in parsed) {
        WorldRules[name] = parsed[name];
    }

    console.log("[PrimordiaOS] DSL rules registered:", Object.keys(parsed));
}
