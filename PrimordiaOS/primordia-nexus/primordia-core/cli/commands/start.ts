// cli/commands/start.ts
// Start PrimordiaOS

import { startRuntime } from "../../runtime";

export async function startCommand() {
    console.log("[CLI] Starting PrimordiaOS…");
    await startRuntime();
    console.log("[CLI] PrimordiaOS started.");
}
