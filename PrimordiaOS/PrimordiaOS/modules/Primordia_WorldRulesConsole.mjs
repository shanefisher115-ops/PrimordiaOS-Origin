// =============================================================
// PrimordiaOS World Rules Console
// CLI for listing, loading, describing, enforcing world rules
// =============================================================

import fs from "fs";
import path from "path";

import { WorldRules } from "./Primordia_WorldRulesEngine.mjs";
import { registerDSLRules } from "./Primordia_WorldRulesDSL.mjs";
import { evaluateWorldRules } from "./Primordia_WorldRulesEngine.mjs";
import { enforceWorldRules } from "./Primordia_WorldRulesEngine.mjs";
import { computeSceneHash } from "./Primordia_WorldstateEngine.mjs";

// -------------------------------------------------------------
// MAIN CONSOLE ENTRY
// -------------------------------------------------------------

export async function worldRulesConsole(args) {
    const cmd = args[0];

    switch (cmd) {

        // -----------------------------------------------------
        // LIST RULES
        // -----------------------------------------------------
        case "list":
            console.log("\n[PrimordiaOS] World Rules:");
            for (const name in WorldRules) {
                console.log(` - ${name}`);
            }
            return;

        // -----------------------------------------------------
        // DESCRIBE RULE
        // -----------------------------------------------------
        case "describe":
            const ruleName = args[1];
            if (!WorldRules[ruleName]) {
                console.log(`[PrimordiaOS] Rule not found: ${ruleName}`);
                return;
            }
            console.log(`\nRule: ${ruleName}`);
            console.log(`Description: ${WorldRules[ruleName].description}`);
            return;

        // -----------------------------------------------------
        // SHOW VIOLATIONS
        // -----------------------------------------------------
        case "violations":
            const currentHash = await computeSceneHash();
            const currentState = currentHash.rawJson || currentHash.json;
            const violations = evaluateWorldRules(currentState);

            if (violations.length === 0) {
                console.log("[PrimordiaOS] No violations detected.");
                return;
            }

            console.log("\n[PrimordiaOS] Violations:");
            violations.forEach(v => {
                console.log(` - Actor: ${v.actor} | Rule: ${v.rule}`);
            });
            return;

        // -----------------------------------------------------
        // ENFORCE RULES
        // -----------------------------------------------------
        case "enforce":
            console.log("[PrimordiaOS] Enforcing world rules...");
            await enforceWorldRules();
            return;

        // -----------------------------------------------------
        // LOAD DSL FILE
        // -----------------------------------------------------
        case "load":
            const file = args[1];
            if (!file) {
                console.log("[PrimordiaOS] No DSL file specified.");
                return;
            }

            const fullPath = path.resolve(file);
            if (!fs.existsSync(fullPath)) {
                console.log(`[PrimordiaOS] DSL file not found: ${fullPath}`);
                return;
            }

            const dslText = fs.readFileSync(fullPath, "utf8");
            registerDSLRules(dslText);

            console.log(`[PrimordiaOS] Loaded DSL rules from: ${fullPath}`);
            return;

        // -----------------------------------------------------
        // RELOAD RULES (clear + reload DSL)
        // -----------------------------------------------------
        case "reload":
            console.log("[PrimordiaOS] Reloading world rules...");
            for (const key in WorldRules) delete WorldRules[key];
            console.log("[PrimordiaOS] Rule set cleared.");
            return;

        // -----------------------------------------------------
        // EXPORT RULES TO FILE
        // -----------------------------------------------------
        case "export":
            const outFile = args[1] || "exported_rules.json";
            fs.writeFileSync(outFile, JSON.stringify(WorldRules, null, 2));
            console.log(`[PrimordiaOS] Rules exported to ${outFile}`);
            return;

        // -----------------------------------------------------
        // UNKNOWN COMMAND
        // -----------------------------------------------------
        default:
            console.log("[PrimordiaOS] Unknown rules command.");
            console.log("Available commands:");
            console.log("  rules list");
            console.log("  rules describe <name>");
            console.log("  rules violations");
            console.log("  rules enforce");
            console.log("  rules load <file.dsl>");
            console.log("  rules reload");
            console.log("  rules export <file.json>");
            return;
    }
}
