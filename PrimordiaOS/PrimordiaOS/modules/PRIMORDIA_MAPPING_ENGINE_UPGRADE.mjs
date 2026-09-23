// =============================================================
// PrimordiaOS Mapping Engine Upgrade
// Automatically maps ANY "unreal.*" intent to executor commands
// =============================================================

import { primordiaUnrealCommand } from "./Primordia_UnrealExecutor.mjs";

// -------------------------------------------------------------
// MAIN MAPPER
// -------------------------------------------------------------

export function mapIntent(intent) {
    const { realm, action, params } = intent;

    // ---------------------------------------------------------
    // 1. Unreal Realm Auto-Mapping (pattern-based)
    // ---------------------------------------------------------
    if (realm === "unreal.editor") {
        return mapUnrealIntent(action, params);
    }

    // ---------------------------------------------------------
    // 2. PrimordiaOS Core Mapping (existing)
    // ---------------------------------------------------------
    if (realm === "primordia.core") {
        return mapCoreIntent(action, params);
    }

    // ---------------------------------------------------------
    // 3. OS Input Mapping (existing)
    // ---------------------------------------------------------
    if (realm === "os.input") {
        return mapOSInputIntent(action, params);
    }

    console.log(`[PrimordiaOS] Unknown realm: ${realm}`);
}

// -------------------------------------------------------------
// UNREAL MAPPING ENGINE (dynamic)
// -------------------------------------------------------------

function mapUnrealIntent(action, params) {
    console.log(`[PrimordiaOS] Mapping Unreal intent: ${action}`);

    // Convert "build_testroom" → ["build", "testroom"]
    const parts = action.split("_");

    // If the action has parameters, append them
    if (params && Object.keys(params).length > 0) {
        parts.push(params);
    }

    // Send directly to Unreal executor
    return primordiaUnrealCommand(parts);
}

// -------------------------------------------------------------
// CORE + OS INPUT HANDLERS (stubs)
// -------------------------------------------------------------

function mapCoreIntent(action, params) {
    console.log(`[PrimordiaOS] Core mapping: ${action}`);
}

function mapOSInputIntent(action, params) {
    console.log(`[PrimordiaOS] OS input mapping: ${action}`);
}
