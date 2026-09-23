// bootstrap.ts
// PrimordiaOS Bootstrap Runtime — full implementation
// Wires together agents, pipelines, vision, osmium, unreal, and simulation sync
import { agentRegistry } from "./agents/agent-registry";
import { diagnosticAgent } from "./agents/diagnostic-agent";
import { executionAgent } from "./agents/execution-agent";
import { opportunityAgent } from "./agents/opportunity-agent";
import { auditAgent } from "./agents/audit-agent";
import { mobileNodeAgent } from "./agents/mobile-node-agent";
import { pipelineRegistry } from "./pipelines/pipeline-registry";
import { antigravityPipeline } from "./pipelines/antigravity-pipeline";
import { visionCore } from "./vision/vision-core";
import { osmiumLedger } from "./osmium/osmium-ledger";
import { snapshotManager } from "./osmium/snapshots";
import { unrealBridge } from "./unreal/unreal-bridge";
import { simulationSync } from "./unreal/simulation-sync";
import { eventBus } from "./shared/event-bus";
export class PrimordiaOS {
    started;
    constructor() {
        this.started = false;
    }
    async start() {
        if (this.started) {
            console.warn("[PrimordiaOS] Already started.");
            return;
        }
        console.log("=======================================");
        console.log("        PrimordiaOS Boot Sequence       ");
        console.log("=======================================");
        console.log("[PrimordiaOS] Initializing subsystems…");
        // Register agents
        agentRegistry.register(diagnosticAgent);
        agentRegistry.register(executionAgent);
        agentRegistry.register(opportunityAgent);
        agentRegistry.register(auditAgent);
        agentRegistry.register(mobileNodeAgent);
        // Register pipelines
        pipelineRegistry.register(antigravityPipeline);
        // Start core systems
        await agentRegistry.startAll();
        await pipelineRegistry.startAll();
        await visionCore.start();
        await unrealBridge.start();
        await simulationSync.start();
        // Start Osmium snapshot manager
        snapshotManager.start();
        // Wire event bus to ledger
        eventBus.subscribe("*", (event) => {
            osmiumLedger.commit(event);
        });
        this.started = true;
        console.log("[PrimordiaOS] Boot complete.");
        console.log("=======================================");
    }
    async stop() {
        if (!this.started) {
            console.warn("[PrimordiaOS] Not started.");
            return;
        }
        console.log("[PrimordiaOS] Shutting down…");
        snapshotManager.stop();
        await simulationSync.stop();
        await unrealBridge.stop();
        await visionCore.stop();
        await pipelineRegistry.stopAll();
        await agentRegistry.stopAll();
        this.started = false;
        console.log("[PrimordiaOS] Shutdown complete.");
    }
}
export const primordiaOS = new PrimordiaOS();
