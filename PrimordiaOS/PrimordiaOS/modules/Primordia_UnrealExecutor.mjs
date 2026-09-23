// =============================================================
// PrimordiaOS Unreal Executor Module
// Executes Unreal Python scripts inside the Unreal Editor runtime
// =============================================================

import { exec } from "child_process";
import fs from "fs";
import path from "path";

// -------------------------------------------------------------
// CONFIG
// -------------------------------------------------------------

const SCRIPT_ROOT = "C:/Users/Shane/PrimordiaUnreal/scripts";
const UNREAL_PYTHON = `"C:/Program Files/Epic Games/UE_5.3/Engine/Binaries/Win64/UnrealEditor-Cmd.exe"`;
const PROJECT_PATH = `"C:/Users/Shane/PrimordiaWorld/PrimordiaWorld.uproject"`;

// -------------------------------------------------------------
// UTIL: Execute a command and stream output
// -------------------------------------------------------------

function runCommand(cmd) {
    return new Promise((resolve, reject) => {
        const proc = exec(cmd);

        proc.stdout.on("data", data => {
            console.log(`[UNREAL] ${data}`);
        });

        proc.stderr.on("data", data => {
            console.log(`[UNREAL-ERR] ${data}`);
        });

        proc.on("exit", code => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
        });
    });
}

// -------------------------------------------------------------
// MAIN EXECUTOR
// -------------------------------------------------------------

export async function runUnrealPython(scriptName) {
    const fullPath = path.join(SCRIPT_ROOT, scriptName);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Script not found: ${fullPath}`);
    }

    console.log(`\n[PrimordiaOS] Executing Unreal Python script: ${scriptName}`);
    console.log(`[PrimordiaOS] Using Unreal Editor Python subsystem...\n`);

    const cmd = `${UNREAL_PYTHON} ${PROJECT_PATH} -run=pythonscript -script="${fullPath}"`;

    await runCommand(cmd);

    console.log(`\n[PrimordiaOS] Unreal script execution complete.`);
}

// -------------------------------------------------------------
// COMMAND ROUTER
// -------------------------------------------------------------

export async function primordiaUnrealCommand(args) {
    const sub = args[0];

    if (sub === "build" && args[1] === "testroom") {
        await runUnrealPython("PRIMORDIA_TESTROOM_BUILD.py");
        return;
    }

    console.log("[PrimordiaOS] Unknown Unreal command.");
}
