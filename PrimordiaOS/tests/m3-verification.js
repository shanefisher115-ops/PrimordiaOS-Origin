import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { RestServer } from "../PrimordiaOS/interfaces/rest-server.js";
import { spine } from "../PrimordiaOS/kernel/spine.js";
import { eventBus } from "../PrimordiaOS/kernel/event-bus.js";
import { stateBus } from "../PrimordiaOS/kernel/state-bus.js";
import { osmiumLedger, OsmiumLedgerAdapter } from "../PrimordiaOS/realms/identity/osmium-ledger.js";
import { moneyPlugPipeline, isCycleRunning } from "../PrimordiaOS/pipelines/moneyplug-pipeline.js";
import { step1_inspectSchema } from "../PrimordiaOS/antigravity/loop/steps/1-inspect-schema.js";
import { step2_generateDiff } from "../PrimordiaOS/antigravity/loop/steps/2-generate-diff.js";
import { step3_writeLedger } from "../PrimordiaOS/antigravity/loop/steps/3-write-ledger.js";
import { step4_triggerCommentary } from "../PrimordiaOS/antigravity/loop/steps/4-trigger-commentary.js";
import { step5_synthesizeVoice } from "../PrimordiaOS/antigravity/loop/steps/5-synthesize-voice.js";
import { step6_syncHUD } from "../PrimordiaOS/antigravity/loop/steps/6-sync-hud.js";
import { step7_routeSyndicateYield, DEFAULT_SYNDICATES, routeSyndicateYield } from "../PrimordiaOS/antigravity/loop/steps/7-route-syndicate-yield.js";
import { collectSensorTelemetry, sendTelemetry, forwardEvent } from "../PrimordiaOS/mobile-node/index.js";
import { bootPrimordiaOS } from "../PrimordiaOS/kernel/bootstrap.js";

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: options.headers || { "Content-Type": "application/json" }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runMilestone3Verification() {
  console.log("================================================================================");
  console.log("             PRIMORDIAOS MILESTONE 3 VERIFICATION TEST RUNNER                   ");
  console.log("  (Autonomous Syndicates, Osmium SHA-256 Ledger & 12s Monetization Loop)        ");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;
  const testResults = [];

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
      testResults.push({ name, status: "PASS", details });
    } else {
      console.error(`  ✗ [FAIL] ${name} ${details ? `(${details})` : ""}`);
      failed++;
      testResults.push({ name, status: "FAIL", details });
    }
  }

  const REST_URL = "http://localhost:3000";

  // =========================================================================
  // Section 1: Milestone 2 Remediation & Export Checks
  // =========================================================================
  console.log("\n[1/6] Verifying Milestone 2 Remediation (Mobile-Node Exports)...");
  assert(typeof sendTelemetry === "function", "sendTelemetry is exported as a function from mobile-node/index.js");
  assert(typeof forwardEvent === "function", "forwardEvent is exported as a function from mobile-node/index.js");
  assert(sendTelemetry === forwardEvent, "sendTelemetry is an alias of forwardEvent");

  const testSensors = collectSensorTelemetry();
  assert(testSensors.vesselId === "vessel-termux-android", "collectSensorTelemetry includes vesselId 'vessel-termux-android'");
  assert(typeof testSensors.battery === "object", "collectSensorTelemetry includes battery object");

  // =========================================================================
  // Section 2: Boot Master Spine Kernel
  // =========================================================================
  console.log("\n[2/6] Booting PrimordiaOS Master Spine Kernel...");
  const bootStatus = await bootPrimordiaOS();
  assert(bootStatus.booted === true, "Master Spine kernel booted successfully");
  assert(spine.booted === true, "spine.booted is true");

  // =========================================================================
  // Section 3: 12-Second Autonomous Pulse 7-Step Sequence & Mutex
  // =========================================================================
  console.log("\n[3/6] Testing 12-Second Autonomous Pulse 7-Step Cycle & Mutex Idempotency...");

  // 3.1 Individual Step 1-7 Verifications
  const s1 = await step1_inspectSchema();
  assert(s1.status === "clean", "Step 1: step1_inspectSchema returns status 'clean'");
  assert(s1.tablesCount === 9, "Step 1: step1_inspectSchema reports 9 canonical tables");
  assert(s1.rlsEnforced === true, "Step 1: step1_inspectSchema confirms RLS enforcement");

  const s2 = await step2_generateDiff(42);
  assert(s2.cycle === 42, "Step 2: step2_generateDiff records cycle count");
  assert(Array.isArray(s2.mutations), "Step 2: step2_generateDiff contains mutations array");
  assert(s2.mutations.some(m => m.field === "syndicate_liquidity"), "Step 2: mutations include syndicate_liquidity");
  assert(s2.mutations.some(m => m.field === "affiliate_yield"), "Step 2: mutations include affiliate_yield");
  assert(/^diff_[a-z0-9]+$/.test(s2.hash), `Step 2: diff hash matches pattern (${s2.hash})`);

  const initialLedgerLen = osmiumLedger.chain.length;
  const s3Block = await step3_writeLedger(s2);
  assert(s3Block.index === initialLedgerLen, "Step 3: step3_writeLedger commits block with correct index");
  assert(s3Block.event === "MONEYPLUG_PULSE_COMMITTED", "Step 3: step3_writeLedger sets event 'MONEYPLUG_PULSE_COMMITTED'");
  assert(s3Block.hash.length === 64, "Step 3: step3_writeLedger produces 64-char SHA-256 hash");
  assert(osmiumLedger.chain.length === initialLedgerLen + 1, "Step 3: Osmium ledger chain length increased by 1");

  const s4Commentary = await step4_triggerCommentary(s2, s3Block, 42);
  assert(typeof s4Commentary.commentaryText === "string", "Step 4: step4_triggerCommentary returns commentary text");
  assert(s4Commentary.commentaryText.includes("Cycle #42:"), "Step 4: commentary text contains 'Cycle #42:'");
  assert(s4Commentary.commentaryText.includes(`Block #${s3Block.index} sealed.`), "Step 4: commentary text references sealed block index");

  const s5Voice = await step5_synthesizeVoice(s4Commentary);
  assert(s5Voice.synthesized === true, "Step 5: step5_synthesizeVoice marks payload synthesized: true");
  assert(s5Voice.pulse === "diff", "Step 5: voice payload pulse type is 'diff'");

  const s6Hud = await step6_syncHUD(s3Block, s4Commentary);
  assert(s6Hud.type === "HUD_SYNC", "Step 6: step6_syncHUD returns type 'HUD_SYNC'");
  assert(s6Hud.blockIndex === s3Block.index, "Step 6: HUD sync reflects blockIndex");

  const s7Yield = await step7_routeSyndicateYield({
    cycle: 42,
    ledgerBlock: s3Block,
    totalYieldCents: 2000000
  });
  assert(s7Yield.success === true, "Step 7: step7_routeSyndicateYield returns success: true");
  assert(s7Yield.xpBonusMultiplier === 1.15, "Step 7: step7_routeSyndicateYield applies 1.15x (+15%) XP bonus");
  assert(Array.isArray(s7Yield.syndicates) && s7Yield.syndicates.length === 4, "Step 7: routes across 4 syndicates");
  assert(s7Yield.syndicates.includes("VRTX"), "Step 7: includes VRTX syndicate");
  assert(s7Yield.syndicates.includes("APEX"), "Step 7: includes APEX syndicate");
  assert(s7Yield.syndicates.includes("PLSE"), "Step 7: includes PLSE syndicate");
  assert(s7Yield.syndicates.includes("QNTM"), "Step 7: includes QNTM syndicate");

  // 3.2 Full Integrated Cycle Execution via moneyPlugPipeline
  console.log("\n  -> Executing full integrated 7-step autonomous cycle...");
  const cycleBefore = moneyPlugPipeline.cycleCount;
  const fullCycleResult = await moneyPlugPipeline.runAutonomousCycle();

  assert(fullCycleResult.type === "CYCLE_COMPLETED", "Full cycle returns type 'CYCLE_COMPLETED'");
  assert(fullCycleResult.cycle === cycleBefore + 1, "Full cycle increments cycle counter monotonically");
  assert(typeof fullCycleResult.timestamp === "number", "Full cycle contains numeric timestamp");
  assert(typeof fullCycleResult.diff === "object", "Full cycle contains diff object");
  assert(typeof fullCycleResult.ledgerBlock === "object", "Full cycle contains ledgerBlock object");
  assert(typeof fullCycleResult.commentary === "string", "Full cycle contains commentary string");
  assert(fullCycleResult.pulse === "diff", "Full cycle contains pulse: 'diff'");
  assert(fullCycleResult.commentary.includes(`Cycle #${fullCycleResult.cycle}:`), "Commentary contains exact cycle identifier");
  assert(fullCycleResult.commentary.includes(`Block #${fullCycleResult.ledgerBlock.index} sealed.`), "Commentary contains sealed block index");

  // 3.3 Mutex Concurrency & Idempotency Testing
  console.log("\n  -> Testing Mutex Idempotency with 5 concurrent pulse triggers...");
  assert(typeof isCycleRunning === "function", "isCycleRunning is exported as a function");
  const countBeforeConcurrent = moneyPlugPipeline.cycleCount;
  const ledgerHeightBeforeConcurrent = osmiumLedger.chain.length;

  const concurrentPromises = [
    moneyPlugPipeline.runAutonomousCycle(),
    moneyPlugPipeline.runAutonomousCycle(),
    moneyPlugPipeline.runAutonomousCycle(),
    moneyPlugPipeline.runAutonomousCycle(),
    moneyPlugPipeline.runAutonomousCycle()
  ];

  const concurrentResults = await Promise.all(concurrentPromises);
  assert(concurrentResults.length === 5, "All 5 concurrent cycles completed successfully");
  assert(moneyPlugPipeline.cycleCount === countBeforeConcurrent + 5, `Cycle counter incremented by exact 5 (${moneyPlugPipeline.cycleCount})`);
  assert(osmiumLedger.chain.length === ledgerHeightBeforeConcurrent + 5, "Osmium ledger appended exactly 5 sequential blocks");

  const blockIndexes = concurrentResults.map(r => r.ledgerBlock.index);
  const uniqueIndexes = new Set(blockIndexes);
  assert(uniqueIndexes.size === 5, "All 5 concurrent cycles produced unique sequential block indexes");

  const sortedIndexes = [...blockIndexes].sort((a, b) => a - b);
  for (let i = 0; i < sortedIndexes.length; i++) {
    assert(sortedIndexes[i] === ledgerHeightBeforeConcurrent + i, `Block index ${sortedIndexes[i]} is strictly sequential`);
  }

  // =========================================================================
  // Section 4: Osmium Cryptographic SHA-256 Hash-Chain Ledger
  // =========================================================================
  console.log("\n[4/6] Testing Osmium Cryptographic SHA-256 Hash-Chain Ledger & Tamper Boundary...");

  const isolatedLedger = new OsmiumLedgerAdapter();

  // 4.1 Genesis Block Structure
  assert(isolatedLedger.chain.length === 1, "New Osmium ledger starts with height 1 (genesis)");
  const genesis = isolatedLedger.chain[0];
  assert(genesis.index === 0, "Genesis block index is 0");
  assert(genesis.event === "GENESIS_BLOCK", "Genesis block event is 'GENESIS_BLOCK'");
  assert(genesis.previousHash === "0000000000000000000000000000000000000000000000000000000000000000", "Genesis previousHash is 64 zeroes");
  assert(genesis.hash.length === 64, "Genesis hash is 64 hex characters");
  assert(genesis.data.sovereign === "Shane", "Genesis sovereign is 'Shane'");

  // 4.2 Append Block with SHA-256 Chaining
  const b1 = isolatedLedger.appendBlock("SYNDICATE_YIELD", { amount: 500000 });
  assert(b1.index === 1, "Block 1 index is 1");
  assert(b1.previousHash === genesis.hash, "Block 1 previousHash matches genesis hash");
  assert(b1.hash.length === 64, "Block 1 hash is 64 hex characters");

  // Verify formula match
  const expectedB1Hash = crypto.createHash("sha256")
    .update(1 + b1.timestamp + genesis.hash + JSON.stringify({ amount: 500000 }))
    .digest("hex");
  assert(b1.hash === expectedB1Hash, "Block 1 hash precisely matches SHA-256 specification formula");

  // 4.3 verifyChain on Valid Ledger
  assert(isolatedLedger.verifyChain() === true, "verifyChain() returns true for untampered ledger");

  // 4.4 Tamper Detection - Genesis Mutation
  const tamperLedger1 = new OsmiumLedgerAdapter();
  tamperLedger1.appendBlock("TX1", { a: 1 });
  tamperLedger1.appendBlock("TX2", { a: 2 });
  assert(tamperLedger1.verifyChain() === true, "Pre-tamper ledger 1 is valid");
  tamperLedger1.chain[0].hash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
  assert(tamperLedger1.verifyChain() === false, "verifyChain() returns false when genesis hash is mutated");

  // 4.5 Tamper Detection - Intermediate previousHash Corruption
  const tamperLedger2 = new OsmiumLedgerAdapter();
  tamperLedger2.appendBlock("TX1", { a: 1 });
  tamperLedger2.appendBlock("TX2", { a: 2 });
  tamperLedger2.chain[2].previousHash = "0000000000000000000000000000000000000000000000000000000000000001";
  assert(tamperLedger2.verifyChain() === false, "verifyChain() returns false when intermediate previousHash is corrupted");

  // 4.6 Tamper Detection - Data Mutation
  const tamperLedger3 = new OsmiumLedgerAdapter();
  tamperLedger3.appendBlock("TX1", { balance: 100 });
  tamperLedger3.appendBlock("TX2", { balance: 200 });
  tamperLedger3.chain[1].data.balance = 999999;
  assert(tamperLedger3.verifyChain() === false, "verifyChain() returns false when block data payload is tampered");

  // 4.7 Tamper Detection - Block Order Swap
  const tamperLedger4 = new OsmiumLedgerAdapter();
  tamperLedger4.appendBlock("FIRST", { seq: 1 });
  tamperLedger4.appendBlock("SECOND", { seq: 2 });
  const tmp = tamperLedger4.chain[1];
  tamperLedger4.chain[1] = tamperLedger4.chain[2];
  tamperLedger4.chain[2] = tmp;
  assert(tamperLedger4.verifyChain() === false, "verifyChain() returns false when intermediate blocks are swapped");

  // 4.8 Ledger Accessor Methods
  assert(isolatedLedger.getBlock(1)?.event === "SYNDICATE_YIELD", "getBlock(1) retrieves block 1");
  assert(isolatedLedger.getBlock(999) === null, "getBlock(999) returns null for non-existent index");
  assert(isolatedLedger.getLatestBlock()?.index === 1, "getLatestBlock() returns head of chain");
  assert(Array.isArray(isolatedLedger.getHistory()) && isolatedLedger.getHistory().length === 2, "getHistory() returns entire chain array");

  // 4.9 High Volume 50+ Blocks Chain Integrity
  const stressLedger = new OsmiumLedgerAdapter();
  for (let i = 0; i < 50; i++) {
    stressLedger.appendBlock(`STRESS_BLOCK_${i}`, { iteration: i, entropy: Math.random() });
  }
  assert(stressLedger.chain.length === 51, "Stress ledger height is 51");
  assert(stressLedger.verifyChain() === true, "verifyChain() passes on 50+ sequentially chained blocks");

  // 4.10 Master Spine Live osmiumLedger Integrity
  assert(osmiumLedger.verifyChain() === true, "Master Spine live osmiumLedger passes verifyChain()");

  // =========================================================================
  // Section 5: Metadata Registries REST Endpoints (Port 3000)
  // =========================================================================
  console.log("\n[5/6] Testing Port 3000 Metadata Registries REST Endpoints...");

  // 5.1 GET /api/registry (7,504 modules)
  const regRes = await makeRequest(`${REST_URL}/api/registry`);
  assert(regRes.status === 200, "GET /api/registry returns HTTP 200");
  assert(regRes.json !== null, "GET /api/registry returns valid JSON");
  const modulesDict = regRes.json.modules || regRes.json;
  const moduleCount = Object.keys(modulesDict).length;
  assert(moduleCount > 100, `GET /api/registry contains registered modules (Count: ${moduleCount})`);

  // 5.2 GET /api/realm-map
  const mapRes = await makeRequest(`${REST_URL}/api/realm-map`);
  assert(mapRes.status === 200, "GET /api/realm-map returns HTTP 200");
  assert(mapRes.json !== null, "GET /api/realm-map returns valid JSON");
  const realmsDict = mapRes.json.realms || mapRes.json;
  assert(Object.keys(realmsDict).length >= 5, "GET /api/realm-map defines all 5 continuous realms");
  assert(realmsDict.local_realm !== undefined || realmsDict.local !== undefined, "realm-map includes local realm");
  assert(realmsDict.cloud_realm !== undefined || realmsDict.cloud !== undefined, "realm-map includes cloud realm");
  assert(realmsDict.simulation_realm !== undefined || realmsDict.simulation !== undefined, "realm-map includes simulation realm");
  assert(realmsDict.economic_realm !== undefined || realmsDict.economy !== undefined, "realm-map includes economic realm");
  assert(realmsDict.identity_realm !== undefined || realmsDict.identity !== undefined, "realm-map includes identity realm");

  // 5.3 GET /api/dependency-graph
  const depRes = await makeRequest(`${REST_URL}/api/dependency-graph`);
  assert(depRes.status === 200, "GET /api/dependency-graph returns HTTP 200");
  assert(depRes.json !== null, "GET /api/dependency-graph returns valid JSON");
  assert(depRes.json.nodes !== undefined || depRes.json.dependencies !== undefined || depRes.json.graph !== undefined, "dependency-graph contains graph nodes or dependencies");

  // 5.4 GET /api/syndicates
  const synRes = await makeRequest(`${REST_URL}/api/syndicates`);
  assert(synRes.status === 200, "GET /api/syndicates returns HTTP 200");
  assert(Array.isArray(synRes.json?.syndicates), "GET /api/syndicates returns syndicates array");
  assert(synRes.json?.syndicates.length === 4, "GET /api/syndicates lists all 4 syndicates");
  assert(synRes.json?.xpBonusMultiplier === 1.15, "GET /api/syndicates lists +15% XP multiplier (1.15)");

  // 5.5 GET /api/ledger
  const ledgerRes = await makeRequest(`${REST_URL}/api/ledger`);
  assert(ledgerRes.status === 200, "GET /api/ledger returns HTTP 200");
  assert(typeof ledgerRes.json?.height === "number", "GET /api/ledger reports numeric height");
  assert(ledgerRes.json?.valid === true, "GET /api/ledger reports valid: true");

  // =========================================================================
  // Section 6: Cross-Realm Event Bus & Live Propagation
  // =========================================================================
  console.log("\n[6/6] Testing Cross-Realm Event Bus Syndicate & Ledger Signals...");

  let capturedSyndicateEvent = null;
  let capturedLedgerEvent = null;

  const syndicateListener = (evt) => { capturedSyndicateEvent = evt; };
  const ledgerListener = (evt) => { capturedLedgerEvent = evt; };

  eventBus.on("SYNDICATE_YIELD_ROUTED", syndicateListener);
  eventBus.on("LEDGER_BLOCK_COMMITTED", ledgerListener);

  const testYieldCycle = await moneyPlugPipeline.runAutonomousCycle();

  assert(capturedSyndicateEvent !== null, "SYNDICATE_YIELD_ROUTED event broadcasted on EventBus");
  assert(capturedSyndicateEvent?.xpBonusMultiplier === 1.15, "Captured syndicate event reflects 1.15x multiplier");
  assert(capturedLedgerEvent !== null, "LEDGER_BLOCK_COMMITTED event broadcasted on EventBus");
  assert(capturedLedgerEvent?.hash.length === 64, "Captured ledger event contains 64-char SHA-256 hash");

  eventBus.off("SYNDICATE_YIELD_ROUTED", syndicateListener);
  eventBus.off("LEDGER_BLOCK_COMMITTED", ledgerListener);

  // Summary & Reporting
  console.log("\n" + "=".repeat(80));
  console.log(`MILESTONE 3 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log("=".repeat(80));

  if (failed === 0) {
    console.log("🌟 ALL MILESTONE 3 & M2 REMEDIATION CHECKS PASSED WITH 100% SUCCESS! 🌟\n");
  } else {
    console.error(`❌ ${failed} CHECKS FAILED!\n`);
  }

  return {
    milestone: "M3",
    name: "Autonomous Syndicates, Osmium Ledger & 12s Monetization Loop",
    passed,
    failed,
    total: passed + failed,
    success: failed === 0,
    results: testResults
  };
}

export { runMilestone3Verification };

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith("m3-verification.js")) {
  runMilestone3Verification().then((res) => {
    process.exit(res.success ? 0 : 1);
  }).catch((err) => {
    console.error("M3 Verification execution error:", err);
    process.exit(1);
  });
}
