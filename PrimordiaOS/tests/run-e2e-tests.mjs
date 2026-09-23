#!/usr/bin/env node

/**
 * PrimordiaOS Master Test Runner:
 * Supports running full 4-Tier E2E test suite + Tier 5 Adversarial Hardening Suite.
 */

import { runAllTests } from "./e2e/runner.js";
import { runTier5AdversarialHardeningSuite } from "./tier5-adversarial-hardening.js";

async function main() {
  const args = process.argv.slice(2);
  const runOnlyTier5 = args.includes("--tier5") || args.includes("-5");
  const runOnlyE2E = args.includes("--e2e") || args.includes("-e");

  try {
    if (runOnlyTier5) {
      console.log("Running Tier 5 Adversarial Hardening Suite exclusively...\n");
      const tier5Result = await runTier5AdversarialHardeningSuite();
      process.exit(tier5Result.success ? 0 : 1);
    } else if (runOnlyE2E) {
      console.log("Running Full 4-Tier E2E Test Suite (48 suites, 152 tests)...\n");
      const e2eResult = await runAllTests();
      process.exit(e2eResult.success ? 0 : 1);
    } else {
      console.log("Running Complete PrimordiaOS Test Ecosystem (Tiers 1-4 E2E [48 Suites, 152 Tests] + Tier 5 Hardening)...\n");
      
      // 1. Run Full 4-Tier E2E Test Suite
      console.log(">>> Phase 1: 4-Tier E2E Comprehensive Test Suites <<<\n");
      const e2eResult = await runAllTests();
      if (!e2eResult.success) {
        console.error("❌ Phase 1 E2E Test Suite failed!");
        process.exit(1);
      }

      console.log("\n>>> Phase 2: Tier 5 Adversarial Hardening & Chaos Suite <<<\n");
      // 2. Run Tier 5 Adversarial Hardening
      const tier5Result = await runTier5AdversarialHardeningSuite();
      if (!tier5Result.success) {
        console.error("❌ Phase 2 Tier 5 Adversarial Hardening failed!");
        process.exit(1);
      }

      console.log("\n" + "=".repeat(80));
      console.log("🎉 ALL E2E & HARDENING SUITES PASSED WITH 100% SUCCESS! 🎉");
      console.log("=".repeat(80) + "\n");
      process.exit(0);
    }
  } catch (err) {
    console.error("FATAL RUNNER ERROR:", err);
    process.exit(1);
  }
}

main();
