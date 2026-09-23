// cli/commands/restart.ts
// Restart PrimordiaOS

import { restartRuntime } from "../../runtime";

export async function restartCommand() {
    console.log("[CLI] Restarting PrimordiaOS…");
    await restartRuntime();
    console.log("[CLI] PrimordiaOS restarted.");
}
