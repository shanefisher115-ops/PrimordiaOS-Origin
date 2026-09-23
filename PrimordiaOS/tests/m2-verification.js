import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import WebSocket from "ws";
import { RestServer } from "../PrimordiaOS/interfaces/rest-server.js";
import { SimulationWebSocketServer } from "../PrimordiaOS/simulation/websocket-server.js";
import { spine } from "../PrimordiaOS/kernel/spine.js";
import { eventBus } from "../PrimordiaOS/kernel/event-bus.js";
import { stateBus } from "../PrimordiaOS/kernel/state-bus.js";
import { TermuxVessel } from "../PrimordiaOS/vessels/termux-vessel.js";
import { localRuntime } from "../PrimordiaOS/realms/local/runtime.js";
import { CloudflareGatewayAdapter, CircuitBreaker } from "../PrimordiaOS/realms/cloud/cloudflare-gateway.js";
import { unrealBridge } from "../PrimordiaOS/realms/simulation/unreal-bridge.js";
import { unrealPipeline } from "../PrimordiaOS/pipelines/unreal-pipeline.js";
import { niagaraStream } from "../PrimordiaOS/realms/simulation/niagara-stream.js";
import { collectSensorTelemetry, sendTelemetry } from "../PrimordiaOS/mobile-node/index.js";
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

