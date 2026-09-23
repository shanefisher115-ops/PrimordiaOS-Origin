// src/phase2-orchestrator.ts
import * as path from 'path';
import { TelemetryCollector } from './telemetry/telemetryCollector.js';
import { EconomicKernel } from './kernel/economicKernel.js';
import { Guardrails } from './kernel/guardrails.js';
import { FunnelAgent } from './agents/funnelAgent.js';
import { ExecutionBridge } from './execution/executionBridge.js';
import { TikTokLiveAdapter } from './ingest/tiktokLiveAdapter.js';
export * from './contracts/types.js';
export * from './telemetry/telemetryCollector.js';
export * from './kernel/economicKernel.js';
export * from './kernel/offerEngine.js';
export * from './kernel/guardrails.js';
export * from './agents/funnelAgent.js';
export * from './execution/executionBridge.js';
export * from './ingest/tiktokLiveAdapter.js';
export class AutonomousRevenueOrchestrator {
    telemetry;
    kernel;
    guardrails;
    funnel;
    bridge;
    ingestAdapter;
    tickTimer = null;
    constructor(config) {
        const telemetryLog = path.join(config.dataDir, 'telemetry_production.jsonl');
        const auditLog = path.join(config.dataDir, 'audit_ledger.jsonl');
        this.telemetry = new TelemetryCollector(telemetryLog);
        this.kernel = new EconomicKernel();
        this.guardrails = new Guardrails({
            minActionCooldownSec: config.guardrails?.minActionCooldownSec ?? 90,
            maxDecisionsPerHour: config.guardrails?.maxDecisionsPerHour ?? 40,
            allowedUrlDomains: config.guardrails?.allowedUrlDomains ?? [
                'primordialorigin.com',
                'moneyplughub.com',
                'localhost',
            ],
        });
        this.funnel = new FunnelAgent();
        this.bridge = new ExecutionBridge(this.telemetry, this.kernel, this.guardrails, this.funnel, auditLog);
        this.ingestAdapter = new TikTokLiveAdapter();
    }
    start(tickIntervalMs = 5000) {
        if (this.tickTimer)
            return;
        this.tickTimer = setInterval(() => {
            this.bridge.evaluateTick();
        }, tickIntervalMs);
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
