import http from "node:http";
import WebSocket from "ws";
import { bootPrimordiaOS } from "../../PrimordiaOS/kernel/bootstrap.js";
import { spine } from "../../PrimordiaOS/kernel/spine.js";
import { restServer } from "../../PrimordiaOS/interfaces/rest-server.js";
import { simulationWsServer } from "../../PrimordiaOS/simulation/websocket-server.js";
import { eventBus } from "../../PrimordiaOS/kernel/event-bus.js";
import { stateBus } from "../../PrimordiaOS/kernel/state-bus.js";
import { unrealBridge } from "../../PrimordiaOS/realms/simulation/unreal-bridge.js";
import { unrealPipeline } from "../../PrimordiaOS/pipelines/unreal-pipeline.js";
import { niagaraStream } from "../../PrimordiaOS/realms/simulation/niagara-stream.js";
import { localRuntime } from "../../PrimordiaOS/realms/local/runtime.js";
import { TermuxVessel } from "../../PrimordiaOS/vessels/termux-vessel.js";
import { CloudflareGatewayAdapter, CircuitBreaker } from "../../PrimordiaOS/realms/cloud/cloudflare-gateway.js";

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

export async function runChallengerM2StressSuite() {
  console.log("================================================================================");
  console.log("   PRIMORDIAOS CHALLENGER 2: EMPIRICAL STRESS & CROSS-REALM ADVERSARIAL HARNESS ");
  console.log("    (UE5 RPC Handshake, Port 17800 WS Concurrency & Cross-Realm SSE Delivery)   ");
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

  // 0. Bootstrap Master Spine
  console.log("\n[SETUP] Initializing Master Spine & Simulation Pipelines...");
  await bootPrimordiaOS();
  await unrealPipeline.start();
  assert(spine.booted === true, "Master Spine booted state confirmed");

  // ---------------------------------------------------------------------------
  // SECTION 1: UE5 UNREAL_PLAY_STARTED Handshake Triggers & Niagara Parameter Broadcast
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 1] Stress-Testing UE5 Handshake Triggers & Niagara Parameter Broadcast...");

  // Test 1.1: Standard UNREAL_PLAY_STARTED Handshake
  await new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let step = 0;

    ws.on("open", () => {
      // WS opened
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "telemetry" && step === 0) {
          step = 1;
          assert(msg.data?.status === "connected", "Initial WS connection receives status: 'connected'");
          assert(typeof msg.data?.metrics?.AuraSpeed === "number", "Initial connection contains numeric AuraSpeed");
          assert(typeof msg.data?.metrics?.ChaosLevel === "number", "Initial connection contains numeric ChaosLevel");
          assert(msg.data?.metrics?.coherence === 100, "Initial connection contains coherence 100");

          // Send UE5 play started handshake with custom parameters
          ws.send(JSON.stringify({
            type: "UNREAL_PLAY_STARTED",
            engine: "UnrealEngine 5.8",
            status: "GENESIS_READY",
            params: {
              intensity: 4.8,
              niagara_system: "NS_PrimordiaBigBang_Custom",
              cosmic_color: "#ff0077",
              swarm_count: 14
            }
          }));
        } else if (msg.type === "BIG_BANG_TRIGGER" && step === 1) {
          step = 2;
          assert(msg.payload?.genesis === true, "Handshake triggers BIG_BANG_TRIGGER with genesis: true");
          assert(msg.payload?.singularity_intensity === 4.8, `Payload preserves custom intensity (4.8 == ${msg.payload?.singularity_intensity})`);
          assert(msg.payload?.niagara_system === "NS_PrimordiaBigBang_Custom", "Payload preserves custom Niagara system name");
          assert(msg.payload?.cosmic_color === "#ff0077", "Payload preserves custom cosmic color");
          assert(msg.payload?.swarm_count === 14, "Payload preserves custom swarm count (14)");
          ws.close();
          resolve();
        }
      } catch (err) {
        console.error("Section 1.1 Error:", err);
      }
    });

    ws.on("error", (err) => {
      assert(false, "Section 1.1 WS Error", err.message);
      resolve();
    });

    setTimeout(() => {
      if (step < 2) {
        assert(false, "Section 1.1 Timeout waiting for BIG_BANG_TRIGGER response");
      }
      ws.close();
      resolve();
    }, 4000);
  });

  // Test 1.2: Fallback/Default Parameter Handshake
  await new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let step = 0;

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "telemetry" && step === 0) {
          step = 1;
          // Send bare UNREAL_PLAY_STARTED without params
          ws.send(JSON.stringify({ type: "UNREAL_PLAY_STARTED" }));
        } else if (msg.type === "BIG_BANG_TRIGGER" && step === 1) {
          step = 2;
          assert(msg.payload?.genesis === true, "Bare handshake triggers BIG_BANG_TRIGGER");
          assert(msg.payload?.singularity_intensity >= 2.5, "Default singularity_intensity >= 2.5 assigned");
          assert(msg.payload?.niagara_system === "NS_PrimordiaBigBang", "Default niagara_system assigned");
          assert(msg.payload?.cosmic_color === "#33bbff", "Default cosmic_color assigned");
          assert(msg.payload?.swarm_count === 6, "Default swarm_count (6) assigned");
          ws.close();
          resolve();
        }
      } catch (err) {}
    });

    setTimeout(() => {
      if (step < 2) assert(false, "Section 1.2 Timeout");
      ws.close();
      resolve();
    }, 4000);
  });

  // Test 1.3: Trigger Big Bang & get_telemetry RPC message handling
  await new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let receivedTelemetry = false;

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "get_telemetry" }));
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "telemetry" && msg.data?.status === "active") {
          receivedTelemetry = true;
          assert(msg.data?.status === "active", "get_telemetry returns status: 'active'");
          assert(typeof msg.data?.clients === "number", "get_telemetry returns active client count");
          assert(msg.data?.metrics?.AuraSpeed !== undefined, "get_telemetry returns AuraSpeed");
          assert(msg.data?.metrics?.ChaosLevel !== undefined, "get_telemetry returns ChaosLevel");
          ws.close();
          resolve();
        }
      } catch {}
    });

    setTimeout(() => {
      if (!receivedTelemetry) assert(false, "Section 1.3 get_telemetry timeout");
      ws.close();
      resolve();
    }, 3000);
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: Rapid Socket Reconnects & Concurrent WebSocket Clients Stress Test
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 2] Stress-Testing Rapid Socket Reconnects & Concurrent WS Clients...");

  // Test 2.1: 25 Concurrent WebSocket Clients Connection & Broadcast Fanout
  const CONCURRENT_CLIENTS = 25;
  const connectedClients = [];
  const clientMessageCounts = new Array(CONCURRENT_CLIENTS).fill(0);

  const connectPromises = [];
  for (let i = 0; i < CONCURRENT_CLIENTS; i++) {
    const idx = i;
    const p = new Promise((resolveClient) => {
      const client = new WebSocket(WS_URL);
      client.on("open", () => {
        connectedClients.push(client);
        resolveClient(client);
      });
      client.on("message", (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed.type === "SIMULATION_TICK" || parsed.type === "telemetry_update" || parsed.type === "BIG_BANG_TRIGGER") {
            clientMessageCounts[idx]++;
          }
        } catch {}
      });
      client.on("error", (err) => {
        console.warn(`Client ${idx} error:`, err.message);
        resolveClient(null);
      });
    });
    connectPromises.push(p);
  }

  await Promise.all(connectPromises);
  assert(connectedClients.length === CONCURRENT_CLIENTS, `Successfully connected ${CONCURRENT_CLIENTS} concurrent WS clients simultaneously`);

  // Test 2.2: Broadcast Fanout across all 25 clients
  const NUM_BROADCASTS = 10;
  for (let b = 0; b < NUM_BROADCASTS; b++) {
    niagaraStream.emitMetrics({
      AuraSpeed: 1.0 + (b * 0.1),
      ChaosLevel: 0.1 + (b * 0.02),
      coherence: 100 - b,
      particle_rate: 60 + (b * 10)
    });
    await sleep(20);
  }

  await sleep(150); // allow message delivery

  let allReceived = true;
  for (let i = 0; i < CONCURRENT_CLIENTS; i++) {
    if (clientMessageCounts[i] < NUM_BROADCASTS) {
      allReceived = false;
      console.error(`Client ${i} received ${clientMessageCounts[i]}/${NUM_BROADCASTS} messages`);
    }
  }
  assert(allReceived, `All ${CONCURRENT_CLIENTS} concurrent clients received 100% of ${NUM_BROADCASTS} broadcast messages with zero drops`);

  // Close concurrent clients
  for (const c of connectedClients) {
    try { c.close(); } catch {}
  }
  await sleep(100);

  // Test 2.3: Rapid Socket Connect-Disconnect Chaos Cycles (50 cycles)
  const CHAOS_CYCLES = 50;
  let successfulReconnections = 0;
  let socketErrors = 0;

  for (let c = 0; c < CHAOS_CYCLES; c++) {
    await new Promise((resolveCycle) => {
      const ws = new WebSocket(WS_URL);
      ws.on("open", () => {
        successfulReconnections++;
        // Immediately trigger Big Bang or send message then abruptly close
        if (c % 2 === 0) {
          ws.send(JSON.stringify({ type: "UNREAL_PLAY_STARTED", engine: "UE5-Stress" }));
        } else {
          ws.send(JSON.stringify({ type: "get_telemetry" }));
        }
        setTimeout(() => {
          ws.close();
          resolveCycle();
        }, 15);
      });
      ws.on("error", (err) => {
        socketErrors++;
        resolveCycle();
      });
    });
  }

  assert(successfulReconnections === CHAOS_CYCLES, `Executed ${CHAOS_CYCLES} rapid connect/disconnect cycles with ${successfulReconnections} successes`);
  assert(socketErrors === 0, `Zero unhandled socket errors during ${CHAOS_CYCLES} rapid reconnect cycles`);

  // Test 2.4: Malformed and Adversarial WS Payloads Resistance
  await new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    ws.on("open", () => {
      // Send raw unparseable garbage
      ws.send("NOT_JSON_DATA_GARBAGE_!!!###$$$");
      ws.send("{ broken json: true ");
      ws.send(JSON.stringify({ type: null, data: 12345 }));
      ws.send(JSON.stringify({ type: "UNKNOWN_ARBITRARY_TYPE", payload: { massive: "x".repeat(10000) } }));
      setTimeout(() => {
        assert(ws.readyState === WebSocket.OPEN, "Server survives malformed & non-JSON frames without dropping connection");
        ws.close();
        resolve();
      }, 100);
    });
    ws.on("error", () => resolve());
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: Cross-Realm Event Flow: Termux Telemetry -> Spine -> SSE Stream
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 3] Stress-Testing Cross-Realm SSE Propagation (Mobile -> Spine -> SSE Stream)...");

  // Test 3.1: Multi-Subscriber SSE Connection & Zero-Dropout Delivery under High Packet Bursts
  const SSE_SUBSCRIBER_COUNT = 3;
  const ssePacketsReceived = new Array(SSE_SUBSCRIBER_COUNT).fill(0);
  const sseEventTypesSeen = Array.from({ length: SSE_SUBSCRIBER_COUNT }, () => new Set());
  const sseRequests = [];

  const sseConnectPromises = [];
  for (let s = 0; s < SSE_SUBSCRIBER_COUNT; s++) {
    const sIndex = s;
    const p = new Promise((resolveSub) => {
      const req = http.request({
        hostname: "localhost",
        port: REST_PORT,
        path: "/api/stream",
        headers: { Accept: "text/event-stream" }
      }, (res) => {
        assert(res.statusCode === 200, `SSE subscriber ${sIndex + 1} connected (HTTP 200)`);
        let buf = "";

        res.on("data", (chunk) => {
          buf += chunk.toString();
          const parts = buf.split("\n\n");
          buf = parts.pop();

          for (const part of parts) {
            if (!part.trim().startsWith("data:")) continue;
            try {
              const rawData = part.replace(/^data:\s*/, "").trim();
              const eventObj = JSON.parse(rawData);
              const eventName = eventObj.type || eventObj.name || eventObj.event;
              if (eventName) {
                sseEventTypesSeen[sIndex].add(eventName);
                ssePacketsReceived[sIndex]++;
              }
            } catch {}
          }
        });
        resolveSub(req);
      });
      req.on("error", (err) => {
        console.error(`SSE subscriber ${sIndex} error:`, err.message);
        resolveSub(null);
      });
      req.end();
    });
    sseConnectPromises.push(p);
  }

  const activeSseReqs = await Promise.all(sseConnectPromises);
  await sleep(100); // give time for SSE subscribers to settle

  // High-Volume Telemetry Burst (30 packets)
  const BURST_COUNT = 30;
  console.log(`  -> Injecting ${BURST_COUNT} rapid Termux sensor telemetry packets via POST /api/telemetry/mobile...`);
  for (let p = 0; p < BURST_COUNT; p++) {
    const packet = {
      vesselId: "vessel-termux-android",
      type: "MOBILE_VESSEL_UPDATE",
      battery: { percentage: 90 - p, plugged: "BATTERY" },
      accelerometer: { x: 0.1 * p, y: 9.8 - (0.01 * p), z: 0.2 },
      network: p % 2 === 0 ? "5G_NR" : "LTE",
      gps: { latitude: 37.7749 + (p * 0.0001), longitude: -122.4194, accuracy: 2.5 },
      cpu: { load: [0.5 + (p * 0.01)], memory_free_mb: 2800 - (p * 10) },
      thermal: "optimal",
      sequence: p,
      timestamp: Date.now()
    };

    const res = await makeHttpRequest(`${REST_URL}/api/telemetry/mobile`, {
      method: "POST",
      body: packet
    });
    assert(res.status === 200, `Telemetry burst packet ${p + 1}/${BURST_COUNT} accepted HTTP 200`);
    await sleep(15);
  }

  // Remote CLI Execution Invocations while SSE subscribers are listening
  console.log("  -> Disagreeing and executing remote sovereign CLI commands concurrently...");
  const cliCommands = ["status", "antigrav", "bigbang", "pulse"];
  for (const cmd of cliCommands) {
    const cliRes = await makeHttpRequest(`${REST_URL}/api/cli/execute`, {
      method: "POST",
      body: { command: cmd, vessel: "vessel-termux-android" }
    });
    assert(cliRes.status === 200, `Remote CLI '${cmd}' returned HTTP 200`);
    assert(cliRes.json?.success === true, `Remote CLI '${cmd}' executed successfully`);
  }

  await sleep(300); // Allow SSE streams to flush

  // Verify delivery across all SSE subscribers
  for (let s = 0; s < SSE_SUBSCRIBER_COUNT; s++) {
    assert(ssePacketsReceived[s] >= BURST_COUNT, `SSE subscriber ${s + 1} received all ${ssePacketsReceived[s]} events without dropout (>= ${BURST_COUNT})`);
    assert(sseEventTypesSeen[s].has("CONNECTED"), `SSE subscriber ${s + 1} saw CONNECTED event`);
    assert(sseEventTypesSeen[s].has("TELEMETRY_INGESTED") || sseEventTypesSeen[s].has("MOBILE_VESSEL_UPDATE"), `SSE subscriber ${s + 1} received cross-realm Termux telemetry events`);
    assert(sseEventTypesSeen[s].has("CLI_COMMAND_EXECUTED") || sseEventTypesSeen[s].has("BIG_BANG_TRIGGER"), `SSE subscriber ${s + 1} received cross-realm CLI/BigBang events`);
  }

  // Clean up SSE subscribers
  for (const req of activeSseReqs) {
    if (req) {
      try { req.destroy(); } catch {}
    }
  }
  await sleep(100);

  // ---------------------------------------------------------------------------
  // SECTION 4: Cloudflare Fallback & Circuit Breaker High-Stress Concurrency
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 4] Stress-Testing Cloudflare AI Gateway Fallback Resilience under Stress...");

  const stressCb = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 150 });
  const stressAdapter = new CloudflareGatewayAdapter({
    circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 150 },
    maxRetries: 1
  });

  // Trip the circuit breaker by recording failures
  for (let f = 0; f < 5; f++) {
    stressAdapter.circuitBreaker.recordFailure();
  }
  assert(stressAdapter.getCircuitState() === "open", "Circuit breaker tripped to 'open' after 5 failures");

  // Send 20 concurrent inference requests while circuit is OPEN -> verify 100% route to Tier 3 without errors
  const concurrentInferences = [];
  for (let i = 0; i < 20; i++) {
    concurrentInferences.push(stressAdapter.dispatchInference(`Concurrent prompt ${i}`));
  }
  const inferenceResults = await Promise.all(concurrentInferences);
  const allTier3 = inferenceResults.every(r => r.tier === "tier_3_sovereign_local" && r.success === true && r.fallback === true);
  assert(allTier3, "All 20 concurrent inferences safely routed to Tier 3 local sovereign fallback with circuit breaker OPEN");

  // Wait for reset timeout to test half-open probe recovery
  await sleep(180);
  assert(stressAdapter.circuitBreaker.getState() === "half-open", "Circuit breaker automatically transitioned to 'half-open' after timeout");

  // Successful probe resets circuit to closed
  stressAdapter.circuitBreaker.recordSuccess();
  assert(stressAdapter.circuitBreaker.getState() === "closed", "Circuit breaker recovered to 'closed' after successful probe");

  // ---------------------------------------------------------------------------
  // Summary and Verdict
  // ---------------------------------------------------------------------------
  console.log("\n" + "=".repeat(80));
  console.log(`CHALLENGER 2 STRESS RESULTS: ${results.passed} PASSED, ${results.failed} FAILED (Total: ${results.total})`);
  console.log("=".repeat(80));

  const verdict = results.failed === 0 ? "APPROVE" : "REQUEST_CHANGES";
  console.log(`\nFINAL CHALLENGER VERDICT: >>> ${verdict} <<< \n`);

  return {
    suite: "Challenger 2 M2 Stress Suite",
    verdict,
    passed: results.passed,
    failed: results.failed,
    total: results.total,
    success: results.failed === 0,
    tests: results.tests
  };
}

if (process.argv[1] && process.argv[1].endsWith("test-m2-adversarial-stress.js")) {
  runChallengerM2StressSuite().then((res) => {
    process.exit(res.success ? 0 : 1);
  }).catch((err) => {
    console.error("Challenger 2 M2 Stress test execution error:", err);
    process.exit(1);
  });
}
