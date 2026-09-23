"use strict";
// ============================================================
//   PURL — Primordia Unified Runtime Loop
// ============================================================
//
//   The beating heart of PrimordiaOS.
//
//   This is a continuous runtime loop, not a one-shot executor.
//   It listens → routes → executes → collects → returns → repeats.
//
//   Flow:
//     Command Console
//       → executePURLCommand(intent, payload)
//         → validateCommand (Safety)
//         → routeToEngine (Engine Map)
//         → collectEngineOutput (Engine Execution)
//         → formatRuntimeResult (JSON Envelope)
//         → swarmLogger.dispatch (Telemetry)
//       → JSON output to console
//       → Diagnostics to panel
//       → Swarm Monitor shows event
//
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEngineCount = exports.getAvailableIntents = void 0;
exports.generateTraceId = generateTraceId;
exports.startPURL = startPURL;
exports.stopPURL = stopPURL;
exports.routeToEngine = routeToEngine;
exports.formatRuntimeResult = formatRuntimeResult;
exports.executePURLCommand = executePURLCommand;
exports.getRuntimeState = getRuntimeState;
exports.getUptime = getUptime;
const engines_1 = require("./engines");
const purlSafety_1 = require("./purlSafety");
const swarmLogger_1 = __importDefault(require("./swarmLogger"));
const realmBusClient_1 = require("./realmBusClient");
// ─── State ──────────────────────────────────────────────────
const state = {
    loopActive: false,
    lastCommand: null,
    lastOutput: null,
    lastEngineRoute: null,
    lastTraceId: null,
    lastLatencyMs: null,
    commandCount: 0,
    startedAt: null,
};
// ─── Trace ID Generator ─────────────────────────────────────
function generateTraceId() {
    // Use crypto.randomUUID if available, fallback to manual generation
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `purl-${crypto.randomUUID().slice(0, 12)}`;
    }
    const hex = () => Math.random().toString(16).slice(2, 6);
    return `purl-${hex()}-${hex()}-${hex()}`;
}
// ─── Start PURL ─────────────────────────────────────────────
function startPURL() {
    if (state.loopActive)
        return;
    state.loopActive = true;
    state.startedAt = Date.now();
    state.commandCount = 0;
    // Emit boot telemetry
    swarmLogger_1.default.dispatch("PURL", {
        traceId: generateTraceId(),
        intent: "system.boot",
        engineRoute: null,
        executionTimeMs: 0,
        status: "OK",
        payload: { message: "PURL Runtime Loop initialized" },
        violations: [],
    });
}
// ─── Stop PURL ──────────────────────────────────────────────
function stopPURL() {
    state.loopActive = false;
    swarmLogger_1.default.dispatch("PURL", {
        traceId: generateTraceId(),
        intent: "system.shutdown",
        engineRoute: null,
        executionTimeMs: 0,
        status: "OK",
        payload: { message: "PURL Runtime Loop stopped" },
        violations: [],
    });
}
// ─── Route to Engine ────────────────────────────────────────
function routeToEngine(intent) {
    const engine = engines_1.ENGINE_MAP[intent] ?? null;
    const name = (0, engines_1.getEngineName)(intent);
    return { engine, name };
}
// ─── Collect Engine Output ──────────────────────────────────
async function collectEngineOutput(engine, intent, payload) {
    return engine.execute(intent, payload);
}
// ─── Format Runtime Result ──────────────────────────────────
function formatRuntimeResult(traceId, intent, engineName, output, executionTimeMs, status, violations) {
    return {
        traceId,
        intent,
        engineRoute: engineName,
        status,
        executionTimeMs,
        payload: output ?? {},
        violations,
        timestamp: Date.now(),
    };
}
// ─── Execute PURL Command ───────────────────────────────────
//
// The main entry point. This is what the Command Console calls.
//
async function executePURLCommand(intent, payload = {}) {
    const traceId = generateTraceId();
    const startTime = performance.now();
    // ── Step 1: Validate (Safety Layer) ─────────────────────
    const validation = (0, purlSafety_1.validateCommand)(intent, payload);
    if (!validation.allowed) {
        const result = formatRuntimeResult(traceId, intent, null, { message: "Command blocked by safety layer" }, Math.round(performance.now() - startTime), "BLOCKED", validation.violations);
        // Update state
        updateState(intent, result, null);
        // Emit telemetry
        emitTelemetry(result);
        return result;
    }
    // ── Step 2: Route to Engine ─────────────────────────────
    const { engine, name: engineName } = routeToEngine(intent);
    if (!engine) {
        // ── Step 2b: Cross-Realm Fallback via RealmBus ────────
        //
        // If no local engine handles this intent, check if the intent
        // namespace matches a known realm (e.g., cloud.*, simulation.*,
        // agent.*) and route via the RealmBus gateway.
        //
        const realmResult = await attemptRealmBusRoute(traceId, intent, payload, startTime);
        if (realmResult) {
            updateState(intent, realmResult, `RealmBus:${realmResult.engineRoute}`);
            emitTelemetry(realmResult);
            return realmResult;
        }
        const result = formatRuntimeResult(traceId, intent, null, {
            message: `No engine found for intent "${intent}"`,
            availableIntents: (0, engines_1.getAvailableIntents)(),
        }, Math.round(performance.now() - startTime), "ERROR", [`ROUTING: No engine registered for intent "${intent}"`]);
        updateState(intent, result, null);
        emitTelemetry(result);
        return result;
    }
    // ── Step 3: Execute & Collect Output ────────────────────
    try {
        const engineOutput = await collectEngineOutput(engine, intent, payload);
        const executionTimeMs = Math.round(performance.now() - startTime);
        const result = formatRuntimeResult(traceId, intent, engineName, engineOutput.data, executionTimeMs, engineOutput.status, []);
        updateState(intent, result, engineName);
        emitTelemetry(result);
        return result;
    }
    catch (err) {
        const executionTimeMs = Math.round(performance.now() - startTime);
        const errorMessage = err instanceof Error ? err.message : "Unknown engine error";
        const result = formatRuntimeResult(traceId, intent, engineName, { message: "Engine failed", error: errorMessage }, executionTimeMs, "ERROR", [`ENGINE_ERROR: ${engineName} threw: ${errorMessage}`]);
        updateState(intent, result, engineName);
        emitTelemetry(result);
        return result;
    }
}
// ─── Internal: Update PURL State ────────────────────────────
function updateState(intent, result, engineName) {
    state.lastCommand = intent;
    state.lastOutput = result;
    state.lastEngineRoute = engineName;
    state.lastTraceId = result.traceId;
    state.lastLatencyMs = result.executionTimeMs;
    state.commandCount++;
}
// ─── Internal: Emit Telemetry ───────────────────────────────
function emitTelemetry(result) {
    swarmLogger_1.default.dispatch("PURL", {
        traceId: result.traceId,
        intent: result.intent,
        engineRoute: result.engineRoute,
        executionTimeMs: result.executionTimeMs,
        status: result.status,
        payload: result.payload,
        violations: result.violations,
    });
}
// ─── Get Runtime State ──────────────────────────────────────
function getRuntimeState() {
    return { ...state };
}
// ─── Get Uptime ─────────────────────────────────────────────
function getUptime() {
    if (!state.startedAt)
        return 0;
    return Date.now() - state.startedAt;
}
// ─── Cross-Realm Routing via RealmBus ───────────────────────
//
// When no local engine handles an intent, this function attempts
// to route the command through the RealmBus gateway to a remote
// realm. This gives the existing CommandConsole automatic authority
// over cloud, simulation, and agent realms.
//
const REALM_PREFIXES = ['cloud.', 'simulation.', 'agent.', 'swarm.', 'system.'];
async function attemptRealmBusRoute(traceId, intent, payload, startTime) {
    // Only attempt if intent matches a known realm namespace
    const matchesRealm = REALM_PREFIXES.some((prefix) => intent.startsWith(prefix));
    if (!matchesRealm)
        return null;
    const client = (0, realmBusClient_1.getRealmBusClient)();
    if (client.state !== 'connected')
        return null;
    // Derive target realm from intent namespace
    const realmName = intent.split('.')[0];
    // Map 'swarm' intents to 'agents' realm
    const target = realmName === 'swarm' ? 'agents' : realmName;
    try {
        const response = await client.command(target, intent, payload, {
            traceId,
            timeoutMs: 15_000,
        });
        const executionTimeMs = Math.round(performance.now() - startTime);
        const responsePayload = response.payload;
        const status = responsePayload?.status;
        return formatRuntimeResult(traceId, intent, `${target}:RealmBus`, responsePayload?.data ?? responsePayload, executionTimeMs, status === 'ERROR' ? 'ERROR' : status === 'BLOCKED' ? 'BLOCKED' : 'OK', []);
    }
    catch (err) {
        // RealmBus routing failed — return null to fall through to the
        // standard "no engine found" error
        console.warn(`[PURL] RealmBus route failed for ${intent}:`, err);
        return null;
    }
}
// ─── Re-exports for convenience ─────────────────────────────
var engines_2 = require("./engines");
Object.defineProperty(exports, "getAvailableIntents", { enumerable: true, get: function () { return engines_2.getAvailableIntents; } });
Object.defineProperty(exports, "getEngineCount", { enumerable: true, get: function () { return engines_2.getEngineCount; } });
