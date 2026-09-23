// =============================================================
// PrimordiaOS Worldstate Hash Engine Upgrade
// Computes deterministic hashes of Unreal worldstate
// =============================================================

import crypto from "crypto";
import { exec } from "child_process";

// -------------------------------------------------------------
// UTIL: Execute Unreal Python and capture output
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
// HASH UTIL
// -------------------------------------------------------------

function hashString(str) {
    return crypto.createHash("sha256").update(str).digest("hex");
}

// -------------------------------------------------------------
// MAIN HASH ENGINE
// -------------------------------------------------------------

export async function computeSceneHash() {
    console.log("[PrimordiaOS] Computing Unreal worldstate hash...");

    // Python snippet executed inside Unreal
    const py = `
import unreal
import json

actors = unreal.EditorLevelLibrary.get_all_level_actors()

def serialize_actor(a):
    data = {}
    data["name"] = a.get_fname()
    data["class"] = a.get_class().get_name()

    # Transform
    t = a.get_actor_transform()
    data["transform"] = {
        "location": [t.translation.x, t.translation.y, t.translation.z],
        "rotation": [t.rotation.roll, t.rotation.pitch, t.rotation.yaw],
        "scale": [t.scale3d.x, t.scale3d.y, t.scale3d.z]
    }

    # Materials (if mesh)
    mats = []
    try:
        comp = a.get_component_by_class(unreal.StaticMeshComponent)
        if comp:
            for i in range(comp.get_num_materials()):
                m = comp.get_material(i)
                mats.append(m.get_name() if m else "None")
    except:
        pass
    data["materials"] = mats

    # Light intensity (if light)
    try:
        if isinstance(a, unreal.Light):
            data["light_intensity"] = a.get_editor_property("intensity")
    except:
        pass

    return data

world_data = [serialize_actor(a) for a in actors]

print(json.dumps(world_data))
`;

    // Execute inside Unreal
    const raw = await runUnrealPythonInline(py);

    // Clean output
    const jsonStart = raw.findIndex ? raw : raw;
    const worldJson = jsonStart.trim();

    // Hash the entire worldstate JSON
    const hash = hashString(worldJson);

    console.log(`[PrimordiaOS] Worldstate hash: ${hash}`);
    return hash;
}
