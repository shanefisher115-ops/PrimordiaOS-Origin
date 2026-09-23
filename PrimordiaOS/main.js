import { initDB } from "./db.ts";
import { runScheduler } from "./scheduler.ts";
import { handleUCL } from "./ucl.ts";
console.log("PrimordiaOS Booting…");
await initDB();
import { getIdentity } from "./identity.ts";
const identity = getIdentity();
console.log("PrimordiaOS Identity:", identity);
const args = Deno.args;
if (args[0] === "run-cycle") {
    await runScheduler();
}
else {
    await handleUCL(args);
}
