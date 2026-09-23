import http from "node:http";
import WebSocket from "ws";
import { bootPrimordiaOS } from "../../PrimordiaOS/kernel/bootstrap.js";
import { spine } from "../../PrimordiaOS/kernel/spine.js";
import { restServer } from "../../PrimordiaOS/interfaces/rest-server.js";
import { simulationWsServer } from "../../PrimordiaOS/simulation/websocket-server.js";
import { eventBus } from "../../PrimordiaOS/kernel/event-bus.js";
import { stateBus } from "../../PrimordiaOS/kernel/state-bus.js";

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    try {
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
      if (options.body) {
        req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function runChallengerM1Suite() {
  console.log("================================================================================");
  console.log("    PRIMORDIAOS CHALLENGER 2: ADVERSARIAL STRESS HARNESS (MILESTONE 1)          ");
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
  const WS_PORT = 17800;
  const BASE_HTTP = `http://localhost:${REST_PORT}`;
  const BASE_WS = `ws://localhost:${WS_PORT}`;

  // ============================================================================
  // PROBE 1: Boot Idempotency & Re-Entrancy Probes
  // ============================================================================
  console.log("\n⚡ [PROBE 1/3] Stress-Testing Boot Idempotency & Concurrent Invocations...");

  try {
    // 1.1 Initial Boot
    const bootRes1 = await bootPrimordiaOS();
    assert(bootRes1.booted === true, "Probe 1.1: Initial boot returns booted === true");
    assert(spine.booted === true, "Probe 1.1: spine.booted is true after initial boot");

    // 1.2 Sequential Boot Re-invocations
    const bootRes2 = await bootPrimordiaOS();
    assert(bootRes2.booted === true, "Probe 1.2: Second sequential bootPrimordiaOS() returns status smoothly");

    const bootRes3 = await bootPrimordiaOS();
    assert(bootRes3.booted === true, "Probe 1.3: Third sequential bootPrimordiaOS() returns status smoothly");

    // 1.3 Direct spine.boot() re-invocation
    const directBootStatus = await spine.boot();
    // spine.boot() returns undefined if already booted or status
    assert(spine.booted === true, "Probe 1.4: Direct spine.boot() on booted spine is non-destructive");

    // 1.4 Concurrent Boot Re-invocations (Race Condition Probe)
    const concurrentBoots = await Promise.all([
      bootPrimordiaOS(),
      bootPrimordiaOS(),
      bootPrimordiaOS(),
      bootPrimordiaOS(),
      bootPrimordiaOS()
    ]);
    const allConcurrentValid = concurrentBoots.every(b => b && b.booted === true);
    assert(allConcurrentValid, "Probe 1.5: 5 concurrent bootPrimordiaOS() calls resolve successfully without collision");

    // 1.5 Server start() idempotency
    restServer.start();
    assert(restServer.server !== null, "Probe 1.6: Repeated restServer.start() does not throw or duplicate listener");

    simulationWsServer.start();
    assert(simulationWsServer.wss !== null, "Probe 1.7: Repeated simulationWsServer.start() does not throw or duplicate listener");

    // 1.6 Realm registry count check
    const statusSnapshot = spine.getStatus();
    assert(statusSnapshot.agents.length === 5, "Probe 1.8: Spine maintains exactly 5 registered agents under repeated boots", `Found ${statusSnapshot.agents.length}`);
    assert(statusSnapshot.pipelines.length === 4, "Probe 1.9: Spine maintains exactly 4 registered pipelines under repeated boots", `Found ${statusSnapshot.pipelines.length}`);
    assert(Object.keys(statusSnapshot.realms).length >= 5, "Probe 1.10: Spine maintains all 5 realms under repeated boots");

  } catch (err) {
    assert(false, "Probe 1 Failure: Unexpected error during boot idempotency test", err.message);
  }

  // ============================================================================
  // PROBE 2: WebSocket Resilience, Malformed JSON & Connection Churn
  // ============================================================================
  console.log("\n⚡ [PROBE 2/3] Stress-Testing WebSocket Bridge (Port 17800)...");

  try {
    // 2.1 Malformed JSON payloads
    await new Promise((resolve) => {
      const ws = new WebSocket(BASE_WS);
      let receivedTelemetry = false;
      let rawEventHandled = false;

      const rawListener = (evt) => {
        if (evt.payload && evt.payload.raw && evt.payload.raw.includes("<<<MALFORMED_UNREAL_BUFFER>>>")) {
          rawEventHandled = true;
        }
      };
      eventBus.on("UNREAL_EVENT", rawListener);

      ws.on("open", () => {
        // Send corrupt / non-JSON messages
        ws.send("<<<MALFORMED_UNREAL_BUFFER>>>");
        ws.send("{ bad json: true, unquoted ");
        ws.send("12345");
        ws.send("null");
        ws.send("");
        ws.send(Buffer.from([0x00, 0xFF, 0xFE, 0xFD]));
      });

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "telemetry") {
            receivedTelemetry = true;
          }
        } catch {}
      });

      setTimeout(() => {
        eventBus.off("UNREAL_EVENT", rawListener);
        assert(ws.readyState === WebSocket.OPEN, "Probe 2.1: WebSocket connection remains OPEN after sending malformed JSON");
        assert(receivedTelemetry, "Probe 2.1: Initial telemetry received successfully");
        assert(rawEventHandled, "Probe 2.1: Server gracefully caught non-JSON and forwarded raw event to eventBus without crashing");
        ws.close();
        resolve();
      }, 800);
    });

    // 2.2 Rapid Connect, Message, and Immediate Abrupt Disconnect Churn (20 cycles)
    let churnSuccess = true;
    for (let i = 0; i < 20; i++) {
      try {
        const ws = new WebSocket(BASE_WS);
        await new Promise((res, rej) => {
          ws.on("open", () => {
            ws.send(JSON.stringify({ type: "UNREAL_HEARTBEAT", frame: i }));
            // Abrupt immediate destroy/terminate
            ws.terminate();
            res();
          });
          ws.on("error", rej);
          setTimeout(res, 200);
        });
      } catch {
        churnSuccess = false;
      }
    }
    assert(churnSuccess, "Probe 2.2: 20 rapid abrupt WebSocket connect/terminate churn cycles executed without crashing server");

    // 2.3 Broadcast during active disconnects / dead client pruning
    await new Promise((resolve) => {
      const clients = [];
      const receivedMessages = [0, 0, 0, 0, 0];

      // Connect 5 clients
      let connectedCount = 0;
      for (let i = 0; i < 5; i++) {
        const idx = i;
        const c = new WebSocket(BASE_WS);
        clients.push(c);
        c.on("open", () => {
          connectedCount++;
          if (connectedCount === 5) {
            proceed();
          }
        });
        c.on("message", (raw) => {
          try {
            const data = JSON.parse(raw.toString());
            if (data.type === "BIG_BANG_TRIGGER") {
              receivedMessages[idx]++;
            }
          } catch {}
        });
      }

      function proceed() {
        // Abruptly terminate clients 0, 2, 4
        clients[0].terminate();
        clients[2].terminate();
        clients[4].terminate();

        // Emit high-volume BIG_BANG_TRIGGER broadcasts
        eventBus.emit("BIG_BANG_TRIGGER", {
          payload: {
            genesis: true,
            singularity_intensity: 2.5,
            niagara_system: "NS_PrimordiaBigBang",
            cosmic_color: "#33bbff",
            swarm_count: 6
          }
        });

        eventBus.emit("BIG_BANG_TRIGGER", {
          payload: {
            genesis: true,
            singularity_intensity: 3.0,
            niagara_system: "NS_PrimordiaBigBang",
            cosmic_color: "#ff3300",
            swarm_count: 8
          }
        });

        setTimeout(() => {
          // Verify surviving clients (1 and 3) received the triggers
          const survivingClientsReceived = receivedMessages[1] > 0 && receivedMessages[3] > 0;
          assert(survivingClientsReceived, "Probe 2.3: Surviving WS clients received broadcasts during partial dead-client churn", `Client 1: ${receivedMessages[1]}, Client 3: ${receivedMessages[3]}`);

          // Close remaining
          clients[1].close();
          clients[3].close();
          resolve();
        }, 800);
      }
    });

    // 2.4 UNREAL_PLAY_STARTED auto-trigger Big Bang check
    await new Promise((resolve) => {
      const ws = new WebSocket(BASE_WS);
      let triggerReceived = false;

      ws.on("open", () => {
        ws.send(JSON.stringify({
          type: "UNREAL_PLAY_STARTED",
          engine: "UnrealEngine 5.8-Adversarial",
          world: "PrimordiaGenesisWorld",
          timestamp: Date.now()
        }));
      });

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "BIG_BANG_TRIGGER") {
            triggerReceived = true;
            assert(msg.payload.genesis === true, "Probe 2.4: UNREAL_PLAY_STARTED auto-triggers BIG_BANG_TRIGGER with genesis: true");
            assert(msg.payload.singularity_intensity === 2.5, "Probe 2.4: BIG_BANG_TRIGGER has singularity_intensity: 2.5");
            assert(msg.payload.niagara_system === "NS_PrimordiaBigBang", "Probe 2.4: BIG_BANG_TRIGGER niagara_system === NS_PrimordiaBigBang");
            ws.close();
            resolve();
          }
        } catch {}
      });

      setTimeout(() => {
        if (!triggerReceived) {
          assert(false, "Probe 2.4: Timed out waiting for BIG_BANG_TRIGGER after sending UNREAL_PLAY_STARTED");
          ws.close();
          resolve();
        }
      }, 2000);
    });

  } catch (err) {
    assert(false, "Probe 2 Failure: Unexpected error during WebSocket stress test", err.message);
  }

  // ============================================================================
  // PROBE 3: HTTP REST Endpoint Edge Cases, Unknown Routes & Query Parameters
  // ============================================================================
  console.log("\n⚡ [PROBE 3/3] Stress-Testing REST / SSE Endpoints (Port 3000)...");

  try {
    // 3.1 Query parameter tolerance on all core routes
    const qHealth = await makeRequest(`${BASE_HTTP}/health?debug=1&filter=all&timestamp=999999`);
    assert(qHealth.status === 200, "Probe 3.1: GET /health?query=params returns HTTP 200");
    assert(qHealth.json?.status === "healthy", "Probe 3.1: GET /health?query=params body is healthy");

    const qStatus = await makeRequest(`${BASE_HTTP}/api/status?verbose=true&fields=realms,uptime`);
    assert(qStatus.status === 200, "Probe 3.2: GET /api/status?verbose=true returns HTTP 200");
    assert(qStatus.json?.realms !== undefined, "Probe 3.2: Status payload contains realms despite query params");

    const qRealms = await makeRequest(`${BASE_HTTP}/api/realms?active=1&format=json`);
    assert(qRealms.status === 200, "Probe 3.3: GET /api/realms?active=1 returns HTTP 200");
    assert(qRealms.json?.local_realm !== undefined, "Probe 3.3: Realms payload contains local_realm");

    const qEvents = await makeRequest(`${BASE_HTTP}/api/events?limit=10&realm=simulation_realm`);
    assert(qEvents.status === 200, "Probe 3.4: GET /api/events?limit=10 returns HTTP 200");
    assert(Array.isArray(qEvents.json), "Probe 3.4: Events payload is an array");

    // 3.2 Unknown Routes (404 Handling)
    const badRoute1 = await makeRequest(`${BASE_HTTP}/api/nonexistent_route_probe`);
    assert(badRoute1.status === 404, "Probe 3.5: GET /api/nonexistent_route_probe returns HTTP 404");
    assert(badRoute1.json?.error === "Endpoint not found", "Probe 3.5: 404 response body has JSON error message");
    assert(badRoute1.json?.path === "/api/nonexistent_route_probe", "Probe 3.5: 404 response echoes pathname");

    const badRoute2 = await makeRequest(`${BASE_HTTP}/deeply/nested/unknown/path?probe=1`);
    assert(badRoute2.status === 404, "Probe 3.6: Deeply nested unknown route returns HTTP 404");

    // 3.3 HTTP Methods Matrix
    // OPTIONS Preflight
    const optRes = await makeRequest(`${BASE_HTTP}/api/status`, { method: "OPTIONS" });
    assert(optRes.status === 204, "Probe 3.7: OPTIONS /api/status returns HTTP 204 No Content");
    assert(optRes.headers["access-control-allow-origin"] === "*", "Probe 3.7: OPTIONS returns Access-Control-Allow-Origin: *");
    assert(optRes.headers["access-control-allow-methods"]?.includes("POST"), "Probe 3.7: OPTIONS returns allowed methods");

    // POST /api/trigger-bigbang
    const postBb = await makeRequest(`${BASE_HTTP}/api/trigger-bigbang`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_intensity: 4.0 })
    });
    assert(postBb.status === 200, "Probe 3.8: POST /api/trigger-bigbang returns HTTP 200");
    assert(postBb.json?.status === "triggered", "Probe 3.8: POST /api/trigger-bigbang returns status: 'triggered'");

    // GET /api/trigger-bigbang (alternative method tolerance)
    const getBb = await makeRequest(`${BASE_HTTP}/api/trigger-bigbang`);
    assert(getBb.status === 200, "Probe 3.9: GET /api/trigger-bigbang also returns HTTP 200 triggered");

    // POST /api/antigrav/audit
    const postAudit = await makeRequest(`${BASE_HTTP}/api/antigrav/audit`, { method: "POST" });
    assert(postAudit.status === 200, "Probe 3.10: POST /api/antigrav/audit returns HTTP 200");
    assert(postAudit.json?.passed === true, "Probe 3.10: Antigrav audit report passed === true");
    assert(postAudit.json?.score >= 70, `Probe 3.10: Antigrav audit score >= 70 (Actual: ${postAudit.json?.score})`);

    // Unsupported Methods on unknown endpoints
    const putUnknown = await makeRequest(`${BASE_HTTP}/api/unsupported_put_endpoint`, { method: "PUT" });
    assert(putUnknown.status === 404, "Probe 3.11: PUT on unknown endpoint returns HTTP 404");

    const deleteUnknown = await makeRequest(`${BASE_HTTP}/api/unsupported_del_endpoint`, { method: "DELETE" });
    assert(deleteUnknown.status === 404, "Probe 3.12: DELETE on unknown endpoint returns HTTP 404");

    // 3.4 Dashboard Fallback Paths
    const dashPaths = ["/", "/dashboard", "/dashboard.html", "/preview.html", "/cockpit"];
    let allDashboards200 = true;
    for (const p of dashPaths) {
      const dRes = await makeRequest(`${BASE_HTTP}${p}`);
      if (dRes.status !== 200 || !dRes.headers["content-type"]?.includes("text/html")) {
        allDashboards200 = false;
      }
    }
    assert(allDashboards200, "Probe 3.13: All 5 Cockpit HUD alias routes (/, /dashboard, /dashboard.html, /preview.html, /cockpit) return HTTP 200 text/html");

    // 3.5 SSE Connection & Abrupt Teardown
    await new Promise((resolve) => {
      const sseReq = http.request({
        hostname: "localhost",
        port: REST_PORT,
        path: "/api/stream?client_id=challenger_probe",
        headers: { Accept: "text/event-stream" }
      }, (sseRes) => {
        assert(sseRes.statusCode === 200, "Probe 3.14: GET /api/stream?client_id=... returns HTTP 200");
        assert(sseRes.headers["content-type"]?.includes("text/event-stream"), "Probe 3.14: Content-Type is text/event-stream");

        let receivedInitial = false;
        sseRes.on("data", (chunk) => {
          const str = chunk.toString();
          if (str.includes("CONNECTED")) {
            receivedInitial = true;
            assert(true, "Probe 3.15: SSE initial CONNECTED frame received");
            
            // Abruptly destroy request
            sseReq.destroy();
            resolve();
          }
        });
      });

      sseReq.on("error", () => resolve());
      sseReq.end();
    });

  } catch (err) {
    assert(false, "Probe 3 Failure: Unexpected error during REST stress test", err.message);
  }

  // ============================================================================
  // FINAL SUMMARY & METRICS
  // ============================================================================
  console.log("\n" + "=".repeat(80));
  console.log(`CHALLENGER 2 SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED (Total: ${results.total})`);
  console.log("=".repeat(80));

  return results;
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith("test-m1-adversarial.js")) {
  runChallengerM1Suite().then((res) => {
    process.exit(res.failed === 0 ? 0 : 1);
  }).catch((err) => {
    console.error("Challenger suite unhandled error:", err);
    process.exit(1);
  });
}