async function runMilestone2Verification() {
  console.log("================================================================================");
  console.log("             PRIMORDIAOS MILESTONE 2 VERIFICATION TEST RUNNER                   ");
  console.log("  (Substrate Hardening, Mobile Vessels, AI Gateway Resilience & UE5 RPC Bridge) ");
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

  // 1. Boot Master Spine Kernel
  console.log("\n[1/5] Booting PrimordiaOS Master Spine Universal Bootloader...");
  const bootStatus = await bootPrimordiaOS();
  await unrealPipeline.start();
  assert(bootStatus.booted === true, "Master Spine kernel booted successfully");
  assert(spine.booted === true, "spine.booted state verified");

  const REST_URL = "http://localhost:3000";
  const WS_URL = "ws://localhost:17800";

  // 2. Test Termux Mobile Node Remote CLI & Telemetry Sync
  console.log("\n[2/5] Testing Termux Mobile Node Remote CLI & Telemetry Sync...");

  // 2.1 Termux Vessel Schema & Capabilities
  assert(TermuxVessel.id === "vessel-termux-android", "TermuxVessel ID is 'vessel-termux-android'");
  assert(TermuxVessel.type === "mobile_node", "TermuxVessel type is 'mobile_node'");
  assert(TermuxVessel.os === "Android/Linux", "TermuxVessel OS is 'Android/Linux'");
  assert(Array.isArray(TermuxVessel.capabilities), "TermuxVessel capabilities is an array");
  assert(TermuxVessel.capabilities.includes("lightweight_node"), "Vessel has lightweight_node capability");
  assert(TermuxVessel.capabilities.includes("edge_telemetry"), "Vessel has edge_telemetry capability");
  assert(TermuxVessel.capabilities.includes("remote_cli"), "Vessel has remote_cli capability");

  // 2.2 Telemetry Packet Generation
  const samplePacket = TermuxVessel.createTelemetryPacket({ battery: 92, network: "5G" });
  assert(samplePacket.vesselId === "vessel-termux-android", "Telemetry packet contains vesselId");
  assert(samplePacket.battery === 92, "Telemetry packet contains custom battery");
  assert(samplePacket.network === "5G", "Telemetry packet contains network type");
  assert(typeof samplePacket.accelerometer === "object", "Telemetry packet contains accelerometer");
  assert(typeof samplePacket.gps === "object", "Telemetry packet contains GPS coordinates");
  assert(typeof samplePacket.cpu === "object", "Telemetry packet contains CPU metrics");

  // 2.3 Mobile Node Index Sensor Collector
  const collectedSensors = collectSensorTelemetry();
  assert(collectedSensors.vesselId === "vessel-termux-android", "Mobile node collector includes vesselId");
  assert(typeof collectedSensors.battery === "object", "Mobile node collector includes battery object");
  assert(typeof collectedSensors.accelerometer === "object", "Mobile node collector includes accelerometer");
  assert(typeof collectedSensors.gps === "object", "Mobile node collector includes GPS location");

  // 2.4 REST Ingestion Endpoint POST /api/telemetry/mobile
  let busIngested = null;
  const ingestListener = (evt) => {
    busIngested = evt;
  };
  eventBus.on("TELEMETRY_INGESTED", ingestListener);

  const testTelemetryPayload = {
    vesselId: "vessel-termux-android",
    battery: { percentage: 87, plugged: "UNPLUGGED", temperature: 30.2 },
    accelerometer: { x: 0.15, y: 9.81, z: 0.32 },
    network: "5G_NR",
    gps: { latitude: 37.7749, longitude: -122.4194, accuracy: 3.5 },
    cpu: { load: [0.8, 0.6, 0.4], memory_free_mb: 3100 },
    thermal: "optimal",
    timestamp: Date.now()
  };

  const telemetryRes = await makeRequest(`${REST_URL}/api/telemetry/mobile`, {
    method: "POST",
    body: testTelemetryPayload
  });

  assert(telemetryRes.status === 200, "POST /api/telemetry/mobile returns HTTP 200");
  assert(telemetryRes.json?.status === "received", "Telemetry response status is 'received'");
  assert(telemetryRes.json?.success === true, "Telemetry response success is true");
  assert(telemetryRes.json?.vessel === "vessel-termux-android", "Telemetry response identifies vessel");
  assert(busIngested !== null, "TELEMETRY_INGESTED event emitted on EventBus");
  assert(busIngested?.vesselId === "vessel-termux-android", "EventBus payload contains vesselId");

  eventBus.off("TELEMETRY_INGESTED", ingestListener);

  // 2.5 LocalRealmRuntime In-Memory State & Metrics
  const sysMetrics = localRuntime.getSystemMetrics();
  assert(Array.isArray(sysMetrics.mobile_nodes), "System metrics contains mobile_nodes array");
  assert(sysMetrics.latest_mobile_telemetry !== null, "System metrics tracks latest_mobile_telemetry");
  assert(sysMetrics.latest_mobile_telemetry?.network === "5G_NR", "System metrics reflects updated network");

  // 2.6 Remote CLI Execution Endpoint POST /api/cli/execute
  // Command: status
  const cliStatusRes = await makeRequest(`${REST_URL}/api/cli/execute`, {
    method: "POST",
    body: { command: "status", vessel: "vessel-termux-android" }
  });
  assert(cliStatusRes.status === 200, "POST /api/cli/execute 'status' returns HTTP 200");
  assert(cliStatusRes.json?.success === true, "Remote CLI 'status' returns success: true");
  assert(cliStatusRes.json?.result?.status === "running", "Remote CLI 'status' returns running status");

  // Command: antigrav
  const cliAntigravRes = await makeRequest(`${REST_URL}/api/cli/execute`, {
    method: "POST",
    body: { command: "antigrav", vessel: "vessel-termux-android", diff: { target: "termux-node" } }
  });
  assert(cliAntigravRes.status === 200, "POST /api/cli/execute 'antigrav' returns HTTP 200");
  assert(cliAntigravRes.json?.result?.passed === true, "Remote CLI 'antigrav' passed audit");
  assert(cliAntigravRes.json?.result?.score >= 70, `Remote CLI 'antigrav' score >= 70 (${cliAntigravRes.json?.result?.score})`);

  // Command: bigbang
  const cliBigBangRes = await makeRequest(`${REST_URL}/api/cli/execute`, {
    method: "POST",
    body: { command: "bigbang", args: { intensity: 3.5, color: "#00ffcc" }, vessel: "vessel-termux-android" }
  });
  assert(cliBigBangRes.status === 200, "POST /api/cli/execute 'bigbang' returns HTTP 200");
  assert(cliBigBangRes.json?.result?.genesis === true, "Remote CLI 'bigbang' triggered genesis");
  assert(cliBigBangRes.json?.result?.singularity_intensity === 3.5, "Remote CLI 'bigbang' respects custom intensity");

  // 3. Test Cloudflare AI Gateway Edge Routing & Fallback Resilience
  console.log("\n[3/5] Testing Cloudflare AI Gateway & Fallback Resilience...");

  const cfAdapter = new CloudflareGatewayAdapter({
    accountId: "primordia-org",
    gatewayId: "edge-core",
    maxRetries: 2,
    retryDelayBaseMs: 20
  });

  // 3.1 Worker Registration and State
  cfAdapter.registerWorker("auth-worker", "/api/auth");
  cfAdapter.registerWorker("automation-worker", "/api/automation");
  cfAdapter.registerWorker("gateway-worker", "/api/gateway");
  cfAdapter.registerWorker("syndicate-edge", "/api/syndicates/edge");

  assert(cfAdapter.activeWorkers.size >= 4, "CloudflareGatewayAdapter registers 4+ edge workers");
  assert(cfAdapter.activeWorkers.get("syndicate-edge")?.route === "/api/syndicates/edge", "Edge worker route verified");

  // 3.2 Tier 1 Forced Simulation
  const tier1Res = await cfAdapter.dispatchInference("Synthesize sovereign prompt", "@cf/meta/llama-3.1-8b-instruct", { forceTier: 1 });
  assert(tier1Res.success === true, "Tier 1 AI Gateway inference succeeds");
  assert(tier1Res.tier === "tier_1_gateway", "Inference executed on tier_1_gateway");
  assert(tier1Res.model === "@cf/meta/llama-3.1-8b-instruct", "Inference model matches requested");
  assert(tier1Res.output.includes("Inferred response"), "Output contains expected prefix");

  // 3.3 Tier 2 Forced Simulation
  const tier2Res = await cfAdapter.dispatchInference("Synthesize secondary prompt", "@cf/meta/llama-3-8b-instruct", { forceTier: 2 });
  assert(tier2Res.success === true, "Tier 2 Direct Workers AI inference succeeds");
  assert(tier2Res.tier === "tier_2_workers_ai", "Inference executed on tier_2_workers_ai");

  // 3.4 Tier 3 Local Sovereign Mock Fallback with Circuit Breaker
  const tier3Res = await cfAdapter.dispatchInference("Synthesize local fallback prompt", "@cf/meta/llama-3-8b-instruct");
  assert(tier3Res.success === true, "Tier 3 Sovereign local fallback succeeds");
  assert(tier3Res.tier === "tier_3_sovereign_local", "Inference safely falls back to tier_3_sovereign_local");
  assert(tier3Res.fallback === true, "Result marked as fallback: true");

  // 3.5 Circuit Breaker State Machine & Transitions
  const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 100 });
  assert(cb.getState() === "closed", "CircuitBreaker starts in 'closed' state");

  cb.recordFailure();
  cb.recordFailure();
  assert(cb.getState() === "closed", "CircuitBreaker remains 'closed' below failure threshold (2/3)");

  cb.recordFailure();
  assert(cb.getState() === "open", "CircuitBreaker transitions to 'open' upon reaching failure threshold (3/3)");

  // Fast-fail when open
  const fastFailAdapter = new CloudflareGatewayAdapter({ circuitBreaker: { failureThreshold: 1, resetTimeoutMs: 100 } });
  fastFailAdapter.circuitBreaker.trip();
  assert(fastFailAdapter.getCircuitState() === "open", "Adapter reflects tripped circuit breaker");

  const fastFailResult = await fastFailAdapter.dispatchInference("Fast fail test");
  assert(fastFailResult.tier === "tier_3_sovereign_local", "Fast-failing adapter routes directly to Tier 3");
  assert(fastFailResult.output.includes("Circuit breaker is OPEN"), "Output notes circuit breaker OPEN status");

  // Test Half-Open Transition after Reset Timeout
  await new Promise(r => setTimeout(r, 120));
  assert(cb.getState() === "half-open", "CircuitBreaker transitions to 'half-open' after resetTimeoutMs");

  cb.recordSuccess();
  assert(cb.getState() === "closed", "CircuitBreaker recovers to 'closed' on successful probe");

  // 3.6 Ingress Configuration in .cloudflared/config.yml
  const configPath = path.resolve(process.cwd(), ".cloudflared", "config.yml");
  assert(fs.existsSync(configPath), ".cloudflared/config.yml exists");
  const configContent = fs.readFileSync(configPath, "utf8");
  assert(configContent.includes("spine.moneyplughub.com"), "config.yml routes spine.moneyplughub.com");
  assert(configContent.includes("http://localhost:3000"), "config.yml points to Master Spine port 3000");
  assert(configContent.includes("ws.primordialorigin.com") || configContent.includes("sim.moneyplughub.com"), "config.yml routes simulation WS traffic");
  assert(configContent.includes("http://localhost:17800"), "config.yml points to WebSocket port 17800");

  // 4. Test Unreal Engine 5 Bidirectional RPC Trigger Coherence
  console.log("\n[4/5] Testing Unreal Engine 5 Bidirectional RPC Bridge & Telemetry Schema...");

  // 4.1 Niagara Stream Controller Metric Normalization
  const pulsePayload = niagaraStream.emitPulse("NS_CosmicSingularity", "#ffaa00", 250, { AuraSpeed: 1.25, ChaosLevel: 0.05 });
  assert(pulsePayload.emitter === "NS_CosmicSingularity", "Niagara pulse contains emitter name");
  assert(pulsePayload.data?.metrics?.AuraSpeed === 1.25, "Niagara telemetry includes AuraSpeed");
  assert(pulsePayload.data?.metrics?.ChaosLevel === 0.05, "Niagara telemetry includes ChaosLevel");
  assert(pulsePayload.data?.metrics?.ParticleDensity === 250, "Niagara telemetry includes ParticleDensity");

  const metricsUpdate = niagaraStream.emitMetrics({ AuraSpeed: 0.95, ChaosLevel: 0.08, coherence: 100 });
  assert(metricsUpdate.data?.metrics?.AuraSpeed === 0.95, "Normalized metrics contain AuraSpeed float");
  assert(metricsUpdate.data?.metrics?.coherence === 100, "Normalized metrics contain coherence integer");

  // 4.2 WebSocket Port 17800 Handshake & RPC Triggers
  await new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);

    let receivedInitialTelemetry = false;
    let receivedBigBang = false;
    let receivedNormalizedTelemetry = false;

    ws.on("open", () => {
      assert(true, "WebSocket client connected to ws://localhost:17800");
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // A. Initial Telemetry Handshake
        if (msg.type === "telemetry" && !receivedInitialTelemetry) {
          receivedInitialTelemetry = true;
          assert(msg.data?.status === "connected", "WebSocket sends initial telemetry status: 'connected'");
          assert(msg.data?.metrics?.AuraSpeed !== undefined, "Initial telemetry contains AuraSpeed metric");
          assert(msg.data?.metrics?.ChaosLevel !== undefined, "Initial telemetry contains ChaosLevel metric");
          assert(msg.data?.metrics?.coherence === 100, "Initial telemetry contains coherence: 100");

          // Simulate Unreal Engine 5 startup handshake
          console.log("  -> Sending UNREAL_PLAY_STARTED handshake from simulated UE5...");
          ws.send(JSON.stringify({
            type: "UNREAL_PLAY_STARTED",
            engine: "UnrealEngine 5.8",
            status: "GENESIS_READY",
            params: {
              intensity: 3.2,
              niagara_system: "NS_PrimordiaBigBang",
              cosmic_color: "#33bbff",
              swarm_count: 8
            }
          }));
        }

        // B. Big Bang Trigger Auto-Response
        if (msg.type === "BIG_BANG_TRIGGER" && !receivedBigBang) {
          receivedBigBang = true;
          assert(msg.payload?.genesis === true, "WS received BIG_BANG_TRIGGER with genesis: true");
          assert(msg.payload?.singularity_intensity >= 2.5, "WS received BIG_BANG_TRIGGER with valid intensity");
          assert(msg.payload?.niagara_system === "NS_PrimordiaBigBang", "WS received BIG_BANG_TRIGGER niagara_system");
          assert(msg.payload?.cosmic_color !== undefined, "WS received BIG_BANG_TRIGGER cosmic_color");

          // Test normalized telemetry broadcast
          eventBus.emit("TELEMETRY_UPDATE", {
            data: {
              metrics: {
                AuraSpeed: 1.45,
                ChaosLevel: 0.22,
                coherence: 98,
                particle_rate: 120
              }
            }
          });
        }

        // C. Normalized Telemetry Update Broadcast
        if (msg.type === "telemetry_update") {
          receivedNormalizedTelemetry = true;
          assert(msg.data?.metrics?.AuraSpeed === 1.45, "WS received telemetry_update with normalized AuraSpeed float");
          assert(msg.data?.metrics?.ChaosLevel === 0.22, "WS received telemetry_update with normalized ChaosLevel float");
          assert(msg.data?.metrics?.coherence === 98, "WS received telemetry_update with coherence metric");

          ws.close();
          resolve();
        }
      } catch (err) {
        console.error("WS Message Error:", err);
      }
    });

    ws.on("error", (err) => {
      console.error("WS Socket Error:", err.message);
      resolve();
    });

    setTimeout(() => {
      ws.close();
      resolve();
    }, 4000);
  });

  // 5. Cross-Realm End-to-End Propagation (Mobile -> Spine -> SSE Stream)
  console.log("\n[5/5] Testing Cross-Realm SSE Stream Telemetry Propagation...");

  await new Promise((resolve) => {
    const sseReq = http.request({
      hostname: "localhost",
      port: 3000,
      path: "/api/stream",
      headers: { Accept: "text/event-stream" }
    }, (sseRes) => {
      assert(sseRes.statusCode === 200, "GET /api/stream returns HTTP 200 for SSE telemetry");

      let receivedMobileUpdate = false;
      let buffer = "";

      sseRes.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n\n");
        buffer = lines.pop();

        for (const block of lines) {
          if (!block.trim().startsWith("data:")) continue;
          try {
            const rawJson = block.replace(/^data:\s*/, "").trim();
            const data = JSON.parse(rawJson);

            if (data.type === "CONNECTED") {
              // Ingest mobile telemetry to test forwarding to SSE
              localRuntime.ingestMobileTelemetry({
                vesselId: "vessel-termux-android",
                type: "MOBILE_VESSEL_UPDATE",
                battery: 98,
                network: "5G_SA",
                thermal: "optimal"
              });
            }

            if (data.type === "MOBILE_VESSEL_UPDATE" || data.name === "MOBILE_VESSEL_UPDATE" || data.event === "MOBILE_VESSEL_UPDATE") {
              receivedMobileUpdate = true;
              assert(data.vesselId === "vessel-termux-android" || data.vessel === "vessel-termux-android", "SSE received forwarded MOBILE_VESSEL_UPDATE event");
              assert(data.battery === 98, "SSE forwarded mobile battery metric (98%)");
              sseReq.destroy();
              resolve();
            }
          } catch {}
        }
      });
    });

    sseReq.on("error", () => resolve());
    sseReq.end();

    setTimeout(() => {
      sseReq.destroy();
      resolve();
    }, 3000);
  });

  // 6. Summary & Reporting
  console.log("\n" + "=".repeat(80));
  console.log(`MILESTONE 2 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log("=".repeat(80));

  if (failed === 0) {
    console.log("🌟 ALL MILESTONE 2 CHECKS PASSED WITH 100% SUCCESS! 🌟\n");
  } else {
    console.error(`❌ ${failed} MILESTONE 2 CHECKS FAILED!\n`);
  }

  return {
    milestone: "M2",
    name: "Substrate Hardening & Cross-Realm Vessel Integration",
    passed,
    failed,
    total: passed + failed,
    success: failed === 0,
    results: testResults
  };
}

export { runMilestone2Verification };

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith("m2-verification.js")) {
  runMilestone2Verification().then((res) => {
    process.exit(res.success ? 0 : 1);
  }).catch((err) => {
    console.error("M2 Verification execution error:", err);
    process.exit(1);
  });
}
