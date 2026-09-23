// cli/commands/stop.ts
// Stop PrimordiaOS

import { stopRuntime } from "../../runtime";

export async function stopCommand() {
    console.log("[CLI] Stopping PrimordiaOS…");
    await stopRuntime();
    console.log("[CLI] PrimordiaOS stopped.");
}
