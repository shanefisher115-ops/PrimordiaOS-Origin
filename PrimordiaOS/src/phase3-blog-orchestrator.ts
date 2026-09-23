// src/phase3-blog-orchestrator.ts

import * as path from 'path';
import { TelemetryCollector } from './telemetry/telemetryCollector.js';
import { EconomicKernel } from './kernel/economicKernel.js';
import { Guardrails, GuardrailConfig } from './kernel/guardrails.js';
import { FunnelAgent } from './agents/funnelAgent.js';
import { ExecutionBridge } from './execution/executionBridge.js';
import { BlogEngine } from './realms/blogEngine/blogEngine.js';
import { BlogPublisher } from './realms/blogEngine/publisher.js';
import { ALL_SOVEREIGN_TOPICS } from './realms/blogEngine/topics.js';
import {
  BlogTopic,
  TopicState,
  ImmersiveState,
  CinematicState,
  BlogPost,
} from './contracts/types.js';

export * from './contracts/types.js';
export * from './telemetry/telemetryCollector.js';
export * from './kernel/economicKernel.js';
export * from './kernel/guardrails.js';
export * from './agents/funnelAgent.js';
export * from './execution/executionBridge.js';
export * from './realms/blogEngine/blogEngine.js';
export * from './realms/blogEngine/publisher.js';
export * from './realms/blogEngine/topics.js';

export interface AutonomousBlogOrchestratorConfig {
  readonly dataDir: string;
  readonly guardrails?: Partial<GuardrailConfig>;
  readonly blogTickIntervalMs?: number;
  readonly rotationOrder?: readonly BlogTopic[];
}

export class AutonomousBlogOrchestrator {
  public readonly telemetry: TelemetryCollector;
  public readonly kernel: EconomicKernel;
  public readonly blogEngine: BlogEngine;
  public readonly publisher: BlogPublisher;
  public readonly guardrails: Guardrails;
  public readonly funnel: FunnelAgent;
  public readonly bridge: ExecutionBridge;

  private topicState: TopicState;
  private immersiveState: ImmersiveState;
  private cinematicState: CinematicState;
  private tickTimer: NodeJS.Timeout | null = null;
  private readonly blogTickIntervalMs: number;

  constructor(config: AutonomousBlogOrchestratorConfig) {
    const telemetryLog = path.join(config.dataDir, 'telemetry_production.jsonl');
    const auditLog = path.join(config.dataDir, 'audit_ledger.jsonl');
    const blogOutputDir = path.join(config.dataDir, 'blog');

    this.telemetry = new TelemetryCollector(telemetryLog);
    this.kernel = new EconomicKernel();
    this.blogEngine = new BlogEngine();
    this.funnel = new FunnelAgent();
    this.publisher = new BlogPublisher({
      outputDir: blogOutputDir,
      funnelAgent: this.funnel,
    });

    this.guardrails = new Guardrails({
      minActionCooldownSec: config.guardrails?.minActionCooldownSec ?? 90,
      maxDecisionsPerHour: config.guardrails?.maxDecisionsPerHour ?? 40,
      minOfferCooldownSec: config.guardrails?.minOfferCooldownSec ?? 120,
      minBlogCooldownSec: config.guardrails?.minBlogCooldownSec ?? 45,
      maxBlogWordCount: config.guardrails?.maxBlogWordCount ?? 2500,
      minBlogWordCount: config.guardrails?.minBlogWordCount ?? 150,
      maxBlogPostsPerHour: config.guardrails?.maxBlogPostsPerHour ?? 60,
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
        blogEngine: this.blogEngine,
        blogPublisher: this.publisher,
      }
    );

    const rotation = config.rotationOrder ?? ALL_SOVEREIGN_TOPICS;
    this.topicState = {
      activeTopic: rotation[0],
      topicIndex: 0,
      lastPublishedTs: 0,
      rotationOrder: rotation,
      totalPublished: 0,
      recentHistory: [],
    };

    this.immersiveState = {
      spatialCluster: 'Cluster-Alpha-Prime',
      attentionWeight: 0.95,
      simulationFps: 60,
      activeNiagaraParticles: 32768,
      visualLut: 'Imperial Gold',
    };

    this.cinematicState = {
      protagonistId: 'Sovereign-Shane',
      scenePhase: 'Phase3-AutonomousExecution',
      narrativeAltitude: 98,
      activeArc: 'Ascent of the Sovereign Microkernel',
    };

    this.blogTickIntervalMs = config.blogTickIntervalMs ?? 45000;
  }

  public getTopicState(): TopicState {
    return { ...this.topicState };
  }

  public setTopicState(partial: Partial<TopicState>): void {
    this.topicState = {
      ...this.topicState,
      ...partial,
    };
  }

  public getImmersiveState(): ImmersiveState {
    return { ...this.immersiveState };
  }

  public setImmersiveState(partial: Partial<ImmersiveState>): void {
    this.immersiveState = {
      ...this.immersiveState,
      ...partial,
    };
  }

  public getCinematicState(): CinematicState {
    return { ...this.cinematicState };
  }

  public setCinematicState(partial: Partial<CinematicState>): void {
    this.cinematicState = {
      ...this.cinematicState,
      ...partial,
    };
  }

  /**
   * Advances active topic sequentially through sovereign rotation order.
   */
  public advanceTopic(): BlogTopic {
    const nextIndex = (this.topicState.topicIndex + 1) % this.topicState.rotationOrder.length;
    const nextTopic = this.topicState.rotationOrder[nextIndex];
    this.topicState = {
      ...this.topicState,
      activeTopic: nextTopic,
      topicIndex: nextIndex,
    };
    return nextTopic;
  }

  /**
   * Evaluates a single autonomous blog generation & publishing tick.
   */
  public stepTick(): ReturnType<ExecutionBridge['evaluateBlogTick']> {
    const result = this.bridge.evaluateBlogTick(
      this.topicState,
      this.immersiveState,
      this.cinematicState,
      this.blogEngine
    );

    if (result.applied === 1 && result.post) {
      const publishedPost = result.post;
      const newHistory = [
        ...this.topicState.recentHistory,
        {
          topic: this.topicState.activeTopic,
          postId: publishedPost.id,
          ts: publishedPost.ts,
        },
      ].slice(-10);

      this.topicState = {
        ...this.topicState,
        lastPublishedTs: publishedPost.ts,
        totalPublished: this.topicState.totalPublished + 1,
        recentHistory: newHistory,
      };

      // Automatically advance to next topic in rotation after successful publication
      this.advanceTopic();
    }

    return result;
  }

  public start(tickIntervalMs?: number): void {
    if (this.tickTimer) return;
    const interval = tickIntervalMs ?? this.blogTickIntervalMs;
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

  public getLastPublishedPost(): BlogPost | null {
    return this.bridge.getLastBlogPost();
  }
}
