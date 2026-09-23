// index.ts
// Primordia Nexus Entrypoint — full implementation
// Boots PrimordiaOS inside the Nexus runtime
import { startRuntime } from "./runtime";
import { registerNexusHooks } from "./nexus-hooks";
async function main() {
    console.log("=======================================");
    console.log("         Primordia Nexus Runtime        ");
    console.log("=======================================");
    // Register Nexus → PrimordiaOS hooks
    registerNexusHooks();
    // Start PrimordiaOS runtime wrapper
    await startRuntime();
    console.log("[Nexus] Runtime initialized.");
}
main().catch((err) => {
    console.error("[Nexus] Fatal error:", err);
});
