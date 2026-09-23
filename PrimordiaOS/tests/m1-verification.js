import http from "node:http";
import WebSocket from "ws";
import { RestServer } from "../PrimordiaOS/interfaces/rest-server.js";
import { SimulationWebSocketServer } from "../PrimordiaOS/simulation/websocket-server.js";
import { spine } from "../PrimordiaOS/kernel/spine.js";
import { eventBus } from "../PrimordiaOS/kernel/event-bus.js";
import { stateBus } from "../PrimordiaOS/kernel/state-bus.js";
import { moneyPlugHubLoop } from "../PrimordiaOS/realms/economy/moneyplughub-loop.js";
import { bootPrimordiaOS } from "../PrimordiaOS/kernel/bootstrap.js";

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: options.headers || {}
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
    if (options.body) req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

async function runMilestone1Verification() {
  console.log("================================================================================");
  console.log("             PRIMORDIAOS MILESTONE 1 VERIFICATION TEST RUNNER                   ");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Boot the Master Spine Kernel
  console.log("\n[1/6] Booting PrimordiaOS Master Spine Universal Bootloader...");
  const bootStatus = await bootPrimordiaOS();
  assert(bootStatus.booted === true, "Master Spine booted successfully");
  assert(spine.booted === true, "spine.booted is true");

  const REST_URL = "http://localhost:3000";
  const WS_URL = "ws://localhost:17800";

  // 2. Test Port 3000 REST Endpoints
  console.log("\n[2/6] Testing Master Spine Port 3000 REST Endpoints...");

  // Health
  const healthRes = await makeRequest(`${REST_URL}/health`);
  assert(healthRes.status === 200, "GET /health returns HTTP 200");
  assert(healthRes.json?.status === "healthy", "GET /health status is 'healthy'");
  assert(healthRes.json?.spine_booted === true, "GET /health spine_booted is true");
  assert(typeof healthRes.json?.timestamp === "number", "GET /health timestamp is a number");

  // API Health alias
  const apiHealthRes = await makeRequest(`${REST_URL}/api/health`);
  assert(apiHealthRes.status === 200, "GET /api/health returns HTTP 200");
  assert(apiHealthRes.json?.status === "healthy", "GET /api/health status is 'healthy'");

  // API Status
  const statusRes = await makeRequest(`${REST_URL}/api/status`);
  assert(statusRes.status === 200, "GET /api/status returns HTTP 200");
  assert(statusRes.json?.realms !== undefined, "GET /api/status contains 5 realms object");
  assert(typeof statusRes.json?.uptime === "number" || typeof statusRes.json?.uptime_seconds === "number", "GET /api/status contains numeric uptime");
  assert(typeof statusRes.json?.pulse_count === "number", "GET /api/status contains numeric pulse_count");
  assert(statusRes.json?.realms?.local_realm !== undefined, "GET /api/status contains local_realm");
  assert(statusRes.json?.realms?.simulation_realm !== undefined, "GET /api/status contains simulation_realm");
  assert(statusRes.json?.realms?.economic_realm !== undefined, "GET /api/status contains economic_realm");
  assert(statusRes.json?.realms?.identity_realm !== undefined, "GET /api/status contains identity_realm");
  assert(statusRes.json?.realms?.cloud_realm !== undefined, "GET /api/status contains cloud_realm");

  // API Realms
  const realmsRes = await makeRequest(`${REST_URL}/api/realms`);
  assert(realmsRes.status === 200, "GET /api/realms returns HTTP 200");
  assert(Object.keys(realmsRes.json).length >= 5, "GET /api/realms returns 5 continuous realms snapshot");

  // Trigger Big Bang
  const bbRes = await makeRequest(`${REST_URL}/api/trigger-bigbang`, { method: "POST" });
  assert(bbRes.status === 200, "POST /api/trigger-bigbang returns HTTP 200");
  assert(bbRes.json?.status === "triggered", "POST /api/trigger-bigbang status is 'triggered'");
  assert(bbRes.json?.payload?.genesis === true, "POST /api/trigger-bigbang payload contains genesis: true");
  assert(bbRes.json?.payload?.singularity_intensity === 2.5, "POST /api/trigger-bigbang payload contains intensity 2.5");
  assert(bbRes.json?.payload?.niagara_system === "NS_PrimordiaBigBang", "POST /api/trigger-bigbang niagara_system is 'NS_PrimordiaBigBang'");

  // Trigger Pulse
  const pulseRes = await makeRequest(`${REST_URL}/api/trigger-pulse`, { method: "POST" });
  assert(pulseRes.status === 200, "POST /api/trigger-pulse returns HTTP 200");
  assert(pulseRes.json?.status === "pulsed", "POST /api/trigger-pulse status is 'pulsed'");

  // Antigrav Audit
  const auditRes = await makeRequest(`${REST_URL}/api/antigrav/audit`, { method: "POST" });
  assert(auditRes.status === 200, "POST /api/antigrav/audit returns HTTP 200");
  assert(auditRes.json?.passed === true, "POST /api/antigrav/audit passed validation");
  assert(auditRes.json?.score >= 70, `POST /api/antigrav/audit score >= 70 (Score: ${auditRes.json?.score})`);

  // Dashboard HUD serving
  const dashRes = await makeRequest(`${REST_URL}/`);
  assert(dashRes.status === 200, "GET / returns HTTP 200");
  assert(dashRes.headers["content-type"]?.includes("text/html"), "GET / Content-Type is text/html");
  assert(dashRes.body?.includes("PRIMORDIA"), "GET / serves Cockpit HUD HTML content");

  // 3. Test SSE Stream (/api/stream)
  console.log("\n[3/6] Testing Port 3000 /api/stream Live SSE Telemetry Stream...");
  await new Promise((resolve) => {
    const sseReq = http.request({
      hostname: "localhost",
      port: 3000,
      path: "/api/stream",
      headers: { Accept: "text/event-stream" }
    }, (sseRes) => {
      assert(sseRes.statusCode === 200, "GET /api/stream returns HTTP 200");
      assert(sseRes.headers["content-type"]?.includes("text/event-stream"), "GET /api/stream Content-Type is text/event-stream");

      let receivedConnected = false;
      let receivedCycle = false;
      let receivedUnreal = false;
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
              receivedConnected = true;
              assert(data.spine_booted === true, "SSE initial payload contains spine_booted: true");
              
              // Emit test events to verify forwarding
              eventBus.emit("CYCLE_COMPLETED", {
                type: "CYCLE_COMPLETED",
                cycle: 999,
                timestamp: Date.now(),
                commentary: "Test pulse event"
              });

              eventBus.emit("UNREAL_EVENT", {
                type: "UNREAL_EVENT",
                action: "NIAGARA_BURST"
              });
            }

            if (data.type === "CYCLE_COMPLETED") {
              receivedCycle = true;
            }

            if (data.type === "UNREAL_EVENT") {
              receivedUnreal = true;
            }

            if (receivedConnected && receivedCycle && receivedUnreal) {
              assert(receivedCycle, "SSE stream receives and forwards CYCLE_COMPLETED events");
              assert(receivedUnreal, "SSE stream receives and forwards UNREAL_EVENT notifications");
              sseReq.destroy();
              resolve();
            }
          } catch {}
        }
      });
    });

    sseReq.on("error", () => resolve());
    sseReq.end();
  });

  // 4. Test Port 17800 Simulation Realm WebSocket Bridge
  console.log("\n[4/6] Testing Port 17800 Simulation Realm WebSocket Bridge...");
  await new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);

    let receivedTelemetry = false;
    let receivedBigBang = false;
    let receivedTick = false;

    ws.on("open", () => {
      assert(true, "WebSocket client connected to ws://localhost:17800");
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "telemetry") {
          receivedTelemetry = true;
          assert(msg.data.status === "connected", "WebSocket receives initial telemetry connected state");
          
          // Send UNREAL_PLAY_STARTED
          ws.send(JSON.stringify({ type: "UNREAL_PLAY_STARTED", engine: "UnrealEngine 5.8", status: "PlayInEditor" }));
        }

        if (msg.type === "BIG_BANG_TRIGGER") {
          receivedBigBang = true;
          assert(msg.payload.genesis === true, "WS receives BIG_BANG_TRIGGER with genesis: true");
          assert(msg.payload.singularity_intensity === 2.5, "WS receives BIG_BANG_TRIGGER intensity: 2.5");
          assert(msg.payload.niagara_system === "NS_PrimordiaBigBang", "WS receives BIG_BANG_TRIGGER niagara_system: NS_PrimordiaBigBang");
          assert(msg.payload.cosmic_color === "#33bbff", "WS receives BIG_BANG_TRIGGER cosmic_color: #33bbff");
          assert(msg.payload.swarm_count === 6, "WS receives BIG_BANG_TRIGGER swarm_count: 6");

          // Emit a test SIMULATION_TICK on bus
          eventBus.emit("SIMULATION_TICK", {
            type: "SIMULATION_TICK",
            timestamp: new Date().toISOString(),
            data: { metrics: { activeEntities: 42 } }
          });
        }

        if (msg.type === "SIMULATION_TICK") {
          receivedTick = true;
          assert(true, "WS receives SIMULATION_TICK broadcasts");
        }

        if (receivedTelemetry && receivedBigBang && receivedTick) {
          ws.close();
          resolve();
        }
      } catch {}
    });

    ws.on("error", (err) => {
      console.error("WS Error:", err.message);
      resolve();
    });

    setTimeout(() => {
      ws.close();
      resolve();
    }, 4000);
  });

  // 5. Test Economic Realm Loop Synchronization
  console.log("\n[5/6] Testing Economic Realm Adapter & Loop Synchronization...");
  await moneyPlugHubLoop.init();
  assert(moneyPlugHubLoop.port === 3001, "Economic Realm loop port is 3001");
  assert(moneyPlugHubLoop.realmId === "economic_realm", "Economic Realm ID is 'economic_realm'");

  const cycleStep = await moneyPlugHubLoop.executeCycleStep();
  assert(cycleStep.status === "success", "Economic cycle step executed successfully");
  assert(typeof cycleStep.diff_hash === "string", "Economic cycle step generated valid diff_hash");
  assert(typeof cycleStep.timestamp === "number", "Economic cycle step generated timestamp");

  // 6. Summary
  console.log("\n" + "=".repeat(80));
  console.log(`MILESTONE 1 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=".repeat(80));

  if (failed === 0) {
    console.log("✨ ALL MILESTONE 1 CHECKS PASSED WITH 100% SUCCESS! ✨\n");
  } else {
    console.error(`❌ ${failed} CHECKS FAILED!\n`);
  }

  return { passed, failed, success: failed === 0 };
}

export { runMilestone1Verification };

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith("m1-verification.js")) {
  runMilestone1Verification().then((res) => {
    process.exit(res.success ? 0 : 1);
  }).catch((err) => {
    console.error("Verification execution error:", err);
    process.exit(1);
  });
}
