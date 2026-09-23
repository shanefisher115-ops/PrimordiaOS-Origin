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

import { ENGINE_MAP, getEngineName, getEngineCount, getAvailableIntents } from "./engines";
import { validateCommand } from "./purlSafety";
import swarmLogger from "./swarmLogger";
import { getRealmBusClient } from "./realmBusClient";
import type { EngineResult } from "./engines";

// ─── Types ──────────────────────────────────────────────────

export interface PURLResult {
  traceId: string;
  intent: string;
  engineRoute: string | null;
  status: "OK" | "ERROR" | "BLOCKED";
  executionTimeMs: number;
  payload: Record<string, unknown>;
  violations: string[];
  timestamp: number;
}

export interface PURLState {
  loopActive: boolean;
  lastCommand: string | null;
  lastOutput: PURLResult | null;
  lastEngineRoute: string | null;
  lastTraceId: string | null;
  lastLatencyMs: number | null;
  commandCount: number;
  startedAt: number | null;
}

// ─── State ──────────────────────────────────────────────────

const state: PURLState = {
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

export function generateTraceId(): string {
  // Use crypto.randomUUID if available, fallback to manual generation
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `purl-${crypto.randomUUID().slice(0, 12)}`;
  }

  const hex = () => Math.random().toString(16).slice(2, 6);
  return `purl-${hex()}-${hex()}-${hex()}`;
}

// ─── Start PURL ─────────────────────────────────────────────

export function startPURL(): void {
  if (state.loopActive) return;

  state.loopActive = true;
  state.startedAt = Date.now();
  state.commandCount = 0;

  // Emit boot telemetry
  swarmLogger.dispatch("PURL", {
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

export function stopPURL(): void {
  state.loopActive = false;

  swarmLogger.dispatch("PURL", {
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

export function routeToEngine(intent: string): { engine: typeof ENGINE_MAP[string] | null; name: string | null } {
  const engine = ENGINE_MAP[intent] ?? null;
  const name = getEngineName(intent);
  return { engine, name };
}

// ─── Collect Engine Output ──────────────────────────────────

async function collectEngineOutput(
  engine: typeof ENGINE_MAP[string],
  intent: string,
  payload: Record<string, unknown>
): Promise<EngineResult> {
  return engine.execute(intent, payload);
}

// ─── Format Runtime Result ──────────────────────────────────

export function formatRuntimeResult(
  traceId: string,
  intent: string,
  engineName: string | null,
  output: Record<string, unknown> | null,
  executionTimeMs: number,
  status: "OK" | "ERROR" | "BLOCKED",
  violations: string[]
): PURLResult {
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

export async function executePURLCommand(
  intent: string,
  payload: Record<string, unknown> = {}
): Promise<PURLResult> {
  const traceId = generateTraceId();
  const startTime = performance.now();

  // ── Step 1: Validate (Safety Layer) ─────────────────────
  const validation = validateCommand(intent, payload);

  if (!validation.allowed) {
    const result = formatRuntimeResult(
      traceId,
      intent,
      null,
      { message: "Command blocked by safety layer" },
      Math.round(performance.now() - startTime),
      "BLOCKED",
      validation.violations
    );

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

    const result = formatRuntimeResult(
      traceId,
      intent,
      null,
      {
        message: `No engine found for intent "${intent}"`,
        availableIntents: getAvailableIntents(),
      },
      Math.round(performance.now() - startTime),
      "ERROR",
      [`ROUTING: No engine registered for intent "${intent}"`]
    );

    updateState(intent, result, null);
    emitTelemetry(result);
    return result;
  }

  // ── Step 3: Execute & Collect Output ────────────────────
  try {
    const engineOutput = await collectEngineOutput(engine, intent, payload);
    const executionTimeMs = Math.round(performance.now() - startTime);

    const result = formatRuntimeResult(
      traceId,
      intent,
      engineName,
      engineOutput.data,
      executionTimeMs,
      engineOutput.status,
      []
    );

    updateState(intent, result, engineName);
    emitTelemetry(result);
    return result;

  } catch (err: unknown) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : "Unknown engine error";

    const result = formatRuntimeResult(
      traceId,
      intent,
      engineName,
      { message: "Engine failed", error: errorMessage },
      executionTimeMs,
      "ERROR",
      [`ENGINE_ERROR: ${engineName} threw: ${errorMessage}`]
    );

    updateState(intent, result, engineName);
    emitTelemetry(result);
    return result;
  }
}

// ─── Internal: Update PURL State ────────────────────────────

function updateState(
  intent: string,
  result: PURLResult,
  engineName: string | null
): void {
  state.lastCommand = intent;
  state.lastOutput = result;
  state.lastEngineRoute = engineName;
  state.lastTraceId = result.traceId;
  state.lastLatencyMs = result.executionTimeMs;
  state.commandCount++;
}

// ─── Internal: Emit Telemetry ───────────────────────────────

function emitTelemetry(result: PURLResult): void {
  swarmLogger.dispatch("PURL", {
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

export function getRuntimeState(): Readonly<PURLState> {
  return { ...state };
}

// ─── Get Uptime ─────────────────────────────────────────────

export function getUptime(): number {
  if (!state.startedAt) return 0;
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

async function attemptRealmBusRoute(
  traceId: string,
  intent: string,
  payload: Record<string, unknown>,
  startTime: number
): Promise<PURLResult | null> {
  // Only attempt if intent matches a known realm namespace
  const matchesRealm = REALM_PREFIXES.some((prefix) => intent.startsWith(prefix));
  if (!matchesRealm) return null;

  const client = getRealmBusClient();
  if (client.state !== 'connected') return null;

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
    const responsePayload = response.payload as Record<string, unknown>;
    const status = responsePayload?.status as string | undefined;

    return formatRuntimeResult(
      traceId,
      intent,
      `${target}:RealmBus`,
      responsePayload?.data as Record<string, unknown> ?? responsePayload,
      executionTimeMs,
      status === 'ERROR' ? 'ERROR' : status === 'BLOCKED' ? 'BLOCKED' : 'OK',
      []
    );
  } catch (err) {
    // RealmBus routing failed — return null to fall through to the
    // standard "no engine found" error
    console.warn(`[PURL] RealmBus route failed for ${intent}:`, err);
    return null;
  }
}

// ─── Re-exports for convenience ─────────────────────────────

export { getAvailableIntents, getEngineCount } from "./engines";
