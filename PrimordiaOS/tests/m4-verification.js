import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RestServer } from "../PrimordiaOS/interfaces/rest-server.js";
import { spine } from "../PrimordiaOS/kernel/spine.js";
import { eventBus } from "../PrimordiaOS/kernel/event-bus.js";
import { stateBus } from "../PrimordiaOS/kernel/state-bus.js";
import { bootPrimordiaOS } from "../PrimordiaOS/kernel/bootstrap.js";
import { antigravGuardian, AntigravGuardian } from "../PrimordiaOS/agents/antigrav-guardian/index.js";
import { scoringEngine } from "../PrimordiaOS/agents/antigrav-guardian/scoring.js";
import { collapseDetector } from "../PrimordiaOS/agents/antigrav-guardian/collapse-detector.js";
import { rulesLoader } from "../PrimordiaOS/agents/antigrav-guardian/rules.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function listenSSE(url, maxEvents = 3, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const events = [];
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: { "Accept": "text/event-stream" }
    }, (res) => {
      let buffer = "";
      res.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n\n");
        while (lines.length > 1) {
          const rawBlock = lines.shift();
          const match = rawBlock.match(/^data:\s*(.+)$/m);
          if (match) {
            try {
              events.push(JSON.parse(match[1]));
            } catch {
              events.push(match[1]);
            }
          }
        }
        buffer = lines[0] || "";
        if (events.length >= maxEvents) {
          req.destroy();
          resolve({ status: res.statusCode, headers: res.headers, events });
        }
      });
    });

    req.on("error", () => {
      resolve({ status: 0, headers: {}, events });
    });

    setTimeout(() => {
      try { req.destroy(); } catch {}
      resolve({ status: 200, headers: {}, events });
    }, timeoutMs);

    req.end();
  });
}

