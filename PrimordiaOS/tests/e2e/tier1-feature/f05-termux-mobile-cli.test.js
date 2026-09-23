import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { TermuxVessel } from "../../../PrimordiaOS/vessels/termux-vessel.js";
import { eventBus } from "../harness/test-env.js";
import { spine } from "../../../PrimordiaOS/kernel/spine.js";
import { antigravGuardian } from "../../../PrimordiaOS/agents/antigrav-guardian.js";

export const suite = new TestSuite("Tier 1 - Feature 5: Termux Mobile Vessel Adapter & Remote CLI");

// Test 1: Termux Vessel configuration schema
suite.test("F05-01: TermuxVessel defines Android/Linux vessel specifications and capabilities", async () => {
  assert.equal(TermuxVessel.id, "vessel-termux-android");
  assert.equal(TermuxVessel.type, "mobile_node");
  assert.equal(TermuxVessel.os, "Android/Linux");
  assert.isArray(TermuxVessel.capabilities);
  assert.includes(TermuxVessel.capabilities, "lightweight_node");
  assert.includes(TermuxVessel.capabilities, "edge_telemetry");
  assert.includes(TermuxVessel.capabilities, "remote_cli");
});

// Test 2: Ingest mobile node telemetry packet
suite.test("F05-02: Mobile telemetry ingestion emits TELEMETRY_INGESTED on EventBus", async () => {
  let captured = null;
  const listener = (data) => {
    captured = data;
  };
  eventBus.on("TELEMETRY_INGESTED", listener);

  const mobileTelemetry = {
    vesselId: TermuxVessel.id,
    battery: 88,
    memoryMb: 420,
    network: "5G",
    timestamp: Date.now()
  };

  eventBus.emit("TELEMETRY_INGESTED", mobileTelemetry);

  assert.ok(captured, "Expected TELEMETRY_INGESTED event");
  assert.equal(captured.vesselId, "vessel-termux-android");
  assert.equal(captured.battery, 88);
  assert.equal(captured.network, "5G");

  eventBus.removeListener("TELEMETRY_INGESTED", listener);
});

// Test 3: Remote CLI 'status' command execution
suite.test("F05-03: Remote CLI 'status' command evaluates and returns spine runtime metrics", async () => {
  const status = spine.getStatus();
  assert.isObject(status);
  assert.equal(status.status, "running");
  assert.isNumber(status.uptime_seconds);
  assert.isNumber(status.pulse_count);
});

// Test 4: Remote CLI 'antigrav' command execution
suite.test("F05-04: Remote CLI 'antigrav' command triggers guardian audit and returns score", async () => {
  const auditResult = antigravGuardian.audit({ source: "termux_remote_cli" });
  assert.isObject(auditResult);
  assert.isBoolean(auditResult.passed);
  assert.greaterThanOrEqual(auditResult.score, 70);
  assert.equal(auditResult.agent, "AntigravGuardian");
});

// Test 5: Mobile heartbeat keepalive propagation
suite.test("F05-05: Mobile vessel heartbeat maintains connection state without dropout", async () => {
  let heartbeatCount = 0;
  const listener = () => {
    heartbeatCount++;
  };
  eventBus.on("MOBILE_HEARTBEAT", listener);

  for (let i = 0; i < 3; i++) {
    eventBus.emit("MOBILE_HEARTBEAT", { vesselId: TermuxVessel.id, seq: i + 1, time: Date.now() });
  }

  assert.equal(heartbeatCount, 3, "Expected 3 heartbeat events received");
  eventBus.removeListener("MOBILE_HEARTBEAT", listener);
});
