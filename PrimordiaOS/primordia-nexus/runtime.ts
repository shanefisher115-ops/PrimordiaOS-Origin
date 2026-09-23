// runtime.ts
// PrimordiaOS Runtime Wrapper — full implementation
// Controls lifecycle, restart logic, and Nexus integration

import { primordiaOS } from "./primordia-core/bootstrap";

let running = false;

export async function startRuntime() {
    if (running) {
        console.warn("[Runtime] Already running.");
        return;
    }

    console.log("[Runtime] Starting PrimordiaOS…");
    await primordiaOS.start();
    running = true;
}

export async function stopRuntime() {
    if (!running) {
        console.warn("[Runtime] Not running.");
        return;
    }

    console.log("[Runtime] Stopping PrimordiaOS…");
    await primordiaOS.stop();
    running = false;
}

export async function restartRuntime() {
    console.log("[Runtime] Restarting PrimordiaOS…");
    await stopRuntime();
    await startRuntime();
}
