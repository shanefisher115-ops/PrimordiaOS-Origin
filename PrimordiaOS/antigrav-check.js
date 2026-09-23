#!/usr/bin/env node

import path from "node:path";
import { antigravGuardian } from "./PrimordiaOS/agents/antigrav-guardian/index.js";

async function runCheck() {
  const target = process.argv[2] || process.cwd();
  const resolvedTarget = path.resolve(process.cwd(), target);

  const report = antigravGuardian.audit(resolvedTarget);

  console.log("================================================================================");
  console.log("                     PRIMORDIAOS ANTIGRAV-CHECK (CI/CD)                         ");
  console.log("================================================================================");
  console.log(`Target:       ${report.target}`);
  console.log(`Score:        ${report.score} / 100 (Threshold: ${report.threshold})`);
  console.log(`Passed:       ${report.passed}`);
  console.log(`Summary:      ${report.feedback}`);
  console.log("================================================================================");

  if (!report.passed) {
    console.error("❌ ANTIGRAV() audit failed. Pull request or publish blocked by AntigravGuardian.");
    process.exit(1);
  } else {
    console.log("✅ ANTIGRAV() sovereignty check passed successfully.");
    process.exit(0);
  }
}

if (process.argv[1] && process.argv[1].endsWith("antigrav-check.js")) {
  runCheck().catch((err) => {
    console.error("antigrav-check error:", err);
    process.exit(1);
  });
}

export { runCheck };
