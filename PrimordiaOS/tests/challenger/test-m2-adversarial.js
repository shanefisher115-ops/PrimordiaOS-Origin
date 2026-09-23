import http from "node:http";
import WebSocket from "ws";
import { bootPrimordiaOS } from "../../PrimordiaOS/kernel/bootstrap.js";
import { spine } from "../../PrimordiaOS/kernel/spine.js";
import { restServer, RestServer } from "../../PrimordiaOS/interfaces/rest-server.js";
import { simulationWsServer } from "../../PrimordiaOS/simulation/websocket-server.js";
import { eventBus } from "../../PrimordiaOS/kernel/event-bus.js";
import { stateBus } from "../../PrimordiaOS/kernel/state-bus.js";
import { localRuntime, LocalRealmRuntime } from "../../PrimordiaOS/realms/local/runtime.js";
import { TermuxVessel } from "../../PrimordiaOS/vessels/termux-vessel.js";
import { CloudflareGatewayAdapter, CircuitBreaker } from "../../PrimordiaOS/realms/cloud/cloudflare-gateway.js";
import { niagaraStream } from "../../PrimordiaOS/realms/simulation/niagara-stream.js";
import { unrealPipeline } from "../../PrimordiaOS/pipelines/unreal-pipeline.js";

function makeRequest(url, options = {}) {
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

export async function runChallengerM2Suite() {
  console.log("================================================================================");
  console.log("    PRIMORDIAOS CHALLENGER 1: ADVERSARIAL STRESS HARNESS (MILESTONE 2)          ");
  console.log(" (Boundary Telemetry, Concurrent Remote CLI & AI Gateway Circuit Breakers)     ");
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
      console.error(`  ✗ [FAIL] ${testName} - Details: ${details}`);
      results.failed++;
      results.tests.push({ name: testName, status: "FAIL", details });
    }
  }

  const REST_PORT = 3000;
  const BASE_HTTP = `http://localhost:${REST_PORT}`;

  // Ensure system is booted
  const bootStatus = await bootPrimordiaOS();
  assert(bootStatus.booted === true, "Kernel boot initialized successfully");

  // ============================================================================
  // PROBE 1: Termux Mobile Telemetry Boundary & Malformed Sensor Data Probes
  // ============================================================================
  console.log("\n⚡ [PROBE 1/3] Stress-Testing Termux Mobile Telemetry Boundary Values & Malformations...");

  try {
    // 1.1 Boundary Battery: 0% critically depleted
    const b0Res = await makeRequest(`${BASE_HTTP}/api/telemetry/mobile`, {
      method: "POST",
      body: { vesselId: "termux-node-001", battery: 0 }
    });
    assert(b0Res.status === 200, "Probe 1.1: POST /api/telemetry/mobile with 0% battery returns HTTP 200");
    assert(b0Res.json?.telemetry?.battery === 0, "Probe 1.1: 0% battery is preserved exactly and not treated as falsy/defaulted", `Actual: ${b0Res.json?.telemetry?.battery}`);
    assert(b0Res.json?.vessel === "termux-node-001", "Probe 1.1: Custom vessel ID respected");

    // 1.2 Boundary Battery: 100% full capacity
    const b100Res = await makeRequest(`${BASE_HTTP}/api/telemetry/mobile`, {
      method: "POST",
      body: { vesselId: "termux-node-001", battery: 100 }
    });
    assert(b100Res.status === 200, "Probe 1.2: POST /api/telemetry/mobile with 100% battery returns HTTP 200");
    assert(b100Res.json?.telemetry?.battery === 100, "Probe 1.2: 100% battery recorded accurately");

    // 1.3 Boundary Battery: Negative, overflow, and float values
    const bExtremeRes = await makeRequest(`${BASE_HTTP}/api/telemetry/mobile`, {
      method: "POST",
      body: { vesselId: "termux-node-001", battery: -15.5 }
    });
    assert(bExtremeRes.status === 200, "Probe 1.3: Negative float battery (-15.5%) handled gracefully");
    assert(bExtremeRes.json?.telemetry?.battery === -15.5, "Probe 1.3: Negative float battery ingested accurately");

    const bOverflowRes = await makeRequest(`${BASE_HTTP}/api/telemetry/mobile`, {
      method: "POST",
      body: { vesselId: "termux-node-001", battery: 9999 }
    });
    assert(bOverflowRes.status === 200, "Probe 1.4: Overflow battery (9999%) returns HTTP 200 without throwing");

    // 1.4 Battery Object variant (e.g. Android BatteryManager dict)
    const bObjRes = await makeRequest(`${BASE_HTTP}/api/telemetry/mobile`, {
      method: "POST",
      body: {
        vesselId: "termux-node-001",
        battery: { percentage: 42, plugged: "AC", temperature: 38.5, health: "GOOD" }
      }
    });
    assert(bObjRes.status === 200, "Probe 1.5: Complex battery object structure ingested successfully");
    assert(bObjRes.json?.telemetry?.battery?.percentage === 42, "Probe 1.5: Battery object percentage extracted accurately");

    // 1.5 High Thermal Load & Extreme Throttling Strings/Numbers
    const thermalValues = [
      "optimal",
      "moderate",
      "severe_thermal_throttling",
      "critical_shutdown_imminent_105C",
      105.4,
      null,
      ""
    ];
    let thermalAll200 = true;
    for (const tv of thermalValues) {
      const tRes = await makeRequest(`${BASE_HTTP}/api/telemetry/mobile`, {
        method: "POST",
        body: { vesselId: "termux-thermal-stress", thermal: tv }
      });
      if (tRes.status !== 200 || !tRes.json?.success) {
        thermalAll200 = false;
      }
    }
    assert(thermalAll200, "Probe 1.6: All thermal load states (strings, extreme temperatures, null, empty) return HTTP 200");

    // 1.6 Missing Fields / Completely Sparse Payloads
    const emptyPayloadRes = await makeRequest(`${BASE_HTTP}/api/telemetry/mobile`, {
      method: "POST",
      body: {}
    });
    assert(emptyPayloadRes.status === 200, "Probe 1.7: Empty JSON body '{}' handled gracefully with sane defaults");
    assert(emptyPayloadRes.json?.telemetry?.vesselId === "vessel-termux-android", "Probe 1.7: Default vessel ID assigned when omitted");
    assert(emptyPayloadRes.json?.telemetry?.battery !== undefined, "Probe 1.7: Default battery applied on sparse packet");
    assert(emptyPayloadRes.json?.telemetry?.gps !== undefined, "Probe 1.7: Default GPS coordinates applied on sparse packet");

    // 1.7 Malformed GPS Probes (string GPS, NaN coordinates, out-of-range bounds, null, array)
    const malformedGpsCases = [
      { gps: "37.7749,-122.4194" },
      { gps: { latitude: "NaN", longitude: "undefined", accuracy: -1 } },
      { gps: { latitude: 9999.99, longitude: -8888.88 } },
      { gps: null },
      { gps: [37.7749, -122.4194] }
    ];
    let gpsAllHandled = true;
    for (const [idx, c] of malformedGpsCases.entries()) {
      const gRes = await makeRequest(`${BASE_HTTP}/api/telemetry/mobile`, {
        method: "POST",
        body: { vesselId: `termux-gps-${idx}`, ...c }
      });
      if (gRes.status !== 200 || !gRes.json?.success) {
        gpsAllHandled = false;
      }
    }
    assert(gpsAllHandled, "Probe 1.8: 5 malformed/boundary GPS structures ingested without unhandled exceptions");

    // 1.8 Direct LocalRealmRuntime Method Ingestion Boundary Check
    const directRuntime = new LocalRealmRuntime();
    const directSparse = directRuntime.ingestMobileTelemetry(null);
    assert(directSparse.success === true, "Probe 1.9: localRuntime.ingestMobileTelemetry(null) returns success with defaults");
    assert(directSparse.packet.vesselId === "vessel-termux-android", "Probe 1.9: Null parameter defaults vesselId cleanly");

    // 1.9 EventBus Emission Propagation Under High-Frequency Burst
    let burstEventCount = 0;
    const burstListener = () => { burstEventCount++; };
    eventBus.on("MOBILE_TELEMETRY_INGEST", burstListener);

    const burstPromises = [];
    for (let i = 0; i < 50; i++) {
      burstPromises.push(makeRequest(`${BASE_HTTP}/api/telemetry/mobile`, {
        method: "POST",
        body: { vesselId: `termux-burst-${i % 5}`, battery: i, seq: i }
      }));
    }
    const burstResults = await Promise.all(burstPromises);
    const allBurst200 = burstResults.every(r => r.status === 200 && r.json?.success === true);
    assert(allBurst200, "Probe 1.10: 50 concurrent high-frequency mobile telemetry packets all return HTTP 200");
    assert(burstEventCount >= 50, `Probe 1.11: EventBus received all 50 MOBILE_TELEMETRY_INGEST events (${burstEventCount})`);
    eventBus.off("MOBILE_TELEMETRY_INGEST", burstListener);

  } catch (err) {
    assert(false, "Probe 1 Failure: Unexpected error during mobile telemetry stress test", err.message);
  }

  // ============================================================================
  // PROBE 2: Remote Sovereign CLI Execution Concurrency & Malformed Invocations
  // ============================================================================
  console.log("\n⚡ [PROBE 2/3] Stress-Testing Remote Sovereign CLI Execution with Concurrent & Invalid Commands...");

  try {
    // 2.1 Concurrent Valid Commands (20 parallel requests mixing all 4 commands)
    const validCommands = ["status", "antigrav", "bigbang", "pulse"];
    const concurrentValidPromises = [];
    for (let i = 0; i < 20; i++) {
      const cmd = validCommands[i % validCommands.length];
      concurrentValidPromises.push(makeRequest(`${BASE_HTTP}/api/cli/execute`, {
        method: "POST",
        body: { command: cmd, vessel: `vessel-termux-worker-${i}`, args: { iteration: i } }
      }));
    }

    const concurrentValidResults = await Promise.all(concurrentValidPromises);
    const allValid200 = concurrentValidResults.every(r => r.status === 200 && r.json?.success === true);
    assert(allValid200, "Probe 2.1: 20 concurrent valid CLI commands ('status', 'antigrav', 'bigbang', 'pulse') all succeed (HTTP 200)");

    // Verify response structure and execution time tracking
    const sampleRes = concurrentValidResults[0].json;
    assert(typeof sampleRes.execution_time_ms === "number", "Probe 2.2: CLI response tracks execution_time_ms");
    assert(typeof sampleRes.timestamp === "number", "Probe 2.2: CLI response includes unix timestamp");
    assert(sampleRes.command === "status", "Probe 2.2: CLI response mirrors requested command");

    // 2.2 Adversarial & Invalid Commands Handling
    const adversarialCommands = [
      "rm -rf /",
      "DROP TABLE osmium_ledger;",
      "eval(process.exit(1))",
      "<script>alert(1)</script>",
      "",
      "   ",
      null,
      undefined,
      "⚡🚀SOVEREIGN_CHAOS_TRIGGER⚡",
      "a".repeat(2048) // 2KB command string
    ];

    let allAdversarialHandled = true;
    for (const [idx, badCmd] of adversarialCommands.entries()) {
      const badRes = await makeRequest(`${BASE_HTTP}/api/cli/execute`, {
        method: "POST",
        body: { command: badCmd, vessel: `vessel-adversary-${idx}` }
      });

      if (badRes.status !== 200 || !badRes.json?.success || !badRes.json?.result?.available_commands) {
        allAdversarialHandled = false;
      }
    }
    assert(allAdversarialHandled, "Probe 2.3: All 10 adversarial, blank, injection, and oversized CLI commands gracefully default with available_commands list");

    // 2.3 Malformed Argument Payloads (null, boolean, nested objects, non-JSON body)
    const malformedArgCases = [
      { command: "status", args: null },
      { command: "antigrav", args: "string_args", options: true },
      { command: "bigbang", args: [1, 2, 3] },
      { command: "pulse", args: { deeply: { nested: { payload: true } } } }
    ];

    let allArgsHandled = true;
    for (const ac of malformedArgCases) {
      const res = await makeRequest(`${BASE_HTTP}/api/cli/execute`, {
        method: "POST",
        body: ac
      });
      if (res.status !== 200 || !res.json?.success) {
        allArgsHandled = false;
      }
    }
    assert(allArgsHandled, "Probe 2.4: Malformed CLI args (null, strings, arrays, deep objects) execute safely without throwing");

    // 2.4 EventBus Emission on CLI Execution
    let cliEventCount = 0;
    const cliListener = () => { cliEventCount++; };
    eventBus.on("CLI_COMMAND_EXECUTED", cliListener);

    await makeRequest(`${BASE_HTTP}/api/cli/execute`, {
      method: "POST",
      body: { command: "status", vessel: "vessel-event-check" }
    });

    assert(cliEventCount >= 1, "Probe 2.5: EventBus emits CLI_COMMAND_EXECUTED on successful execution");
    eventBus.off("CLI_COMMAND_EXECUTED", cliListener);

  } catch (err) {
    assert(false, "Probe 2 Failure: Unexpected error during remote CLI stress test", err.message);
  }

  // ============================================================================
  // PROBE 3: Cloudflare Gateway Circuit Breaker Cascades, Recovery & Backoff
  // ============================================================================
  console.log("\n⚡ [PROBE 3/3] Stress-Testing Cloudflare Gateway Circuit Breakers & Failure Cascades...");

  try {
    // 3.1 Custom CircuitBreaker Instance Dynamics
    const customCb = new CircuitBreaker({ failureThreshold: 4, resetTimeoutMs: 150 });
    assert(customCb.getState() === "closed", "Probe 3.1: CircuitBreaker initializes in 'closed' state");

    // Record failures 1..3 (below threshold)
    customCb.recordFailure();
    customCb.recordFailure();
    customCb.recordFailure();
    assert(customCb.getState() === "closed", "Probe 3.2: CircuitBreaker remains 'closed' below failureThreshold (3/4)");

    // 4th failure reaches threshold -> 'open'
    customCb.recordFailure();
    assert(customCb.getState() === "open", "Probe 3.3: 4th failure transitions state to 'open'");

    // Immediate check before timeout -> still 'open'
    assert(customCb.getState() === "open", "Probe 3.4: State remains 'open' immediately after tripping");

    // Wait for resetTimeoutMs -> transition to 'half-open'
    await new Promise(r => setTimeout(r, 160));
    assert(customCb.getState() === "half-open", "Probe 3.5: State transitions to 'half-open' after resetTimeoutMs expires");

    // Successful probe in 'half-open' -> recovers to 'closed'
    customCb.recordSuccess();
    assert(customCb.getState() === "closed", "Probe 3.6: Successful probe in 'half-open' fully recovers circuit to 'closed'");
    assert(customCb.failureCount === 0, "Probe 3.6: Failure count reset to 0 upon recovery");

    // 3.2 Re-Tripping from 'half-open' on Failed Recovery Probe
    customCb.trip();
    assert(customCb.getState() === "open", "Probe 3.7: Manual trip() immediately sets state to 'open'");
    await new Promise(r => setTimeout(r, 160));
    assert(customCb.getState() === "half-open", "Probe 3.8: Re-entered 'half-open' after timeout");

    // Failed probe in 'half-open' -> immediately re-trips to 'open'
    customCb.recordFailure();
    assert(customCb.getState() === "open", "Probe 3.9: Failed probe in 'half-open' immediately re-trips to 'open'");

    // 3.3 Full CloudflareGatewayAdapter Cascading Network Failure Test
    const testAdapter = new CloudflareGatewayAdapter({
      accountId: "adversarial-org",
      gatewayId: "edge-test",
      maxRetries: 2,
      retryDelayBaseMs: 10,
      circuitBreaker: { failureThreshold: 3, resetTimeoutMs: 100 }
    });

    assert(testAdapter.getCircuitState() === "closed", "Probe 3.10: Adapter circuit breaker initialized 'closed'");

    // Run inference 1: Fails Tier 1 & 2 -> falls back to Tier 3, records 1 failure
    const cascade1 = await testAdapter.dispatchInference("Cascade 1", "@cf/meta/llama-3-8b-instruct", { simulateNetworkError: true });
    assert(cascade1.success === true, "Probe 3.11: Cascade 1 returns success: true via Tier 3 local fallback");
    assert(cascade1.tier === "tier_3_sovereign_local", "Probe 3.11: Tier 3 local fallback executed");
    assert(testAdapter.circuitBreaker.failureCount === 1, "Probe 3.11: Circuit breaker failureCount is 1");
    assert(testAdapter.getCircuitState() === "closed", "Probe 3.11: Circuit state still 'closed' after 1 failure");

    // Run inference 2: 2nd failure
    const cascade2 = await testAdapter.dispatchInference("Cascade 2", "@cf/meta/llama-3-8b-instruct", { simulateNetworkError: true });
    assert(cascade2.success === true, "Probe 3.12: Cascade 2 returns success: true via Tier 3");
    assert(testAdapter.circuitBreaker.failureCount === 2, "Probe 3.12: Circuit breaker failureCount is 2");

    // Run inference 3: 3rd failure -> trips to 'open'
    const cascade3 = await testAdapter.dispatchInference("Cascade 3", "@cf/meta/llama-3-8b-instruct", { simulateNetworkError: true });
    assert(cascade3.success === true, "Probe 3.13: Cascade 3 returns success: true via Tier 3");
    assert(testAdapter.getCircuitState() === "open", "Probe 3.13: Circuit breaker tripped to 'open' after 3rd consecutive failure");

    // Fast-fail bypass test while OPEN (no upstream attempts, immediate Tier 3 response)
    const tStart = Date.now();
    const fastFailRes = await testAdapter.dispatchInference("Fast fail probe", "@cf/meta/llama-3-8b-instruct");
    const tElapsed = Date.now() - tStart;
    assert(fastFailRes.tier === "tier_3_sovereign_local", "Probe 3.14: In 'open' state, adapter immediately routes to Tier 3");
    assert(fastFailRes.output.includes("Circuit breaker is OPEN"), "Probe 3.14: Output reflects circuit breaker OPEN status");
    assert(tElapsed < 50, `Probe 3.14: Fast-fail response is instantaneous (${tElapsed}ms) without network retry delay`);

    // Recovery test after resetTimeoutMs
    await new Promise(r => setTimeout(r, 120));
    assert(testAdapter.getCircuitState() === "half-open", "Probe 3.15: Adapter circuit breaker transitioned to 'half-open'");

    // Probe with successful Tier 1 mock simulation
    const recoveryRes = await testAdapter.dispatchInference("Recovery probe", "@cf/meta/llama-3-8b-instruct", { forceTier: 1 });
    assert(recoveryRes.success === true, "Probe 3.16: Recovery probe succeeded");
    assert(recoveryRes.tier === "tier_1_gateway", "Probe 3.16: Recovery probe executed on tier_1_gateway");
    assert(testAdapter.getCircuitState() === "closed", "Probe 3.17: Adapter circuit breaker successfully recovered to 'closed'");
    assert(testAdapter.circuitBreaker.failureCount === 0, "Probe 3.17: Failure count reset to 0");

    // 3.4 Parallel Concurrent Inference During Network Cascade
    const parallelAdapter = new CloudflareGatewayAdapter({
      circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 50 },
      maxRetries: 1,
      retryDelayBaseMs: 5
    });

    const parallelInferences = [];
    for (let i = 0; i < 25; i++) {
      parallelInferences.push(parallelAdapter.dispatchInference(`Parallel prompt #${i}`, "@cf/meta/llama-3-8b-instruct"));
    }
    const parallelResults = await Promise.all(parallelInferences);
    const allParallelSuccess = parallelResults.every(r => r.success === true && r.output.length > 0);
    assert(allParallelSuccess, "Probe 3.18: 25 concurrent inferences during failure cascade all resolve safely with fallback output");

  } catch (err) {
    assert(false, "Probe 3 Failure: Unexpected error during Cloudflare Gateway stress test", err.message);
  }

  // ============================================================================
  // FINAL EVALUATION & SUMMARY
  // ============================================================================
  console.log("\n" + "=".repeat(80));
  console.log(`CHALLENGER 1 SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED (Total: ${results.total})`);
  console.log("=".repeat(80));

  if (results.failed === 0) {
    console.log("🌟 ALL CHALLENGER 1 ADVERSARIAL STRESS PROBES PASSED WITH ZERO FAILURES! 🌟\n");
  } else {
    console.error(`❌ ${results.failed} ADVERSARIAL STRESS PROBES FAILED!\n`);
  }

  return results;
}

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith("test-m2-adversarial.js")) {
  runChallengerM2Suite().then((res) => {
    process.exit(res.failed === 0 ? 0 : 1);
  }).catch((err) => {
    console.error("Challenger suite fatal error:", err);
    process.exit(1);
  });
}
