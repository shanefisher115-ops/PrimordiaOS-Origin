#!/usr/bin/env node

import https from "node:https";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { antigravGuardian } from "../PrimordiaOS/agents/antigrav-guardian/index.js";

const TARGET_REPOS = [
  { name: "shanefisher115-ops/moneyplughub", localDir: "MoneyPlugHub" },
  { name: "shanefisher115-ops/frontend", localDir: "frontend" }
];

function fetchJSON(urlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: urlPath,
      method: "GET",
      headers: {
        "User-Agent": "PrimordiaOS-Sentinel",
        "Accept": "application/vnd.github.v3+json"
      }
    };

    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

function fetchDiff(repoName, prNumber) {
  return new Promise((resolve) => {
    const url = `https://patch-diff.githubusercontent.com/raw/${repoName}/pull/${prNumber}.diff`;
    https.get(url, { headers: { "User-Agent": "PrimordiaOS-Sentinel" } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, { headers: { "User-Agent": "PrimordiaOS-Sentinel" } }, res2 => {
          let data = "";
          res2.on("data", chunk => (data += chunk));
          res2.on("end", () => resolve(data));
        }).on("error", () => resolve(""));
        return;
      }
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", () => resolve(""));
  });
}

async function runSentinel() {
  console.log("================================================================================");
  console.log("             PRIMORDIAOS FLEET PR SYNC & SOVEREIGN AUDIT SENTINEL              ");
  console.log("================================================================================");

  const results = [];

  for (const target of TARGET_REPOS) {
    console.log(`\n🔍 Checking open PRs in [${target.name}]...`);
    let prs = [];
    try {
      const response = await fetchJSON(`/repos/${target.name}/pulls?state=open&per_page=15`);
      if (Array.isArray(response)) {
        prs = response;
      } else {
        console.warn(`Could not list PRs: ${response.message || "Unknown error"}`);
        continue;
      }
    } catch (e) {
      console.error(`Error querying GitHub API for ${target.name}:`, e.message);
      continue;
    }

    console.log(`Found ${prs.length} open PR(s) in ${target.name}`);
    const hasLocalRepo = fs.existsSync(target.localDir) && fs.existsSync(path.join(target.localDir, ".git"));

    for (const pr of prs) {
      const prId = pr.number;
      const title = pr.title;
      const branchName = `jules-pr-${prId}`;

      console.log(`\n--------------------------------------------------------------------------------`);
      console.log(`PR #${prId}: ${title}`);
      console.log(`Author:     ${pr.user?.login} | Created: ${pr.created_at}`);

      // 1. Fetch Diff directly via GitHub
      const diff = await fetchDiff(target.name, prId);
      console.log(`Fetched diff (${diff.length} bytes)`);

      // 2. Run ANTIGRAV Audit
      const auditReport = antigravGuardian.audit(diff || title, { threshold: 70 });
      const statusIcon = auditReport.passed ? "✅ YES" : "❌ NO";
      console.log(`🛡️ ANTIGRAV Audit: Score ${auditReport.score}/100 | Passed: ${statusIcon}`);
      console.log(`   Uniqueness: ${auditReport.uniqueness}% | Sovereignty: ${auditReport.sovereignty}% | Friction: ${auditReport.friction}%`);

      let pullStatus = "remote-only";
      // 3. If passed and local repo exists, fetch branch ref
      if (hasLocalRepo && auditReport.passed) {
        try {
          execSync(`git -C ${target.localDir} fetch origin +refs/pull/${prId}/head:${branchName} --quiet`, {
            encoding: "utf-8",
            timeout: 10000
          });
          pullStatus = `pulled -> ${branchName}`;
          console.log(`📥 Pulled into local branch: ${branchName}`);
        } catch (err) {
          pullStatus = "fetch-failed";
          console.warn(`[WARN] Failed to pull branch: ${err.message}`);
        }
      } else if (!auditReport.passed) {
        pullStatus = "blocked (score < 70)";
      }

      results.push({
        repo: target.name,
        prNumber: prId,
        title,
        branch: branchName,
        pullStatus,
        score: auditReport.score,
        passed: auditReport.passed,
        feedback: auditReport.feedback,
        url: pr.html_url
      });
    }
  }

  // Summary Table
  console.log("\n================================================================================");
  console.log("                        FLEET PR AUDIT SUMMARY REPORT                           ");
  console.log("================================================================================");
  for (const r of results) {
    const statusIcon = r.passed ? "✅ PASS" : "❌ BLOCK";
    console.log(`[${r.repo}] PR #${r.prNumber} (${statusIcon} - Score ${r.score}): ${r.title}`);
    console.log(`   Status: ${r.pullStatus} | URL: ${r.url}`);
  }
  console.log("================================================================================\n");

  // Save audit log to markdown
  const summaryMarkdown = [
    `# 🛡️ Fleet PR Audit Sentinel Report`,
    `Generated at: ${new Date().toISOString()}`,
    ``,
    `| Repository | PR # | Score | Audit Status | Local Branch State | Title |`,
    `|---|---|---|---|---|---|`,
    ...results.map(r => `| \`${r.repo}\` | [#${r.prNumber}](${r.url}) | **${r.score}/100** | ${r.passed ? "✅ **APPROVED**" : "❌ **BLOCKED**"} | \`${r.pullStatus}\` | ${r.title} |`),
    ``,
    `### Local Tracking Branches Ready to Review:`,
    ...results.filter(r => r.pullStatus.startsWith("pulled")).map(r => `- In \`${r.repo}\`: \`git checkout ${r.branch}\``),
    ``,
    `*Evaluated by Tier-2 AntigravGuardian on behalf of Human Sovereign.*`
  ].join("\n");

  fs.writeFileSync("fleet-pr-audit-summary.md", summaryMarkdown, "utf-8");
  console.log("Saved summary report to fleet-pr-audit-summary.md");
}

runSentinel().catch(err => {
  console.error("Sentinel encountered fatal error:", err);
  process.exit(1);
});
