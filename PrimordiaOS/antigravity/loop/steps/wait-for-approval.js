import { getUnapprovedEntries } from "../../../moneyplughub/ledger/query-ledger.js";

export async function waitForApproval(diffFile, timeoutMs = 300000) {
  console.log("? Step 4: Awaiting PrimordiaOS HUD approval...");
  const normalizedPath = diffFile.replace(/\\/g, "/");
  const startTime = Date.now();

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const pending = getUnapprovedEntries();
      const match = pending.find(e => e.diff_file.replace(/\\/g, "/") === normalizedPath);
      if (!match) {
        clearInterval(interval);
        console.log("? Approval signal received!");
        resolve(true);
      }
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        console.warn("?? Approval timed out.");
        resolve(false);
      }
    }, 4000);
  });
}
