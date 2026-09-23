// 1. Initialize the Swarm Orchestrator
import { Swarm } from "./primordia/swarm";
const swarm = new Swarm({
    maxWorkers: 64,
    strategy: "parallel",
    priorityMode: "adaptive"
});
// 2. Define the Cockpit Scaffold Map
const scaffoldMap = {
    core: [
        "cockpit.ts",
        "eventBus.ts",
        "metadata.ts",
        "physics.ts",
        "state.ts"
    ],
    hud: [
        "grid.ts",
        "helmRing.ts",
        "consoles/leftConsole.ts",
        "consoles/rightConsole.ts",
        "consoles/upperConsole.ts",
        "consoles/lowerConsole.ts",
        "commandLayer.ts",
        "particles.ts"
    ],
    realms: [
        "realmManager.ts",
        "realmPhysics.ts",
        "realmVisuals.ts",
        "realmEvents.ts"
    ],
    nodes: [
        "nodeManager.ts",
        "nodePhysics.ts",
        "nodeVisuals.ts",
        "nodeEvents.ts"
    ],
    swarm: [
        "swarmManager.ts",
        "swarmTrails.ts",
        "swarmPhysics.ts",
        "swarmEvents.ts"
    ],
    telemetry: [
        "pulses.ts",
        "telemetryManager.ts",
        "telemetryEvents.ts"
    ],
    cinematic: [
        "geometryWarp.ts",
        "colorTemp.ts",
        "particleFX.ts",
        "transitions.ts"
    ],
    agents: [
        "pilot.ts",
        "navigator.ts",
        "engineer.ts",
        "tactician.ts",
        "agentBus.ts"
    ],
    evolution: [
        "hudOptimizer.ts",
        "physicsTuner.ts",
        "vizGenerator.ts",
        "styleEvolution.ts"
    ],
    identity: [
        "bootSequence.ts",
        "realmIdentity.ts",
        "vesselIdentity.ts"
    ]
};
async function main() {
    // 3. Spawn Swarms to Build All Modules in Parallel
    for (const [module, files] of Object.entries(scaffoldMap)) {
        swarm.spawn(`build-${module}`, async (worker) => {
            for (const file of files) {
                await worker.createFile(`/cockpit/${module}/${file}`, {
                    template: "cockpit-module",
                    metadata: { module, file }
                });
            }
        });
    }
    // 4. Auto-Wire Runtime Hooks
    swarm.spawn("wire-runtime", async (worker) => {
        await worker.linkModules("/cockpit/core", [
            "/cockpit/hud",
            "/cockpit/realms",
            "/cockpit/nodes",
            "/cockpit/swarm",
            "/cockpit/telemetry",
            "/cockpit/cinematic",
            "/cockpit/agents",
            "/cockpit/evolution",
            "/cockpit/identity"
        ]);
    });
    // 5. Generate the Cockpit Boot Sequence
    swarm.spawn("generate-boot", async (worker) => {
        await worker.write("/cockpit/identity/bootSequence.ts", {
            cinematic: true,
            physicsSync: true,
            realmInit: true,
            nodeInit: true,
            swarmInit: true
        });
    });
    // 6. Activate Self-Evolution Hooks
    swarm.spawn("activate-evolution", async (worker) => {
        await worker.enableSelfRewrite([
            "/cockpit/evolution/hudOptimizer.ts",
            "/cockpit/evolution/physicsTuner.ts",
            "/cockpit/evolution/vizGenerator.ts",
            "/cockpit/evolution/styleEvolution.ts"
        ]);
    });
    // 7. Boot the Cockpit
    swarm.spawn("boot-cockpit", async (worker) => {
        await worker.run("/cockpit/core/cockpit.ts", "boot");
    });
    // 8. Wait for All Swarms to Complete
    await swarm.awaitAll();
    console.log("PrimordiaOS Cockpit fully assembled.");
}
main().catch(err => {
    console.error("Assembly error:", err);
    process.exit(1);
});
