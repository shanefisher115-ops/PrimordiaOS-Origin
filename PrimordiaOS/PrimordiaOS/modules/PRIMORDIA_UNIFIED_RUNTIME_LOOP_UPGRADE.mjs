// =============================================================
// PrimordiaOS Unified Runtime Loop Upgrade
// Deterministic pipeline for executing intents end-to-end
// =============================================================

import { routeIntent } from "./PRIMORDIA_INTENT_ROUTER_UPGRADE.mjs";
import { mapIntent } from "./PRIMORDIA_MAPPING_ENGINE_UPGRADE.mjs";
import { computeSceneHash } from "./Primordia_WorldstateEngine.mjs";

// -------------------------------------------------------------
// MAIN RUNTIME LOOP
// -------------------------------------------------------------

export async function primordiaRuntimeLoop(intent) {
    console.log(`\n[PrimordiaOS] === Runtime Loop Start ===`);
    console.log(`[PrimordiaOS] Incoming intent: ${intent.action}`);

    // ---------------------------------------------------------
    // 1. ROUTING
    // ---------------------------------------------------------
    console.log(`[PrimordiaOS] Routing intent...`);
    const routed = routeIntent(intent);

    // ---------------------------------------------------------
    // 2. MAPPING
    // ---------------------------------------------------------
    console.log(`[PrimordiaOS] Mapping intent...`);
    const mapped = mapIntent(intent);

    // ---------------------------------------------------------
    // 3. EXECUTION
    // ---------------------------------------------------------
    console.log(`[PrimordiaOS] Executing mapped command...`);
    const executionResult = await mapped;

    // ---------------------------------------------------------
    // 4. WORLDSTATE UPDATE
    // ---------------------------------------------------------
    console.log(`[PrimordiaOS] Updating worldstate...`);
    const worldstateHash = await computeSceneHash();

    // ---------------------------------------------------------
    // 5. RETURN PACKET
    // ---------------------------------------------------------
    const packet = {
        status: "complete",
        action: intent.action,
        realm: intent.realm,
        params: intent.params,
        worldstate_hash: worldstateHash,
        timestamp: Date.now()
    };

    console.log(`[PrimordiaOS] === Runtime Loop Complete ===\n`);
    return packet;
}
