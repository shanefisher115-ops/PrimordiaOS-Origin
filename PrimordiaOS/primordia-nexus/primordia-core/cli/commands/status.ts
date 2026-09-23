// cli/commands/status.ts
// PrimordiaOS Status Command

import { primordiaOS } from "../../primordia-core/bootstrap";
import { snapshotManager } from "../../primordia-core/osmium/snapshots";
import { simulationSync } from "../../primordia-core/unreal/simulation-sync";

export async function statusCommand() {
    console.log("PrimordiaOS Status");
    console.log("------------------");

    console.log("Started:", (primordiaOS as any).started);

    const latestSnapshot = snapshotManager.getLatestSnapshot();
    console.log("Latest Snapshot:", latestSnapshot ? latestSnapshot.id : "none");

    const lastSim = simulationSync.getLastState();
    console.log("Last Simulation Sync:", lastSim ? lastSim.id : "none");
}
