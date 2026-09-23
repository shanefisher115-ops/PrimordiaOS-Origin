// =============================================================
// PrimordiaOS World Rules Memory Engine
// Stores historical worldstate, violations, corrections, drift
// =============================================================

import fs from "fs";
import path from "path";

import { computeSceneHash } from "./Primordia_WorldstateEngine.mjs";
import { evaluateWorldRules } from "./Primordia_WorldRulesEngine.mjs";

// -------------------------------------------------------------
// MEMORY FILE LOCATION
// -------------------------------------------------------------

const MEMORY_FILE = path.resolve(
    "C:/Users/Shane/PrimordiaOS/world_memory.json"
);

// -------------------------------------------------------------
// LOAD MEMORY
// -------------------------------------------------------------

function loadMemory() {
    if (!fs.existsSync(MEMORY_FILE)) {
        return {
            worldstates: [],
            violations: [],
            corrections: [],
            drift_patterns: [],
            rule_evolution: []
        };
    }
    return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
}

// -------------------------------------------------------------
// SAVE MEMORY
// -------------------------------------------------------------

function saveMemory(mem) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2));
}

// -------------------------------------------------------------
// RECORD WORLDSTATE HASH
// -------------------------------------------------------------

export async function recordWorldstate() {
    const mem = loadMemory();
    const hash = await computeSceneHash();

    mem.worldstates.push({
        timestamp: Date.now(),
        hash
    });

    saveMemory(mem);
    return hash;
}

// -------------------------------------------------------------
// RECORD VIOLATIONS
// -------------------------------------------------------------

export async function recordViolations() {
    const mem = loadMemory();

    const hash = await computeSceneHash();
    const state = hash.rawJson || hash.json;
    const violations = evaluateWorldRules(state);

    mem.violations.push({
        timestamp: Date.now(),
        hash,
        violations
    });

    saveMemory(mem);
    return violations;
}

// -------------------------------------------------------------
// RECORD CORRECTIONS
// -------------------------------------------------------------

export function recordCorrections(delta) {
    const mem = loadMemory();

    mem.corrections.push({
        timestamp: Date.now(),
        delta
    });

    saveMemory(mem);
}

// -------------------------------------------------------------
// RECORD DRIFT PATTERNS
// -------------------------------------------------------------

export function recordDrift(previousHash, currentHash) {
    const mem = loadMemory();

    mem.drift_patterns.push({
        timestamp: Date.now(),
        from: previousHash,
        to: currentHash
    });

    saveMemory(mem);
}

// -------------------------------------------------------------
// RECORD RULE EVOLUTION
// -------------------------------------------------------------

export function recordRuleEvolution(ruleName, changeDescription) {
    const mem = loadMemory();

    mem.rule_evolution.push({
        timestamp: Date.now(),
        rule: ruleName,
        change: changeDescription
    });

    saveMemory(mem);
}

// -------------------------------------------------------------
// QUERY MEMORY
// -------------------------------------------------------------

export function getWorldHistory() {
    return loadMemory().worldstates;
}

export function getViolationHistory() {
    return loadMemory().violations;
}

export function getCorrectionHistory() {
    return loadMemory().corrections;
}

export function getDriftHistory() {
    return loadMemory().drift_patterns;
}

export function getRuleEvolutionHistory() {
    return loadMemory().rule_evolution;
}