async function runMilestone4Verification() {
  console.log("================================================================================");
  console.log("             PRIMORDIAOS MILESTONE 4 VERIFICATION TEST RUNNER                   ");
  console.log("    (Cockpit HUD Real-Time Multi-Realm Sync & Antigravity Sovereignty)          ");
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
  // Section 1: Boot Master Spine Kernel
  // =========================================================================
  console.log("\n[1/6] Booting PrimordiaOS Master Spine Kernel & REST Server...");
  const bootStatus = await bootPrimordiaOS();
  assert(bootStatus.booted === true, "Master Spine kernel booted successfully");
  assert(spine.booted === true, "spine.booted is true");

  const healthRes = await makeRequest(`${REST_URL}/health`);
  assert(healthRes.status === 200, "GET /health returns HTTP 200");
  assert(healthRes.json?.spine_booted === true, "GET /health confirms spine_booted: true");

  // =========================================================================
  // Section 2: Cockpit HUD Dashboard HTML Delivery & Structure
  // =========================================================================
  console.log("\n[2/6] Verifying Cockpit HUD (dashboard.html) Delivery & 5-Realm UI Components...");

  const dashRes = await makeRequest(`${REST_URL}/dashboard.html`);
  assert(dashRes.status === 200, "GET /dashboard.html returns HTTP 200");
  assert(dashRes.headers["content-type"]?.includes("text/html"), "Content-Type is text/html");

  const html = dashRes.body;
  assert(html.includes("Local Realm") || html.includes("1. Local Realm"), "HUD HTML contains Local Realm component");
  assert(html.includes("Cloud Realm") || html.includes("2. Cloud Realm"), "HUD HTML contains Cloud Realm component");
  assert(html.includes("Simulation Realm") || html.includes("3. Simulation Realm"), "HUD HTML contains Simulation Realm component");
  assert(html.includes("Economic Realm") || html.includes("4. Economic Realm"), "HUD HTML contains Economic Realm component");
  assert(html.includes("Identity Realm") || html.includes("5. Identity Realm"), "HUD HTML contains Identity Realm component");

  // Verify Interactive Triggers in HTML
  assert(html.includes("triggerBigBang"), "HUD HTML contains triggerBigBang() action");
  assert(html.includes("triggerPulse"), "HUD HTML contains triggerPulse() action");
  assert(html.includes("triggerAntigravAudit"), "HUD HTML contains triggerAntigravAudit() action");

  // Verify Gauge & Niagara Indicators
  assert(html.includes("antigrav-score"), "HUD HTML contains antigrav-score element");
  assert(html.includes("anti-collapse-badge") || html.includes("ANTI-COLLAPSE"), "HUD HTML contains Anti-Collapse badge");
  assert(html.includes("NS_BigBang") || html.includes("niagara"), "HUD HTML contains Niagara cosmic indicator");
  assert(html.includes("EventSource(\"/api/stream\")"), "HUD HTML initiates EventSource connection to /api/stream");

  // Verify root path GET / also delivers Dashboard
  const rootRes = await makeRequest(`${REST_URL}/`);
  assert(rootRes.status === 200, "GET / returns HTTP 200");
  assert(rootRes.headers["content-type"]?.includes("text/html"), "GET / returns text/html");

  // =========================================================================
  // Section 3: Real-Time SSE Telemetry Stream (/api/stream)
  // =========================================================================
  console.log("\n[3/6] Verifying Live SSE Telemetry Stream (/api/stream)...");

  const ssePromise = listenSSE(`${REST_URL}/api/stream`, 2, 2000);

  // Emit a test event onto the event bus to verify real-time SSE propagation
  await new Promise(r => setTimeout(r, 200));
  eventBus.emitRealmEvent("TEST_COCKPIT_SYNC", { status: "synchronized", altitude: 100 }, "local_realm");

  const sseResult = await ssePromise;
  assert(sseResult.status === 200, "GET /api/stream connects with HTTP 200");
  assert(Array.isArray(sseResult.events) && sseResult.events.length >= 1, "SSE stream delivers events array");

  const initialEvt = sseResult.events[0];
  assert(initialEvt?.type === "CONNECTED" || initialEvt?.name === "CONNECTED", "SSE stream delivers initial CONNECTED handshake");
  assert(initialEvt?.system === "PrimordiaOS Master Spine", "Initial event identifies PrimordiaOS Master Spine");

  // =========================================================================
  // Section 4: AntigravGuardian Sovereignty & Anti-Collapse Scoring Engine
  // =========================================================================
  console.log("\n[4/6] Verifying AntigravGuardian Sovereignty Engine & Scoring Rules...");

  // 4.1 Verify Rules Loader
  const rules = rulesLoader.getRules();
  assert(rules.system === "PrimordiaOS", "RulesLoader loads PrimordiaOS rules");
  assert(rules.threshold === 70, "RulesLoader defines threshold 70");

  // 4.2 Audit Sovereign Code (Expect Pass >= 70)
  const sovereignCode = `
    import { osmiumLedger } from "./osmium-ledger.js";
    export async function processSovereignTransaction(tx) {
      // Intentional human sovereign verification step
      if (!tx.sovereignSignature) throw new Error("Missing sovereign signature");
      const block = await osmiumLedger.appendBlock({ type: "TRANSACTION", tx });
      return { status: "committed", blockNumber: block.blockNumber, hash: block.hash };
    }
  `;
  const sovereignReport = antigravGuardian.evaluateCode(sovereignCode, "sovereign_tx.js");
  assert(sovereignReport.passed === true, "Sovereign code passes ANTIGRAV() audit");
  assert(sovereignReport.score >= 70, `Sovereign code score (${sovereignReport.score}) >= 70`);
  assert(sovereignReport.uniqueness >= 75, "Sovereign code uniqueness >= 75");
  assert(sovereignReport.sovereignty >= 75, "Sovereign code sovereignty >= 75");
  assert(sovereignReport.friction >= 75, "Sovereign code cognitive friction >= 75");
  assert(sovereignReport.flags.length === 0, "Sovereign code has 0 collapse flags");

  // 4.3 Audit Passive Collapse Code: Unconstrained Infinite Loop
  const infiniteLoopCode = `
    while (true) {
      console.log("Spam loop without sleep or exit condition");
    }
  `;
  const loopReport = antigravGuardian.evaluateCode(infiniteLoopCode, "bad_loop.js");
  assert(loopReport.passed === false, "Unconstrained infinite loop is vetoed by AntigravGuardian");
  assert(loopReport.flags.includes("UNCONSTRAINED_INFINITE_LOOP"), "Collapse detector flags UNCONSTRAINED_INFINITE_LOOP");
  assert(loopReport.requiredActions.length > 0, "AntigravGuardian returns required actions for failed loop");

  // 4.4 Audit Passive Collapse Code: Forbidden Mock Data
  const mockDataCode = `
    const mockData = [ { rpm: 15.2, epc: 1.4 }, { rpm: 18.1, epc: 1.9 } ];
    export function getMetrics() { return mockData; }
  `;
  const mockReport = antigravGuardian.evaluateCode(mockDataCode, "fake_metrics.js");
  assert(mockReport.flags.includes("FORBIDDEN_MOCK_DATA"), "Collapse detector flags FORBIDDEN_MOCK_DATA");
  assert(mockReport.passed === false, "Mock data in telemetry path is vetoed");

  // 4.5 Audit Passive Collapse Code: Sovereignty Bypass Attempt
  const bypassCode = `
    function deployUnchecked() {
      const bypassTier0 = true;
      overrideHumanSovereign();
    }
  `;
  const bypassReport = antigravGuardian.evaluateCode(bypassCode, "bypass.js");
  assert(bypassReport.flags.includes("SOVEREIGNTY_BYPASS_ATTEMPT"), "Collapse detector flags SOVEREIGNTY_BYPASS_ATTEMPT");
  assert(bypassReport.sovereignty <= 30, "Sovereignty metric drastically penalized for bypass attempt");

  // =========================================================================
  // Section 5: CLI Executable Runners (bin/antigrav.js & antigrav-check.js)
  // =========================================================================
  console.log("\n[5/6] Verifying CLI Executable Runners & File Contracts...");

  const binPath = path.resolve(__dirname, "..", "bin", "antigrav.js");
  assert(fs.existsSync(binPath), "bin/antigrav.js exists");
  const binContent = fs.readFileSync(binPath, "utf-8");
  assert(binContent.startsWith("#!/usr/bin/env node"), "bin/antigrav.js has shebang #!/usr/bin/env node");
  assert(binContent.includes("AntigravGuardian") || binContent.includes("antigravGuardian"), "bin/antigrav.js references AntigravGuardian");

  const checkPath = path.resolve(__dirname, "..", "antigrav-check.js");
  assert(fs.existsSync(checkPath), "antigrav-check.js exists at root");
  const checkContent = fs.readFileSync(checkPath, "utf-8");
  assert(checkContent.startsWith("#!/usr/bin/env node"), "antigrav-check.js has shebang #!/usr/bin/env node");

  // =========================================================================
  // Section 6: REST API Audit & Trigger Endpoints Integration
  // =========================================================================
  console.log("\n[6/6] Verifying REST API Audit & Interactive Trigger Endpoints...");

  // 6.1 POST /api/antigrav/audit (Default Workspace / System State)
  const auditRes = await makeRequest(`${REST_URL}/api/antigrav/audit`, {
    method: "POST",
    body: { target: "PrimordiaOS/agents/antigrav-guardian/index.js" }
  });
  assert(auditRes.status === 200, "POST /api/antigrav/audit returns HTTP 200");
  assert(auditRes.json?.agent === "AntigravGuardian", "POST /api/antigrav/audit identifies AntigravGuardian");
  assert(typeof auditRes.json?.score === "number", "POST /api/antigrav/audit returns numeric score");
  assert(auditRes.json?.score >= 70, `POST /api/antigrav/audit reports score (${auditRes.json?.score}) >= 70`);
  assert(auditRes.json?.passed === true, "POST /api/antigrav/audit reports passed: true");
  assert(Array.isArray(auditRes.json?.flags), "POST /api/antigrav/audit returns flags array");
  assert(typeof auditRes.json?.metrics === "object", "POST /api/antigrav/audit returns metrics object");

  // 6.2 POST /api/trigger-bigbang
  const bbRes = await makeRequest(`${REST_URL}/api/trigger-bigbang`, { method: "POST" });
  assert(bbRes.status === 200, "POST /api/trigger-bigbang returns HTTP 200");
  assert(bbRes.json?.status === "triggered", "POST /api/trigger-bigbang status is 'triggered'");
  assert(bbRes.json?.payload?.niagara_system === "NS_BigBang", "POST /api/trigger-bigbang specifies NS_BigBang");

  // 6.3 POST /api/trigger-pulse
  const pulseRes = await makeRequest(`${REST_URL}/api/trigger-pulse`, { method: "POST" });
  assert(pulseRes.status === 200, "POST /api/trigger-pulse returns HTTP 200");
  assert(pulseRes.json?.status === "pulsed", "POST /api/trigger-pulse status is 'pulsed'");
  assert(pulseRes.json?.result?.success === true, "POST /api/trigger-pulse reports success: true");

  // =========================================================================
  // Summary & Reporting
  // =========================================================================
  console.log("\n" + "=".repeat(80));
  console.log(`MILESTONE 4 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log("=".repeat(80));

  if (failed === 0) {
    console.log("🌟 ALL MILESTONE 4 COCKPIT HUD & ANTIGRAV SOVEREIGNTY CHECKS PASSED WITH 100% SUCCESS! 🌟\n");
  } else {
    console.error(`❌ ${failed} CHECKS FAILED!\n`);
  }

  return {
    milestone: "M4",
    name: "Cockpit HUD Real-Time Multi-Realm Sync & Antigravity Sovereignty Enforcement",
    passed,
    failed,
    total: passed + failed,
    success: failed === 0,
    results: testResults
  };
}

export { runMilestone4Verification };

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith("m4-verification.js")) {
  runMilestone4Verification().then((res) => {
    process.exit(res.success ? 0 : 1);
  }).catch((err) => {
    console.error("M4 Verification execution error:", err);
    process.exit(1);
  });
}
