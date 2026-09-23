// src/phase3-orchestrator.ts

import * as path from 'path';
import { TelemetryCollector } from './telemetry/telemetryCollector.js';
import { EconomicKernel } from './kernel/economicKernel.js';
import { OfferEngine } from './kernel/offerEngine.js';
import { Guardrails, GuardrailConfig } from './kernel/guardrails.js';
import { FunnelAgent } from './agents/funnelAgent.js';
import { ExecutionBridge } from './execution/executionBridge.js';
import { TikTokLiveAdapter } from './ingest/tiktokLiveAdapter.js';
import { OfferState } from './contracts/types.js';

export * from './contracts/types.js';
export * from './telemetry/telemetryCollector.js';
export * from './kernel/economicKernel.js';
export * from './kernel/offerEngine.js';
export * from './kernel/guardrails.js';
export * from './agents/funnelAgent.js';
export * from './execution/executionBridge.js';
export * from './ingest/tiktokLiveAdapter.js';

export interface AutonomousOfferOrchestratorConfig {
  readonly dataDir: string;
  readonly guardrails?: Partial<GuardrailConfig>;
  readonly tickIntervalMs?: number;
  readonly offerTickIntervalMs?: number;
}

export class AutonomousOfferOrchestrator {
  public readonly telemetry: TelemetryCollector;
  public readonly kernel: EconomicKernel;
  public readonly offerEngine: OfferEngine;
  public readonly guardrails: Guardrails;
  public readonly funnel: FunnelAgent;
  public readonly bridge: ExecutionBridge;
  public readonly ingestAdapter: TikTokLiveAdapter;

  private tickTimer: NodeJS.Timeout | null = null;
  private readonly offerTickIntervalMs: number;

  constructor(config: AutonomousOfferOrchestratorConfig) {
    const telemetryLog = path.join(config.dataDir, 'telemetry_production.jsonl');
    const auditLog = path.join(config.dataDir, 'audit_ledger.jsonl');
    const offerLog = path.join(config.dataDir, 'offer_production.jsonl');
    const offerSnapshot = path.join(config.dataDir, 'snapshots', 'offer_state.json');

    this.telemetry = new TelemetryCollector(telemetryLog);
    this.kernel = new EconomicKernel();
    this.offerEngine = new OfferEngine();
    this.guardrails = new Guardrails({
      minActionCooldownSec: config.guardrails?.minActionCooldownSec ?? 90,
      maxDecisionsPerHour: config.guardrails?.maxDecisionsPerHour ?? 40,
      minOfferCooldownSec: config.guardrails?.minOfferCooldownSec ?? 120,
      minPriceFloorUsd: config.guardrails?.minPriceFloorUsd ?? 1,
      maxPriceCeilingUsd: config.guardrails?.maxPriceCeilingUsd ?? 999,
      maxOffersPerHour: config.guardrails?.maxOffersPerHour ?? 30,
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
      auditLog,
      {
        offerEngine: this.offerEngine,
        offerLogPath: offerLog,
        offerSnapshotPath: offerSnapshot,
      }
    );
    this.ingestAdapter = new TikTokLiveAdapter();
    this.offerTickIntervalMs = config.offerTickIntervalMs ?? config.tickIntervalMs ?? 5000;
  }

  public start(tickIntervalMs?: number): void {
    if (this.tickTimer) return;
    const interval = tickIntervalMs ?? this.offerTickIntervalMs;
    this.tickTimer = setInterval(() => {
      this.bridge.evaluateTick();
    }, interval);
  }

  public stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.telemetry.close();
    this.bridge.close();
  }

  public getOfferState(): OfferState {
    return this.bridge.getOfferState();
  }

  public stepTick(): ReturnType<ExecutionBridge['evaluateTick']> {
    return this.bridge.evaluateTick();
  }
}
