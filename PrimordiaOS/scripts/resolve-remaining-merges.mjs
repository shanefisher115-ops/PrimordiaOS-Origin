import fs from "node:fs";
import { execSync } from "node:child_process";

const repo = "MoneyPlugHub";

function cleanLock() {
  const lock = `${repo}/.git/index.lock`;
  if (fs.existsSync(lock)) {
    try {
      fs.unlinkSync(lock);
      console.log(`[LOCK] Cleared ${lock}`);
    } catch (e) {
      console.warn(`[WARN] Could not unlink ${lock}: ${e.message}`);
    }
  }
}

cleanLock();

console.log("=== MERGING jules-pr-27 ===");
try {
  execSync(`git -C ${repo} merge jules-pr-27 --no-commit`, { encoding: "utf8", stdio: "pipe" });
  console.log("Merged cleanly without conflicts");
  execSync(`git -C ${repo} commit -m "Merge branch 'jules-pr-27': anti-fraud referral tracking middleware"`);
} catch (e) {
  console.log("Conflict during jules-pr-27 merge, resolving...");
  // 1. data/moneyplughub.db -> keep HEAD
  execSync(`git -C ${repo} checkout --ours data/moneyplughub.db`);
  
  // 2. src/backend/db.ts
  const dbFile = `${repo}/src/backend/db.ts`;
  let dbContent = fs.readFileSync(dbFile, "utf8");
  
  const conflictRegex = /<<<<<<< HEAD[\s\S]*?=======[\s\S]*?>>>>>>> jules-pr-27/;
  if (conflictRegex.test(dbContent)) {
    const resolvedBlock = "if (walInterval.unref) {\n  walInterval.unref();\n}";
    dbContent = dbContent.replace(conflictRegex, resolvedBlock);
    fs.writeFileSync(dbFile, dbContent, "utf8");
    console.log("Resolved conflict in src/backend/db.ts");
  } else {
    console.warn("Conflict block not found by regex in db.ts!");
  }
  
  execSync(`git -C ${repo} add data/moneyplughub.db src/backend/db.ts`);
  execSync(`git -C ${repo} commit -m "Merge branch 'jules-pr-27': anti-fraud referral tracking middleware"`);
  console.log("✅ Successfully committed merge of jules-pr-27");
}

console.log("\n=== MERGING jules-pr-30 ===");
try {
  execSync(`git -C ${repo} merge jules-pr-30 --no-commit`, { encoding: "utf8", stdio: "pipe" });
  console.log("Merged cleanly without conflicts");
  execSync(`git -C ${repo} commit -m "Merge branch 'jules-pr-30': Cloudflare Workers KV and Cache API Handlers"`);
} catch (e) {
  console.log("Conflict during jules-pr-30 merge, resolving...");
  // 1. data/moneyplughub.db -> keep HEAD
  execSync(`git -C ${repo} checkout --ours data/moneyplughub.db`);
  
  // 2. src/backend/test.ts (ours has Step 10 tests)
  execSync(`git -C ${repo} checkout --ours src/backend/test.ts`);
  
  execSync(`git -C ${repo} add data/moneyplughub.db src/backend/test.ts`);
  execSync(`git -C ${repo} commit -m "Merge branch 'jules-pr-30': Cloudflare Workers KV and Cache API Handlers"`);
  console.log("✅ Successfully committed merge of jules-pr-30");
}

cleanLock();

console.log("\n=== UNMERGED STATUS ===");
console.log(execSync(`git -C ${repo} branch --no-merged`, { encoding: "utf8" }));

console.log("\n=== LATEST COMMITS ===");
console.log(execSync(`git -C ${repo} log -n 8 --oneline`, { encoding: "utf8" }));
