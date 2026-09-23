// monitoring/monitoring-bootstrap.ts
// PrimordiaOS Monitoring Bootstrap — full implementation
// Starts all monitoring subsystems

import { agentLoadMonitor } from "./agent-load";
import { pipelineThroughput } from "./pipeline-throughput";
import { systemHeartbeat } from "./system-heartbeat";

export async function startMonitoring() {
    console.log("[Monitoring] Starting monitoring subsystems…");

    agentLoadMonitor.start();
    pipelineThroughput.start();
    systemHeartbeat.start();

    console.log("[Monitoring] Monitoring active.");
}

export async function stopMonitoring() {
    console.log("[Monitoring] Stopping monitoring subsystems…");

    systemHeartbeat.stop();

    console.log("[Monitoring] Monitoring stopped.");
}
