/**
 * ============================================================================
 * PRIMORDIAOS TIER 5 ADVERSARIAL COVERAGE HARDENING & CHAOS SUITE
 * ============================================================================
 * 
 * Comprehensive Empirical Stress & Chaos Harness:
 * 1. High-Concurrency Pulse Triggers (Rapid concurrent POST /api/trigger-pulse
 *    bursts verifying mutex queue serialization and zero hash collisions).
 * 2. Osmium Ledger Tamper Fuzzing (Corruption injection, verifyChain() integrity,
 *    tamper alert telemetry).
 * 3. WebSocket Disconnection Storms & Malformed JSON Fuzzing on Port 17800
 *    (Zero server crash guarantee under adversarial load).
 * 4. Multi-Subscriber SSE Telemetry Fanout (Heavy event broadcasting across
 *    multiple concurrent subscribers with zero packet loss).
 * 5. ANTIGRAV() Sovereignty Audit Engine Anti-Collapse Verification
 *    (Detection and veto of low-friction loops, mock data, sovereignty bypasses).
 */

import http from "node:http";
import WebSocket from "ws";
import { bootPrimordiaOS } from "../PrimordiaOS/kernel/bootstrap.js";
import { spine } from "../PrimordiaOS/kernel/spine.js";
import { restServer, RestServer } from "../PrimordiaOS/interfaces/rest-server.js";
import { simulationWsServer, SimulationWebSocketServer } from "../PrimordiaOS/simulation/websocket-server.js";
import { eventBus } from "../PrimordiaOS/kernel/event-bus.js";
import { stateBus } from "../PrimordiaOS/kernel/state-bus.js";
import { osmiumLedger, OsmiumLedgerAdapter } from "../PrimordiaOS/realms/identity/osmium-ledger.js";
import { moneyPlugPipeline } from "../PrimordiaOS/pipelines/moneyplug-pipeline.js";
import { antigravGuardian } from "../PrimordiaOS/agents/antigrav-guardian.js";
import { unrealBridge } from "../PrimordiaOS/realms/simulation/unreal-bridge.js";

const REST_PORT = 3000;
const WS_PORT = 17800;
const REST_URL = `http://localhost:${REST_PORT}`;
const WS_URL = `ws://localhost:${WS_PORT}`;

function makeHttpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    try {
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
    } catch (err) {
      reject(err);
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runTier5AdversarialHardeningSuite() {
  console.log("================================================================================");
  console.log("   PRIMORDIAOS TIER 5: ADVERSARIAL COVERAGE HARDENING & CHAOS HARNESS           ");
  console.log("================================================================================");

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  function assert(condition, testName, details = "") {
    results.total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      results.passed++;
      results.tests.push({ name: testName, status: "PASS", details });
    } else {
      console.error(`  ✗ [FAIL] ${testName} ${details ? `(${details})` : ""}`);
      results.failed++;
      results.tests.push({ name: testName, status: "FAIL", details });
    }
  }

  // ---------------------------------------------------------------------------
  // 0. Bootstrap Master Spine Kernel
  // ---------------------------------------------------------------------------
  console.log("\n[SETUP] Initializing PrimordiaOS Master Spine Kernel & Network Ports...");
  await bootPrimordiaOS();
  assert(spine.booted === true, "Master Spine booted state confirmed (Port 3000 & Port 17800 active)");

  // ---------------------------------------------------------------------------
  // SECTION 1: High-Concurrency Pulse Triggers (Mutex Serialization & Hash Collisions)
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 1] Probing High-Concurrency Pulse Triggers & Mutex Serialization...");
  const CONCURRENT_PULSE_COUNT = 15;
  const initialLedgerHeight = osmiumLedger.chain.length;
  const initialCycleCount = moneyPlugPipeline.cycleCount;

  console.log(`  -> Firing ${CONCURRENT_PULSE_COUNT} simultaneous POST /api/trigger-pulse requests...`);
  const pulsePromises = [];
  for (let i = 0; i < CONCURRENT_PULSE_COUNT; i++) {
    pulsePromises.push(makeHttpRequest(`${REST_URL}/api/trigger-pulse`, { method: "POST" }));
  }

  const pulseResponses = await Promise.all(pulsePromises);

  // 1.1 Verify all HTTP responses returned 200
  const allHttp200 = pulseResponses.every(r => r.status === 200 && r.json?.status === "pulsed");
  assert(allHttp200, `All ${CONCURRENT_PULSE_COUNT} concurrent pulse requests resolved HTTP 200 with status: 'pulsed'`);

  // 1.2 Verify strictly monotonic cycle progression
  const cycleNumbers = pulseResponses.map(r => r.json?.result?.cycle).filter(Boolean);
  assert(cycleNumbers.length === CONCURRENT_PULSE_COUNT, `Extracted ${CONCURRENT_PULSE_COUNT} valid cycle numbers from response payloads`);
  
  const sortedCycles = [...cycleNumbers].sort((a, b) => a - b);
  let isStrictlySequential = true;
  for (let i = 1; i < sortedCycles.length; i++) {
    if (sortedCycles[i] !== sortedCycles[i - 1] + 1) {
      isStrictlySequential = false;
      break;
    }
  }
  assert(isStrictlySequential, `Cycle numbers increment strictly monotonically without duplicates (${sortedCycles[0]} -> ${sortedCycles[sortedCycles.length - 1]})`);

  // 1.3 Verify zero hash collisions in ledger blocks committed during the burst
  const committedHashes = pulseResponses.map(r => r.json?.result?.ledgerBlock?.hash).filter(Boolean);
  const uniqueHashes = new Set(committedHashes);
  assert(uniqueHashes.size === CONCURRENT_PULSE_COUNT, `Zero SHA-256 hash collisions across ${CONCURRENT_PULSE_COUNT} concurrent pulse commits (${uniqueHashes.size} unique hashes)`);

  // 1.4 Verify all 7 autonomous steps executed for every concurrent pulse
  const allStepsComplete = pulseResponses.every(r => {
    const res = r.json?.result;
    return (
      res?.schemaInspection !== undefined &&
      res?.diff !== undefined &&
      res?.ledgerBlock !== undefined &&
      typeof res?.commentary === "string" &&
      res?.voicePayload !== undefined &&
      res?.hudPayload !== undefined &&
      res?.yieldPayload?.success === true
    );
  });
  assert(allStepsComplete, `All ${CONCURRENT_PULSE_COUNT} concurrent pulses completed all 7 autonomous steps with full fidelity`);

  // 1.5 Verify overall Osmium ledger integrity
  const isChainValidAfterBurst = osmiumLedger.verifyChain();
  assert(isChainValidAfterBurst, `Osmium ledger verifyChain() returns true across complete chain of ${osmiumLedger.chain.length} blocks`);

  // ---------------------------------------------------------------------------
  // SECTION 2: Osmium Ledger Tamper Fuzzing & Security Telemetry
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 2] Probing Osmium Ledger Tamper Fuzzing & Security Telemetry...");
  const fuzzerLedger = new OsmiumLedgerAdapter();
  for (let i = 0; i < 5; i++) {
    fuzzerLedger.appendBlock(`BLOCK_STAGE_${i}`, { nonce: i, timestamp: Date.now() + i });
  }
  assert(fuzzerLedger.verifyChain() === true, "Baseline test ledger with 6 blocks (genesis + 5) verified valid");

  // 2.1 Tamper Vector 1: Corrupt previousHash in intermediate block
  const originalPrevHash = fuzzerLedger.chain[3].previousHash;
  fuzzerLedger.chain[3].previousHash = "0xdeadbeefbadf00d0000000000000000000000000000000000000000000000000";
  assert(fuzzerLedger.verifyChain() === false, "verifyChain() immediately catches corrupted previousHash at Block 3");
  fuzzerLedger.chain[3].previousHash = originalPrevHash; // restore
  assert(fuzzerLedger.verifyChain() === true, "Ledger returns to valid state upon restoring previousHash");

  // 2.2 Tamper Vector 2: Alter block payload / data without recomputing hash
  const originalPayload = { ...fuzzerLedger.chain[2].data };
  fuzzerLedger.chain[2].data.unauthorized_yield_drain = 999999;
  assert(fuzzerLedger.verifyChain() === false, "verifyChain() immediately catches altered block payload at Block 2");
  fuzzerLedger.chain[2].data = originalPayload; // restore
  assert(fuzzerLedger.verifyChain() === true, "Ledger returns to valid state upon restoring payload");

  // 2.3 Tamper Vector 3: Swap adjacent blocks (Index / Hash Order Tampering)
  const tempBlock = fuzzerLedger.chain[1];
  fuzzerLedger.chain[1] = fuzzerLedger.chain[2];
  fuzzerLedger.chain[2] = tempBlock;
  assert(fuzzerLedger.verifyChain() === false, "verifyChain() immediately catches transposed/swapped blocks");
  fuzzerLedger.chain[2] = fuzzerLedger.chain[1];
  fuzzerLedger.chain[1] = tempBlock; // restore
  assert(fuzzerLedger.verifyChain() === true, "Ledger returns to valid state upon restoring block order");

  // 2.4 Tamper Vector 4: Genesis Block tampering
  fuzzerLedger.chain[0].previousHash = "1111111111111111111111111111111111111111111111111111111111111111";
  assert(fuzzerLedger.verifyChain() === false, "verifyChain() catches non-zero Genesis previousHash");
  fuzzerLedger.chain[0].previousHash = "0000000000000000000000000000000000000000000000000000000000000000";

  // 2.5 Security Telemetry Alert Dispatch & Event History Recording
  const securityAlertEvent = {
    type: "SECURITY_INTEGRITY_ALERT",
    level: "CRITICAL",
    realm: "identity_realm",
    details: "Adversarial block hash mismatch detected during continuous Osmium verification",
    tamperedBlockIndex: 3,
    timestamp: Date.now()
  };
  eventBus.emitRealmEvent("SECURITY_INTEGRITY_ALERT", securityAlertEvent, "identity_realm");
  eventBus.emit("SECURITY_INTEGRITY_ALERT", securityAlertEvent);

  const recentSecurityEvents = eventBus.getRecentEvents("identity_realm", 10);
  const foundAlert = recentSecurityEvents.some(e => e.name === "SECURITY_INTEGRITY_ALERT" && e.payload?.level === "CRITICAL");
  assert(foundAlert, "SECURITY_INTEGRITY_ALERT event successfully recorded in Identity Realm event audit history");

  // ---------------------------------------------------------------------------
  // SECTION 3: WebSocket Disconnection Storms & Malformed JSON Fuzzing on Port 17800
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 3] Probing WebSocket Disconnection Storms & Malformed JSON Fuzzing on Port 17800...");

  // 3.1 Disconnection Storm (40 rapid parallel connect-disconnect cycles)
  const STORM_COUNT = 40;
  let stormSuccesses = 0;
  let stormErrors = 0;

  console.log(`  -> Firing ${STORM_COUNT} rapid parallel WebSocket connect-disconnect storm cycles...`);
  const stormPromises = [];
  for (let s = 0; s < STORM_COUNT; s++) {
    const cycle = new Promise((resolveCycle) => {
      const ws = new WebSocket(WS_URL);
      ws.on("open", () => {
        stormSuccesses++;
        if (s % 2 === 0) {
          ws.send(JSON.stringify({ type: "UNREAL_PLAY_STARTED", engine: "UE5-StormProbe" }));
        } else {
          ws.send(JSON.stringify({ type: "get_telemetry" }));
        }
        setTimeout(() => {
          try { ws.close(); } catch {}
          resolveCycle();
        }, 10);
      });
      ws.on("error", () => {
        stormErrors++;
        resolveCycle();
      });
    });
    stormPromises.push(cycle);
  }

  await Promise.all(stormPromises);
  assert(stormSuccesses === STORM_COUNT, `Completed ${STORM_COUNT} rapid WebSocket connect/disconnect cycles (${stormSuccesses} connected)`);
  assert(stormErrors === 0, `Zero socket error crashes during ${STORM_COUNT} parallel connection storm`);

  // 3.2 Malformed JSON Fuzzing Storm
  console.log("  -> Injecting malformed, adversarial, and non-JSON frames on Port 17800...");
  const fuzzClient = new WebSocket(WS_URL);
  await new Promise((resolve) => fuzzClient.on("open", resolve));

  const fuzzPayloads = [
    "GARBAGE_TEXT_NOT_JSON_!@#$%^&*()",
    "{ unclosed_json_brace: true",
    `{"type": "OVERSIZED_CHUNK", "payload": "${"Z".repeat(250000)}"}`,
    JSON.stringify({ type: null, data: undefined }),
    JSON.stringify({ type: "UNREAL_PLAY_STARTED", params: { intensity: "NOT_A_NUMBER", cosmic_color: 12345 } }),
    JSON.stringify({ __proto__: { admin: true }, constructor: { prototype: { poll: true } } }),
    "[1, 2, 3, 4, 5, 6, 7]",
    "null",
    "true",
    "42"
  ];

  for (const p of fuzzPayloads) {
    fuzzClient.send(p);
  }
  await sleep(100);

  assert(fuzzClient.readyState === WebSocket.OPEN, "Port 17800 WebSocket server survived all malformed fuzz frames without crashing");
  fuzzClient.close();
  await sleep(50);

  // 3.3 Verify Server Post-Fuzz Responsiveness
  const probeClient = new WebSocket(WS_URL);
  let rpcResponded = false;
  await new Promise((resolve) => {
    probeClient.on("open", () => {
      probeClient.send(JSON.stringify({
        type: "UNREAL_PLAY_STARTED",
        engine: "UnrealEngine 5.8",
        status: "POST_FUZZ_VERIFICATION",
        params: { intensity: 3.5, cosmic_color: "#00ffcc" }
      }));
    });
    probeClient.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "BIG_BANG_TRIGGER") {
          rpcResponded = true;
          assert(msg.payload?.genesis === true, "Post-fuzz RPC returns valid BIG_BANG_TRIGGER response");
          assert(msg.payload?.singularity_intensity === 3.5, "Post-fuzz RPC preserves custom parameter fidelity (3.5)");
          assert(msg.payload?.cosmic_color === "#00ffcc", "Post-fuzz RPC preserves custom cosmic color (#00ffcc)");
          probeClient.close();
          resolve();
        }
      } catch {}
    });
    setTimeout(() => {
      if (!rpcResponded) assert(false, "Timeout waiting for post-fuzz BIG_BANG_TRIGGER response");
      try { probeClient.close(); } catch {}
      resolve();
    }, 3000);
  });

  // ---------------------------------------------------------------------------
  // SECTION 4: Multi-Subscriber SSE Telemetry Fanout Under Heavy Event Broadcasting
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 4] Probing Multi-Subscriber SSE Telemetry Fanout Under Heavy Broadcasting...");
  const SSE_CLIENTS_COUNT = 5;
  const ssePacketsCount = new Array(SSE_CLIENTS_COUNT).fill(0);
  const sseStreams = [];

  for (let s = 0; s < SSE_CLIENTS_COUNT; s++) {
    const sIdx = s;
    const req = http.request({
      hostname: "localhost",
      port: REST_PORT,
      path: "/api/stream",
      headers: { Accept: "text/event-stream" }
    }, (res) => {
      assert(res.statusCode === 200, `SSE Subscriber ${sIdx + 1} connected (HTTP 200)`);
      let buf = "";
      res.on("data", (chunk) => {
        buf += chunk.toString();
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const p of parts) {
          if (p.trim().startsWith("data:")) {
            ssePacketsCount[sIdx]++;
          }
        }
      });
    });
    req.on("error", () => {});
    req.end();
    sseStreams.push(req);
  }

  await sleep(150); // Allow all SSE subscribers to establish

  // Broadcast 40 high-frequency events across multiple realms
  const NUM_FANOUT_EVENTS = 40;
  console.log(`  -> Emitting ${NUM_FANOUT_EVENTS} cross-realm broadcast events across all ${SSE_CLIENTS_COUNT} subscribers...`);
  for (let e = 0; e < NUM_FANOUT_EVENTS; e++) {
    const realm = ["local_realm", "cloud_realm", "simulation_realm", "economic_realm", "identity_realm"][e % 5];
    eventBus.emitRealmEvent(`FANOUT_BURST_EVENT_${e}`, {
      sequence: e,
      realm,
      unicode_sigil: "🌌 ⚡ 龙 100%",
      payload_size: e * 50,
      timestamp: Date.now()
    }, realm);
    await sleep(5);
  }

  await sleep(300); // Allow SSE streams to flush buffers

  // Verify zero packet loss across all connected subscribers
  for (let s = 0; s < SSE_CLIENTS_COUNT; s++) {
    assert(
      ssePacketsCount[s] >= NUM_FANOUT_EVENTS,
      `SSE Subscriber ${s + 1} received ${ssePacketsCount[s]} packets (>= ${NUM_FANOUT_EVENTS} broadcast events, zero drops)`
    );
  }

  // Churn test: Abruptly disconnect 2 subscribers and emit 10 more events
  console.log("  -> Abruptly disconnecting 2 subscribers and broadcasting 10 additional events...");
  sseStreams[0].destroy();
  sseStreams[1].destroy();
  await sleep(50);

  for (let e = 0; e < 10; e++) {
    eventBus.emitRealmEvent("POST_CHURN_EVENT", { index: e }, "local_realm");
  }
  await sleep(150);

  assert(ssePacketsCount[2] >= NUM_FANOUT_EVENTS + 10, `Active Subscriber 3 received post-churn events without disruption (${ssePacketsCount[2]} packets)`);
  assert(ssePacketsCount[3] >= NUM_FANOUT_EVENTS + 10, `Active Subscriber 4 received post-churn events without disruption (${ssePacketsCount[3]} packets)`);
  assert(ssePacketsCount[4] >= NUM_FANOUT_EVENTS + 10, `Active Subscriber 5 received post-churn events without disruption (${ssePacketsCount[4]} packets)`);

  // Clean up remaining SSE subscribers
  for (let s = 2; s < SSE_CLIENTS_COUNT; s++) {
    try { sseStreams[s].destroy(); } catch {}
  }
  await sleep(50);

  // ---------------------------------------------------------------------------
  // SECTION 5: ANTIGRAV() Audit Engine Against Simulated Anti-Collapse Violations
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 5] Probing ANTIGRAV() Audit Engine Against Simulated Anti-Collapse Violations...");

  // 5.1 Violation 1: Unconstrained Infinite Loop
  const infiniteLoopCode = `
    function runRapidPostingEngine() {
      while (true) {
        postToSocialMedia();
      }
    }
  `;
  const infiniteLoopReport = antigravGuardian.evaluateCode(infiniteLoopCode, "infinite_loop_probe.js");
  assert(infiniteLoopReport.passed === false, "ANTIGRAV() vetoed unconstrained infinite loop");
  assert(infiniteLoopReport.flags.includes("UNCONSTRAINED_INFINITE_LOOP"), "ANTIGRAV() flagged UNCONSTRAINED_INFINITE_LOOP");
  assert(infiniteLoopReport.metrics.friction <= 20, `Friction penalized to ${infiniteLoopReport.metrics.friction}/100`);

  // 5.2 Violation 2: Forbidden Mock Data Arrays
  const mockDataCode = `
    const mockData = [
      { id: 1, revenue: 10000, engagement: 95.4 },
      { id: 2, revenue: 20000, engagement: 98.1 }
    ];
    export function getMetrics() { return mockData; }
  `;
  const mockDataReport = antigravGuardian.evaluateCode(mockDataCode, "mock_data_probe.js");
  assert(mockDataReport.passed === false, "ANTIGRAV() vetoed forbidden mock data array");
  assert(mockDataReport.flags.includes("FORBIDDEN_MOCK_DATA"), "ANTIGRAV() flagged FORBIDDEN_MOCK_DATA");
  assert(mockDataReport.metrics.sovereignty <= 60, `Sovereignty penalized to ${mockDataReport.metrics.sovereignty}/100`);

  // 5.3 Violation 3: Hardcoded Numeric Metric Literals
  const hardcodedMetricCode = `
    export function getProductionMetrics() {
      return { rpm: 12.5, status: "hardcoded_numeric_literals_as_metrics" };
    }
  `;
  const hardcodedReport = antigravGuardian.evaluateCode(hardcodedMetricCode, "hardcoded_probe.js");
  assert(hardcodedReport.passed === false, "ANTIGRAV() vetoed hardcoded metric literals");
  assert(hardcodedReport.flags.includes("HARDCODED_METRIC_LITERAL"), "ANTIGRAV() flagged HARDCODED_METRIC_LITERAL");

  // 5.4 Violation 4: Passive Generic Template Collapse
  const templateCollapseText = `
    <div class="generic-template-fill">
      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      TODO: implement later when anyone cares.
    </div>
  `;
  const templateReport = antigravGuardian.audit(templateCollapseText);
  assert(templateReport.flags.includes("GENERIC_TEMPLATE_COLLAPSE"), "ANTIGRAV() flagged GENERIC_TEMPLATE_COLLAPSE");
  assert(templateReport.metrics.uniqueness <= 55, `Uniqueness penalized to ${templateReport.metrics.uniqueness}/100`);

  // 5.5 Violation 5: Tier 0 Sovereignty Bypass Attempt
  const sovereigntyBypassCode = `
    const bypassTier0 = true;
    function executeAutonomousDeploy() {
      overrideHumanSovereign();
      disableSovereignVeto = true;
    }
  `;
  const bypassReport = antigravGuardian.evaluateCode(sovereigntyBypassCode, "bypass_probe.js");
  assert(bypassReport.passed === false, "ANTIGRAV() vetoed Tier 0 Sovereignty Bypass attempt");
  assert(bypassReport.flags.includes("SOVEREIGNTY_BYPASS_ATTEMPT"), "ANTIGRAV() flagged SOVEREIGNTY_BYPASS_ATTEMPT");
  assert(bypassReport.metrics.sovereignty <= 20, `Sovereignty dropped to ${bypassReport.metrics.sovereignty}/100 (Absolute Veto)`);
  assert(bypassReport.requiredActions.length > 0, "Required actions generated to restore Tier 0 authority");

  // 5.6 Sovereign Compliant Artifact Verification
  const sovereignCode = `
    import { osmiumLedger } from "./osmium-ledger.js";
    import { humanSovereign } from "./sovereign.js";

    export class SovereignYieldDistributor {
      async distribute(cycleData) {
        if (!humanSovereign.hasApproved()) {
          throw new Error("Tier 0 approval required for yield adjustment.");
        }
        const block = await osmiumLedger.appendBlock("SYNDICATE_YIELD", cycleData);
        return { blockHash: block.hash, verified: true };
      }
    }
  `;
  const sovereignReport = antigravGuardian.evaluateCode(sovereignCode, "sovereign_distributor.js");
  assert(sovereignReport.passed === true, "ANTIGRAV() approved sovereign compliant artifact");
  assert(sovereignReport.score >= 70, `Sovereign score ${sovereignReport.score} >= threshold 70`);
  assert(sovereignReport.flags.length === 0, "Zero collapse flags on sovereign compliant artifact");

  // ---------------------------------------------------------------------------
  // Summary & Final Verdict
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(80));
  console.log(`TIER 5 ADVERSARIAL STRESS RESULTS: ${results.passed} PASSED, ${results.failed} FAILED (Total: ${results.total})`);
  console.log("=".repeat(80));

  const verdict = results.failed === 0 ? "APPROVE" : "REQUEST_CHANGES";
  console.log(`\nFINAL CHALLENGER VERDICT: >>> ${verdict} <<< \n`);

  return {
    suite: "Tier 5 Adversarial Coverage Hardening",
    verdict,
    passed: results.passed,
    failed: results.failed,
    total: results.total,
    success: results.failed === 0,
    tests: results.tests
  };
}

if (process.argv[1] && process.argv[1].endsWith("tier5-adversarial-hardening.js")) {
  runTier5AdversarialHardeningSuite().then((res) => {
    process.exit(res.success ? 0 : 1);
  }).catch((err) => {
    console.error("Tier 5 Adversarial Hardening Fatal Error:", err);
    process.exit(1);
  });
}
