// src/phase2-orchestrator.ts

import * as path from 'path';
import { TelemetryCollector } from './telemetry/telemetryCollector.js';
import { EconomicKernel } from './kernel/economicKernel.js';
import { Guardrails, GuardrailConfig } from './kernel/guardrails.js';
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

export interface AutonomousOrchestratorConfig {
  readonly dataDir: string;
  readonly guardrails?: Partial<GuardrailConfig>;
  readonly tickIntervalMs?: number;
}

export class AutonomousRevenueOrchestrator {
  public readonly telemetry: TelemetryCollector;
  public readonly kernel: EconomicKernel;
  public readonly guardrails: Guardrails;
  public readonly funnel: FunnelAgent;
  public readonly bridge: ExecutionBridge;
  public readonly ingestAdapter: TikTokLiveAdapter;

  private tickTimer: NodeJS.Timeout | null = null;

  constructor(config: AutonomousOrchestratorConfig) {
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
    this.bridge = new ExecutionBridge(
      this.telemetry,
      this.kernel,
      this.guardrails,
      this.funnel,
      auditLog
    );
    this.ingestAdapter = new TikTokLiveAdapter();
  }

  public start(tickIntervalMs: number = 5000): void {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => {
      this.bridge.evaluateTick();
    }, tickIntervalMs);
  }

  public stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.telemetry.close();
    this.bridge.close();
  }
}
