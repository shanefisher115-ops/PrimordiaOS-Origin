#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { antigravGuardian } from "../PrimordiaOS/agents/antigrav-guardian/index.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    base: "origin/main",
    head: "HEAD",
    diffFile: null,
    reportFile: "pr-audit-report.md",
    threshold: 70
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base" && args[i + 1]) {
      options.base = args[++i];
    } else if (args[i] === "--head" && args[i + 1]) {
      options.head = args[++i];
    } else if (args[i] === "--diff-file" && args[i + 1]) {
      options.diffFile = args[++i];
    } else if (args[i] === "--report" && args[i + 1]) {
      options.reportFile = args[++i];
    } else if (args[i] === "--threshold" && args[i + 1]) {
      options.threshold = parseInt(args[++i], 10) || 70;
    }
  }

  return options;
}

function getDiffContent(options) {
  if (options.diffFile && fs.existsSync(options.diffFile)) {
    return fs.readFileSync(options.diffFile, "utf-8");
  }

  try {
    const diff = execSync(`git diff ${options.base}...${options.head}`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024
    });
    return diff;
  } catch (err) {
    console.warn(`[WARN] Failed to run 'git diff ${options.base}...${options.head}', falling back to diff against HEAD~1: ${err.message}`);
    try {
      return execSync("git diff HEAD~1 HEAD", {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024
      });
    } catch {
      return "";
    }
  }
}

function getChangedFiles(options) {
  try {
    const output = execSync(`git diff --name-only ${options.base}...${options.head}`, {
      encoding: "utf-8"
    });
    return output.split("\n").map(f => f.trim()).filter(Boolean);
  } catch {
    try {
      const output = execSync("git diff --name-only HEAD~1 HEAD", { encoding: "utf-8" });
      return output.split("\n").map(f => f.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
}

async function main() {
  const options = parseArgs();
  console.log("================================================================================");
  console.log("               PRIMORDIAOS AUTONOMOUS PR SOVEREIGNTY SENTINEL                  ");
  console.log("================================================================================");
  console.log(`Base:         ${options.base}`);
  console.log(`Head:         ${options.head}`);
  console.log(`Threshold:    ${options.threshold}`);

  const changedFiles = getChangedFiles(options);
  console.log(`Changed Files (${changedFiles.length}):`);
  changedFiles.forEach(f => console.log(`  - ${f}`));

  const diffContent = getDiffContent(options);
  if (!diffContent || diffContent.trim().length === 0) {
    console.log("\n[INFO] Diff is empty (no changes detected). Passing by default.");
    process.exit(0);
  }

  const report = antigravGuardian.audit(diffContent, { threshold: options.threshold });

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`ANTIGRAV Score:    ${report.score} / 100 (Required Threshold: ${options.threshold})`);
  console.log(`Passed:            ${report.passed ? "✅ YES" : "❌ NO"}`);
  console.log(`Uniqueness:        ${report.uniqueness}%`);
  console.log(`Sovereignty:       ${report.sovereignty}%`);
  console.log(`Friction:          ${report.friction}%`);
  console.log(`Summary:           ${report.feedback}`);
  if (report.flags && report.flags.length > 0) {
    console.log(`Flags Detected:    ${report.flags.join(", ")}`);
  }
  if (report.requiredActions && report.requiredActions.length > 0) {
    console.log(`Required Actions:  ${report.requiredActions.join(" | ")}`);
  }
  console.log("================================================================================\n");

  // Format GitHub Markdown Report
  const markdownReport = [
    `## 🛡️ Primordial OS Sovereign PR Audit`,
    ``,
    `| Metric | Score / Status | Threshold |`,
    `|---|---|---|`,
    `| **Overall ANTIGRAV()** | **${report.score} / 100** | ${options.threshold} |`,
    `| **Status** | ${report.passed ? "✅ **APPROVED**" : "❌ **BLOCKED**"} | >= ${options.threshold} |`,
    `| **Uniqueness** | ${report.uniqueness}% | - |`,
    `| **Sovereignty** | ${report.sovereignty}% | - |`,
    `| **Cognitive Friction** | ${report.friction}% | - |`,
    ``,
    `### 📋 Audit Summary`,
    `> ${report.feedback}`,
    ``,
    `**Audited Changed Files:** ${changedFiles.length}`,
    changedFiles.map(f => `- \`${f}\``).join("\n"),
    ``,
    report.flags && report.flags.length > 0 ? `**⚠️ Collapse Risk Flags:**\n${report.flags.map(fl => `- \`${fl}\``).join("\n")}\n` : `*No passive collapse patterns detected.*`,
    report.requiredActions && report.requiredActions.length > 0 ? `**🔧 Required Revisions:**\n${report.requiredActions.map(act => `- ${act}`).join("\n")}\n` : ``,
    `---`,
    `*Evaluated by Tier-2 AntigravGuardian on behalf of Human Sovereign.*`
  ].join("\n");

  // Write markdown report file for PR comment posting
  fs.writeFileSync(path.resolve(process.cwd(), options.reportFile), markdownReport, "utf-8");

  // Append to GitHub Actions step summary if running in CI
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdownReport + "\n", "utf-8");
  }

  if (!report.passed) {
    console.error("❌ ANTIGRAV() sovereignty threshold not met. Auto-merge aborted.");
    process.exit(1);
  }

  console.log("✅ ANTIGRAV() sovereignty check passed. PR is safe for autonomous merge.");
  process.exit(0);
}

main().catch(err => {
  console.error("Audit gate encountered fatal error:", err);
  process.exit(1);
});
