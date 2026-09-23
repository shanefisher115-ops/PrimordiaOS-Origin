// temporal/temporal-bootstrap.ts
// PrimordiaOS Temporal Bootstrap — full implementation
// Starts temporal agents, pipelines, and time dilation

import { temporalAgents } from "./temporal-agent";
import { temporalPipelines } from "./temporal-pipeline";
import { timeDilation } from "./time-dilation";
import { timeSlicedSnapshots } from "./time-sliced-snapshots";
import { eventBus } from "../primordia-core/shared/event-bus";

export async function startTemporal() {
    console.log("[Temporal] Starting temporal layer…");

    // Example: capture a time slice every heartbeat
    eventBus.subscribe("system.heartbeat", () => {
        const slice = timeSlicedSnapshots.capture();
        eventBus.emit("temporal.slice.created", slice, "temporal");
    });

    // Example: apply time dilation to simulation realm
    eventBus.subscribe("simulation.synced", async () => {
        await timeDilation.applyDelay(50);
    });

    console.log("[Temporal] Temporal agents:", Object.keys(temporalAgents));
    console.log("[Temporal] Temporal pipelines:", Object.keys(temporalPipelines));
    console.log("[Temporal] Temporal layer active.");
}

export async function stopTemporal() {
    console.log("[Temporal] Stopping temporal layer…");
    console.log("[Temporal] Temporal layer stopped.");
}
