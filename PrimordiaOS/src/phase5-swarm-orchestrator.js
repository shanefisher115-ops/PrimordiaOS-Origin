// src/phase5-swarm-orchestrator.ts
import * as path from 'path';
import { TelemetryCollector } from './telemetry/telemetryCollector.js';
import { EconomicKernel } from './kernel/economicKernel.js';
import { OfferEngine } from './kernel/offerEngine.js';
import { Guardrails } from './kernel/guardrails.js';
import { FunnelAgent } from './agents/funnelAgent.js';
import { ExecutionBridge } from './execution/executionBridge.js';
import { NarrativeEngine } from './realms/narrativeEngine/narrativeEngine.js';
import { BlogEngine } from './realms/blogEngine/blogEngine.js';
import { SwarmCoordinator } from './agents/swarm/agentSwarm.js';
import { CrossRealmExecutionBridge } from './execution/crossRealmExec.js';
import { MicroserviceForge } from './realms/microserviceForge/microserviceForge.js';
import { DeployMatrix } from './realms/deployment/deployMatrix.js';
export * from './contracts/phase5Types.js';
export * from './contracts/types.js';
export * from './telemetry/telemetryCollector.js';
export * from './kernel/economicKernel.js';
export * from './kernel/offerEngine.js';
export * from './kernel/guardrails.js';
export * from './agents/funnelAgent.js';
export * from './execution/executionBridge.js';
export * from './agents/swarm/agentSwarm.js';
export * from './execution/crossRealmExec.js';
export * from './realms/microserviceForge/microserviceForge.js';
export * from './realms/deployment/deployMatrix.js';
export * from './realms/multiAgentMatrixRealm.js';
export class AutonomousSwarmOrchestrator {
    telemetry;
    kernel;
    offerEngine;
    narrativeEngine;
    blogEngine;
    funnel;
    guardrails;
    bridge;
    // Phase 5 Multi-Agent Swarm Matrix Subsystems
    coordinator;
    crossRealmExec;
    forge;
    deployMatrix;
    tickTimer = null;
    tickIntervalMs;
    constructor(config) {
        const telemetryLog = path.join(config.dataDir, 'telemetry_production.jsonl');
        const auditLog = path.join(config.dataDir, 'audit_ledger.jsonl');
        const deployLog = path.join(config.dataDir, 'deploy_production.jsonl');
        const forgeDir = path.join(config.dataDir, 'synthesized', 'microservices');
        this.telemetry = new TelemetryCollector(telemetryLog);
        this.kernel = new EconomicKernel();
        this.offerEngine = new OfferEngine();
        this.narrativeEngine = new NarrativeEngine();
        this.blogEngine = new BlogEngine();
        this.funnel = new FunnelAgent();
        this.guardrails = new Guardrails({
            minActionCooldownSec: config.guardrails?.minActionCooldownSec ?? 90,
            maxDecisionsPerHour: config.guardrails?.maxDecisionsPerHour ?? 40,
            minOfferCooldownSec: config.guardrails?.minOfferCooldownSec ?? 120,
            minPriceFloorUsd: config.guardrails?.minPriceFloorUsd ?? 1,
            maxPriceCeilingUsd: config.guardrails?.maxPriceCeilingUsd ?? 999,
            allowedUrlDomains: config.guardrails?.allowedUrlDomains ?? [
                'primordialorigin.com',
                'moneyplughub.com',
                'localhost',
            ],
        });
        this.bridge = new ExecutionBridge(this.telemetry, this.kernel, this.guardrails, this.funnel, auditLog, {
            offerEngine: this.offerEngine,
            narrativeEngine: this.narrativeEngine,
            blogEngine: this.blogEngine,
        });
        // Initialize Phase 5 Subsystems
        this.coordinator = new SwarmCoordinator(config.swarmConfig);
        this.crossRealmExec = new CrossRealmExecutionBridge({
            coordinator: this.coordinator,
            offerEngine: this.offerEngine,
            telemetry: this.telemetry,
            narrativeEngine: this.narrativeEngine,
            blogEngine: this.blogEngine,
            funnel: this.funnel,
        });
        this.forge = new MicroserviceForge({
            outputDir: forgeDir,
            ...config.forgeConfig,
        });
        this.deployMatrix = new DeployMatrix({
            logFilePath: deployLog,
            ...config.deployConfig,
        });
        this.tickIntervalMs = config.tickIntervalMs ?? 5000;
    }
    /**
     * Submits a task to the swarm coordinator.
     */
    submitTask(role, objective, targetRealm, payload = {}) {
        return this.coordinator.submitTask(role, objective, targetRealm, payload);
    }
    /**
     * Synthesizes a new microservice via MicroserviceForge.
     */
    synthesizeService(spec) {
        return this.forge.synthesize(spec);
    }
    /**
     * Deploys a synthesized microservice via DeployMatrix.
     */
    async deployService(service, targetId) {
        return this.deployMatrix.deploy(service, targetId);
    }
    /**
     * Executes a single orchestrator tick:
     * 1. Evaluates baseline kernel and offer ticks
     * 2. Checks telemetry for reactive cross-realm triggers
     * 3. Dispatches all pending swarm tasks
     */
    async stepTick() {
        // 1. Evaluate baseline decision tick
        this.bridge.evaluateTick();
        // 2. Reactive Telemetry inspection: if link velocity surges, trigger ARCHITECT
        const econ = this.telemetry.getEconomicState();
        if ((econ.microWindow.linkRequestVelocityPerMin ?? 0) >= 3) {
            this.coordinator.submitTask('ARCHITECT', 'Scale capacity for link request velocity surge', 'offer_engine', { linkVelocity: econ.microWindow.linkRequestVelocityPerMin });
        }
        // 3. Process pending swarm tasks
        const processed = await this.coordinator.dispatchAllPending();
        const swarmState = this.coordinator.getSwarmState();
        const executionLog = this.coordinator.generateExecutionLog();
        return {
            tasksProcessed: processed.length,
            swarmState,
            executionLog,
        };
    }
    getSwarmState() {
        return this.coordinator.getSwarmState();
    }
    start(intervalMs) {
        if (this.tickTimer)
            return;
        const interval = intervalMs ?? this.tickIntervalMs;
        this.tickTimer = setInterval(() => {
            this.stepTick().catch((err) => {
                console.error('[AutonomousSwarmOrchestrator] Error during stepTick:', err);
            });
        }, interval);
    }
    stop() {
        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = null;
        }
        this.telemetry.close();
        this.bridge.close();
    }
}
