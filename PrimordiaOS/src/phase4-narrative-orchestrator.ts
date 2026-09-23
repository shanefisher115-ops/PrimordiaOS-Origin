// src/phase4-narrative-orchestrator.ts

import * as path from 'path';
import { TelemetryCollector } from './telemetry/telemetryCollector.js';
import { EconomicKernel } from './kernel/economicKernel.js';
import { OfferEngine } from './kernel/offerEngine.js';
import { Guardrails, GuardrailConfig } from './kernel/guardrails.js';
import { FunnelAgent } from './agents/funnelAgent.js';
import { ExecutionBridge } from './execution/executionBridge.js';
import { NarrativeEngine } from './realms/narrativeEngine/narrativeEngine.js';
import { BlogEngine } from './realms/blogEngine/blogEngine.js';
import {
  NarrativeEpisode,
  NarrativeState,
  OfferState,
} from './contracts/types.js';

export * from './contracts/types.js';
export * from './telemetry/telemetryCollector.js';
export * from './kernel/economicKernel.js';
export * from './kernel/offerEngine.js';
export * from './kernel/guardrails.js';
export * from './agents/funnelAgent.js';
export * from './execution/executionBridge.js';
export * from './realms/narrativeEngine/narrativeEngine.js';
export * from './realms/narrativeEngine/narrativeSchemas.js';
export * from './realms/narrativeEngine/rules.js';
export * from './realms/blogEngine/blogEngine.js';

export interface AutonomousNarrativeOrchestratorConfig {
  readonly dataDir: string;
  readonly guardrails?: Partial<GuardrailConfig>;
  readonly tickIntervalMs?: number;
  readonly narrativeTickIntervalMs?: number;
  readonly defaultProtagonistId?: string;
}

export class AutonomousNarrativeOrchestrator {
  public readonly telemetry: TelemetryCollector;
  public readonly kernel: EconomicKernel;
  public readonly offerEngine: OfferEngine;
  public readonly narrativeEngine: NarrativeEngine;
  public readonly blogEngine: BlogEngine;
  public readonly guardrails: Guardrails;
  public readonly funnel: FunnelAgent;
  public readonly bridge: ExecutionBridge;

  private defaultProtagonistId: string;
  private tickTimer: NodeJS.Timeout | null = null;
  private readonly narrativeTickIntervalMs: number;

  constructor(config: AutonomousNarrativeOrchestratorConfig) {
    const telemetryLog = path.join(config.dataDir, 'telemetry_production.jsonl');
    const auditLog = path.join(config.dataDir, 'audit_ledger.jsonl');
    const offerLog = path.join(config.dataDir, 'offer_production.jsonl');
    const offerSnapshot = path.join(config.dataDir, 'snapshots', 'offer_state.json');
    const narrativeLog = path.join(config.dataDir, 'narrative_production.jsonl');
    const narrativeSnapshot = path.join(config.dataDir, 'snapshots', 'narrative_state.json');

    this.telemetry = new TelemetryCollector(telemetryLog);
    this.kernel = new EconomicKernel();
    this.offerEngine = new OfferEngine();
    this.narrativeEngine = new NarrativeEngine();
    this.blogEngine = new BlogEngine();
    this.funnel = new FunnelAgent();

    this.defaultProtagonistId = config.defaultProtagonistId ?? 'Sovereign-Shane';

    this.guardrails = new Guardrails({
      minActionCooldownSec: config.guardrails?.minActionCooldownSec ?? 90,
      maxDecisionsPerHour: config.guardrails?.maxDecisionsPerHour ?? 40,
      minOfferCooldownSec: config.guardrails?.minOfferCooldownSec ?? 120,
      minPriceFloorUsd: config.guardrails?.minPriceFloorUsd ?? 1,
      maxPriceCeilingUsd: config.guardrails?.maxPriceCeilingUsd ?? 999,
      maxOffersPerHour: config.guardrails?.maxOffersPerHour ?? 30,
      minProtagonistCooldownSec: config.guardrails?.minProtagonistCooldownSec ?? 60,
      maxEpisodeWordCount: config.guardrails?.maxEpisodeWordCount ?? 2000,
      allowedUrlDomains: config.guardrails?.allowedUrlDomains ?? [
        'primordialorigin.com',
        'moneyplughub.com',
        'localhost',
      ],
    });

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
        narrativeEngine: this.narrativeEngine,
        narrativeLogPath: narrativeLog,
        narrativeSnapshotPath: narrativeSnapshot,
        blogEngine: this.blogEngine,
      }
    );

    this.narrativeTickIntervalMs =
      config.narrativeTickIntervalMs ?? config.tickIntervalMs ?? 5000;
  }

  public getProtagonistId(): string {
    return this.defaultProtagonistId;
  }

  public setProtagonistId(id: string): void {
    this.defaultProtagonistId = id;
  }

  public start(tickIntervalMs?: number): void {
    if (this.tickTimer) return;
    const interval = tickIntervalMs ?? this.narrativeTickIntervalMs;
    this.tickTimer = setInterval(() => {
      this.stepTick();
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

  public getNarrativeState(): NarrativeState {
    return this.bridge.getNarrativeState();
  }

  public getLastEpisode(): NarrativeEpisode | null {
    return this.bridge.getLastNarrativeEpisode();
  }

  public getOfferState(): OfferState {
    return this.bridge.getOfferState();
  }

  public stepTick(protagonistId?: string): ReturnType<ExecutionBridge['evaluateNarrativeTick']> {
    const activeProtagonist = protagonistId ?? this.defaultProtagonistId;
    return this.bridge.evaluateNarrativeTick(this.narrativeEngine, activeProtagonist);
  }
}
