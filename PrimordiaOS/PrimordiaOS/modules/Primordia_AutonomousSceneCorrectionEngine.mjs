// =============================================================
// PrimordiaOS Autonomous Scene Correction Engine
// Applies corrections to Unreal worldstate based on delta
// =============================================================

import { exec } from "child_process";

// -------------------------------------------------------------
// UTIL: Execute Unreal Python inline
// -------------------------------------------------------------

function runUnrealPythonInline(pyCode) {
    return new Promise((resolve, reject) => {
        const cmd = `"C:/Program Files/Epic Games/UE_5.3/Engine/Binaries/Win64/UnrealEditor-Cmd.exe" \
"C:/Users/Shane/PrimordiaWorld/PrimordiaWorld.uproject" \
-run=pythonscript -script="${pyCode}"`;

        exec(cmd, (err, stdout, stderr) => {
            if (err) return reject(stderr);
            resolve(stdout);
        });
    });
}

// -------------------------------------------------------------
// MAIN CORRECTION ENGINE
// -------------------------------------------------------------

export async function applySceneCorrections(delta) {
    console.log("[PrimordiaOS] Applying autonomous scene corrections...");

    // ---------------------------------------------------------
    // 1. ADD missing actors
    // ---------------------------------------------------------

    for (const actor of delta.added) {
        const py = `
import unreal
print("Spawning missing actor: ${actor.name}")
unreal.EditorLevelLibrary.spawn_actor_from_class(
    unreal.find_class("${actor.class}"),
    unreal.Vector(${actor.transform.location[0]}, ${actor.transform.location[1]}, ${actor.transform.location[2]})
)
`;
        await runUnrealPythonInline(py);
    }

    // ---------------------------------------------------------
    // 2. REMOVE unwanted actors
    // ---------------------------------------------------------

    for (const actor of delta.removed) {
        const py = `
import unreal
print("Removing actor: ${actor.name}")
a = unreal.EditorLevelLibrary.get_actor_reference("${actor.name}")
if a:
    unreal.EditorLevelLibrary.destroy_actor(a)
`;
        await runUnrealPythonInline(py);
    }

    // ---------------------------------------------------------
    // 3. MODIFY changed actors
    // ---------------------------------------------------------

    for (const mod of delta.modified) {
        const name = mod.name;
        const changes = mod.changes;

        // Transform correction
        if (changes.transform) {
            const t = changes.transform.after;
            const py = `
import unreal
print("Correcting transform for: ${name}")
a = unreal.EditorLevelLibrary.get_actor_reference("${name}")
if a:
    a.set_actor_location(unreal.Vector(${t.location[0]}, ${t.location[1]}, ${t.location[2]}))
    a.set_actor_rotation(unreal.Rotator(${t.rotation[1]}, ${t.rotation[2]}, ${t.rotation[0]}))
    a.set_actor_scale3d(unreal.Vector(${t.scale[0]}, ${t.scale[1]}, ${t.scale[2]}))
`;
            await runUnrealPythonInline(py);
        }

        // Material correction
        if (changes.materials) {
            const mats = changes.materials.after;
            const py = `
import unreal
print("Correcting materials for: ${name}")
a = unreal.EditorLevelLibrary.get_actor_reference("${name}")
if a:
    comp = a.get_component_by_class(unreal.StaticMeshComponent)
    if comp:
        for i, m in enumerate(${JSON.stringify(mats)}):
            if m != "None":
                mat = unreal.load_object(None, "/Game/Materials/" + m + "." + m)
                comp.set_material(i, mat)
`;
            await runUnrealPythonInline(py);
        }

        // Light intensity correction
        if (changes.light_intensity) {
            const intensity = changes.light_intensity.after;
            const py = `
import unreal
print("Correcting light intensity for: ${name}")
a = unreal.EditorLevelLibrary.get_actor_reference("${name}")
if a and isinstance(a, unreal.Light):
    a.set_editor_property("intensity", ${intensity})
`;
            await runUnrealPythonInline(py);
        }
    }

    console.log("[PrimordiaOS] Autonomous corrections complete.");
}
