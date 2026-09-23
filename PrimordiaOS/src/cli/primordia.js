// PrimordiaOS CLI Entrypoint
// This file boots the OS, initializes the autonomy loop,
// and starts the continuous intelligence cycle.
import { PrimordiaAutonomyLoop } from "../core/primordiaAutonomyLoop";
function banner() {
    console.log(`
╔══════════════════════════════════════════════╗
║         PRIMORDIAOS — AUTONOMY MODE          ║
╠══════════════════════════════════════════════╣
║  Multi‑Realm Intelligence Operating System    ║
║  Autonomous Cycle Engine Enabled              ║
║  Simulation Director Online                   ║
║  Realm Governance Active                       ║
╚══════════════════════════════════════════════╝
`);
}
async function main() {
    banner();
    const loop = new PrimordiaAutonomyLoop();
    console.log("[PrimordiaOS] Initializing autonomy loop...");
    loop.start();
    // Graceful shutdown
    process.on("SIGINT", () => {
        console.log("\n[PrimordiaOS] Shutdown signal received.");
        loop.stop();
        process.exit(0);
    });
    process.on("SIGTERM", () => {
        console.log("\n[PrimordiaOS] Termination signal received.");
        loop.stop();
        process.exit(0);
    });
}
main();
