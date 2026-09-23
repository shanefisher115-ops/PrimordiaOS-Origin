// realms/realm-bootstrap.ts
// PrimordiaOS Realm Bootstrap — full implementation
// Creates default realms and links them together
import { realmRegistry } from "./realm-registry";
import { multiUniverseGraph } from "./multi-universe-graph";
export async function startRealms() {
    console.log("[Realms] Starting multi-realm system…");
    const base = realmRegistry.create({
        id: "base",
        name: "Base Realm",
        description: "Primary operational realm"
    });
    const sim = realmRegistry.create({
        id: "sim",
        name: "Simulation Realm",
        description: "Unreal Engine simulation universe"
    });
    const vision = realmRegistry.create({
        id: "vision",
        name: "Vision Realm",
        description: "Perception + state graph universe"
    });
    const cloud = realmRegistry.create({
        id: "cloud",
        name: "Cloud Realm",
        description: "Distributed cloud universe"
    });
    // Link realms
    multiUniverseGraph.link("base", "vision", "perception");
    multiUniverseGraph.link("vision", "sim", "simulation");
    multiUniverseGraph.link("base", "cloud", "sync");
    multiUniverseGraph.link("sim", "cloud", "telemetry");
    console.log("[Realms] Realms initialized:", realmRegistry.list().map(r => r.id));
    console.log("[Realms] Universe links:", multiUniverseGraph.getLinks());
}
export async function stopRealms() {
    console.log("[Realms] Stopping multi-realm system…");
    console.log("[Realms] Realms stopped.");
}
