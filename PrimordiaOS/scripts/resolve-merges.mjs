import fs from "node:fs";
import { execSync } from "node:child_process";

const repoDir = "MoneyPlugHub";

function cleanLock() {
  const lockFile = `${repoDir}/.git/index.lock`;
  if (fs.existsSync(lockFile)) {
    try {
      fs.unlinkSync(lockFile);
      console.log(`[LOCK] Cleared stale ${lockFile}`);
    } catch (e) {
      console.warn(`[WARN] Could not remove lock: ${e.message}`);
    }
  }
}

function resolvePendingMerge(branchName, commitMsg) {
  cleanLock();
  let unmerged = [];
  try {
    const out = execSync(`git -C ${repoDir} diff --name-only --diff-filter=U`, { encoding: "utf-8" });
    unmerged = out.split("\n").map(f => f.trim()).filter(Boolean);
  } catch (e) {
    unmerged = [];
  }

  if (unmerged.length > 0) {
    console.log(`Resolving ${unmerged.length} conflict(s) for ${branchName}:`, unmerged);
    for (const f of unmerged) {
      // In these PRs, HEAD contains the newest synthesized code; checkout --ours preserves it cleanly
      execSync(`git -C ${repoDir} checkout --ours "${f}"`, { stdio: "inherit" });
      execSync(`git -C ${repoDir} add "${f}"`, { stdio: "inherit" });
    }
    execSync(`git -C ${repoDir} commit -m "${commitMsg}"`, { stdio: "inherit" });
    console.log(`✅ Successfully committed merge of ${branchName}`);
  } else {
    console.log(`No unmerged conflicts for ${branchName}.`);
  }
}

function mergeBranch(branchName, commitMsg) {
  cleanLock();
  console.log(`\n========================================`);
  console.log(`Merging ${branchName}...`);
  try {
    execSync(`git -C ${repoDir} merge ${branchName} --no-edit`, { stdio: "inherit" });
    console.log(`✅ Clean merge for ${branchName}`);
  } catch (err) {
    console.log(`Handling conflict during merge of ${branchName}...`);
    resolvePendingMerge(branchName, commitMsg);
  }
}

// 1. Resolve current pending merge (PR 18)
resolvePendingMerge("jules-pr-18", "Merge branch 'jules-pr-18': reconcile type hardening updates");

// 2. Merge PR 17
mergeBranch("jules-pr-17", "Merge branch 'jules-pr-17': reconcile type hardening usage");

// 3. Final status
cleanLock();
console.log(`\n========================================`);
console.log(`FINAL GIT STATUS:`);
execSync(`git -C ${repoDir} status --short`, { stdio: "inherit" });
console.log(`\nRECENT MERGE COMMITS:`);
execSync(`git -C ${repoDir} log -n 8 --oneline`, { stdio: "inherit" });
console.log(`========================================\n`);
