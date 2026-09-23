// =============================================================
// Primordial Antigravity Intent Generator Template
// Emits structured intents for PrimordiaOS to execute
// =============================================================

export function intent(action, payload = {}) {
    return {
        source: "PrimordialAntigravity",
        realm: resolveRealm(action),
        action: resolveAction(action),
        params: payload,
        constraints: {
            idempotent: true,
            reversible: true,
            safety_level: "editor"
        },
        timestamp: Date.now()
    };
}

// -------------------------------------------------------------
// Realm Resolver
// -------------------------------------------------------------

function resolveRealm(action) {
    if (action.startsWith("unreal.")) return "unreal.editor";
    if (action.startsWith("primordia.")) return "primordia.core";
    if (action.startsWith("os.")) return "os.input";
    return "unknown.realm";
}

// -------------------------------------------------------------
// Action Resolver
// -------------------------------------------------------------

function resolveAction(action) {
    const parts = action.split(".");
    return parts.slice(1).join("_"); // e.g. unreal.build.testroom → build_testroom
}

// -------------------------------------------------------------
// Predefined High-Level Intents
// -------------------------------------------------------------

export const UnrealIntents = {
    buildTestRoom() {
        return intent("unreal.build.testroom");
    },

    rebuildLighting() {
        return intent("unreal.lighting.rebuild");
    },

    spawnActor(className, transform) {
        return intent("unreal.spawn.actor", { className, transform });
    },

    applyMaterial(target, material) {
        return intent("unreal.apply.material", { target, material });
    }
};

// -------------------------------------------------------------
// Example: Emitting the TestRoom Build Intent
// -------------------------------------------------------------

export function emitTestRoomBuildIntent() {
    return UnrealIntents.buildTestRoom();
}
