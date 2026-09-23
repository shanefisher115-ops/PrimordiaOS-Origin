import { processSwarmCommand } from './swarm.js';

async function runTests() {
  console.log("=== 1. Testing Vault Agent ===");
  const vaultRes = await processSwarmCommand("Run telemetry check on my vault velocity.");
  console.log(vaultRes);

  console.log("\n=== 2. Testing Debt Elimination Agent ===");
  const debtRes = await processSwarmCommand("Apply $200 extra using avalanche and show my new date.");
  console.log(debtRes);

  console.log("\n=== 3. Testing Creator Leverage Agent ===");
  const leverageRes = await processSwarmCommand("If I hit 50 referrals at $15 each, what is my stock asset equivalent?");
  console.log(leverageRes);
}

runTests();
