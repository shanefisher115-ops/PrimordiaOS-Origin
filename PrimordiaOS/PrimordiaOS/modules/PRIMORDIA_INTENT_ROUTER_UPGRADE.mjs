// =============================================================
// PrimordiaOS Intent Router Upgrade
// Adds automatic routing for all intents beginning with "unreal."
// =============================================================

import { primordiaUnrealCommand } from "./Primordia_UnrealExecutor.mjs";

// -------------------------------------------------------------
// MAIN ROUTER
// -------------------------------------------------------------

export function routeIntent(intent) {
    const { realm, action, params } = intent;

    // ---------------------------------------------------------
    // 1. Unreal Realm Auto‑Routing
    // ---------------------------------------------------------
    if (realm === "unreal.editor") {
        return handleUnrealIntent(action, params);
    }

    // ---------------------------------------------------------
    // 2. PrimordiaOS Core Routing (existing)
    // ---------------------------------------------------------
    if (realm === "primordia.core") {
        return handleCoreIntent(action, params);
    }

    // ---------------------------------------------------------
    // 3. OS Input Routing (existing)
    // ---------------------------------------------------------
    if (realm === "os.input") {
        return handleOSInputIntent(action, params);
    }

    console.log(`[PrimordiaOS] Unknown realm: ${realm}`);
}

// -------------------------------------------------------------
// UNREAL INTENT HANDLER
// -------------------------------------------------------------

function handleUnrealIntent(action, params) {
    console.log(`[PrimordiaOS] Routing Unreal intent: ${action}`);

    // Map Antigravity action → Unreal executor command
    switch (action) {

        case "build_testroom":
            return primordiaUnrealCommand(["build", "testroom"]);

        case "spawn_actor":
            return primordiaUnrealCommand(["spawn", params]);

        case "apply_material":
            return primordiaUnrealCommand(["apply_material", params]);

        case "lighting_rebuild":
            return primordiaUnrealCommand(["lighting", "rebuild"]);

        default:
            console.log(`[PrimordiaOS] Unknown Unreal action: ${action}`);
    }
}

// -------------------------------------------------------------
// CORE + OS INPUT HANDLERS (stubs)
// -------------------------------------------------------------

function handleCoreIntent(action, params) {
    console.log(`[PrimordiaOS] Core intent: ${action}`);
}

function handleOSInputIntent(action, params) {
    console.log(`[PrimordiaOS] OS input intent: ${action}`);
}
