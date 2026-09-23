// =============================================================
// PrimordiaOS Scene Delta Engine
// Computes differences between two Unreal worldstate snapshots
// =============================================================

import crypto from "crypto";

// -------------------------------------------------------------
// UTIL: Deep compare two objects
// -------------------------------------------------------------

function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

// -------------------------------------------------------------
// MAIN DELTA ENGINE
// -------------------------------------------------------------

export function computeSceneDelta(previousState, currentState) {
    console.log("[PrimordiaOS] Computing scene delta...");

    const prev = JSON.parse(previousState);
    const curr = JSON.parse(currentState);

    const delta = {
        added: [],
        removed: [],
        modified: []
    };

    // ---------------------------------------------------------
    // Build lookup tables
    // ---------------------------------------------------------

    const prevMap = new Map(prev.map(a => [a.name, a]));
    const currMap = new Map(curr.map(a => [a.name, a]));

    // ---------------------------------------------------------
    // Detect added actors
    // ---------------------------------------------------------

    for (const [name, actor] of currMap.entries()) {
        if (!prevMap.has(name)) {
            delta.added.push(actor);
        }
    }

    // ---------------------------------------------------------
    // Detect removed actors
    // ---------------------------------------------------------

    for (const [name, actor] of prevMap.entries()) {
        if (!currMap.has(name)) {
            delta.removed.push(actor);
        }
    }

    // ---------------------------------------------------------
    // Detect modified actors
    // ---------------------------------------------------------

    for (const [name, currActor] of currMap.entries()) {
        const prevActor = prevMap.get(name);
        if (!prevActor) continue;

        const changes = {};

        // Transform changes
        if (!deepEqual(prevActor.transform, currActor.transform)) {
            changes.transform = {
                before: prevActor.transform,
                after: currActor.transform
            };
        }

        // Material changes
        if (!deepEqual(prevActor.materials, currActor.materials)) {
            changes.materials = {
                before: prevActor.materials,
                after: currActor.materials
            };
        }

        // Light intensity changes
        if (prevActor.light_intensity !== currActor.light_intensity) {
            changes.light_intensity = {
                before: prevActor.light_intensity,
                after: currActor.light_intensity
            };
        }

        if (Object.keys(changes).length > 0) {
            delta.modified.push({
                name,
                class: currActor.class,
                changes
            });
        }
    }

    console.log("[PrimordiaOS] Scene delta computed.");
    return delta;
}
