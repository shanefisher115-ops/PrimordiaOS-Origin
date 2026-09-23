// src/execution/executionBridge.ts

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TelemetryCollector } from '../telemetry/telemetryCollector.js';
import { EconomicKernel } from '../kernel/economicKernel.js';
import { Guardrails } from '../kernel/guardrails.js';
import { FunnelAgent } from '../agents/funnelAgent.js';
import { OfferEngine } from '../kernel/offerEngine.js';
import { BlogEngine } from '../realms/blogEngine/blogEngine.js';
import { BlogPublisher } from '../realms/blogEngine/publisher.js';
import { NarrativeEngine } from '../realms/narrativeEngine/narrativeEngine.js';
import {
  AuditEntry,
  Decision,
  OfferDecision,
  OfferState,
  BlogPost,
  TopicState,
  ImmersiveState,
  CinematicState,
  NarrativeEpisode,
  NarrativeState,
} from '../contracts/types.js';

export interface ExecutionBridgeOptions {
  readonly offerEngine?: OfferEngine;
  readonly offerLogPath?: string;
  readonly offerSnapshotPath?: string;
  readonly enableOfferEvaluation?: boolean;
  readonly blogEngine?: BlogEngine;
  readonly blogPublisher?: BlogPublisher;
  readonly narrativeEngine?: NarrativeEngine;
  readonly narrativeLogPath?: string;
  readonly narrativeSnapshotPath?: string;
}

export class ExecutionBridge {
  private lastStateHash: string = '0000000000000000';
  private lastOfferStateHash: string = '0000000000000000';
  private lastBlogStateHash: string = '0000000000000000';
  private lastNarrativeStateHash: string = '0000000000000000';
  private lastBlogPost: BlogPost | null = null;
  private offerState: OfferState = { activeOffer: null, lastOfferTs: 0 };
  private narrativeState: NarrativeState = {
    activeEpisode: null,
    lastEpisodeTs: 0,
    totalEpisodesGenerated: 0,
    protagonistHistory: [],
  };
  private readonly offerEngine?: OfferEngine;
  private readonly offerLogPath?: string;
  private readonly offerSnapshotPath?: string;
  private readonly blogEngine?: BlogEngine;
  private readonly blogPublisher?: BlogPublisher;
  private readonly narrativeEngine?: NarrativeEngine;
  private readonly narrativeLogPath?: string;
  private readonly narrativeSnapshotPath?: string;

  constructor(
    private readonly telemetry: TelemetryCollector,
    private readonly kernel: EconomicKernel,
    private readonly guardrails: Guardrails,
    private readonly funnel: FunnelAgent,
    private readonly auditLogPath: string,
    options?: ExecutionBridgeOptions
  ) {
    this.offerEngine = options?.offerEngine;
    this.offerLogPath = options?.offerLogPath;
    this.offerSnapshotPath = options?.offerSnapshotPath;
    this.blogEngine = options?.blogEngine;
    this.blogPublisher = options?.blogPublisher;
    this.narrativeEngine = options?.narrativeEngine;
    this.narrativeLogPath = options?.narrativeLogPath;
    this.narrativeSnapshotPath = options?.narrativeSnapshotPath;

    const dir = path.dirname(auditLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (this.offerLogPath) {
      const offerDir = path.dirname(this.offerLogPath);
      if (!fs.existsSync(offerDir)) {
        fs.mkdirSync(offerDir, { recursive: true });
      }
    }

    if (this.offerSnapshotPath) {
      const snapDir = path.dirname(this.offerSnapshotPath);
      if (!fs.existsSync(snapDir)) {
        fs.mkdirSync(snapDir, { recursive: true });
      }
    }

    if (this.narrativeLogPath) {
      const narrativeDir = path.dirname(this.narrativeLogPath);
      if (!fs.existsSync(narrativeDir)) {
        fs.mkdirSync(narrativeDir, { recursive: true });
      }
    }

    if (this.narrativeSnapshotPath) {
      const snapDir = path.dirname(this.narrativeSnapshotPath);
      if (!fs.existsSync(snapDir)) {
        fs.mkdirSync(snapDir, { recursive: true });
      }
    }

    this.lastOfferStateHash = this.computeStateHash(this.offerState);
    this.lastNarrativeStateHash = this.computeStateHash(this.narrativeState);
  }

  /**
   * Main evaluation loop tick:
   * 1. Evaluates Phase 2 Economic Decisions
   * 2. If OfferEngine is configured, evaluates Phase 3 Autonomous Offer Engine
   */
  public evaluateTick(): {
    evaluated: number;
    applied: number;
    suppressed: number;
    offerEvaluated?: number;
    offerApplied?: number;
    offerSuppressed?: number;
  } {
    const economicState = this.telemetry.getEconomicState();
    const currentFunnelState = this.funnel.getState();

    // ── 1. Phase 2 Economic Decisions ──────────────────────────────────────────
    const candidateDecisions = this.kernel.evaluate(economicState, currentFunnelState);
    let appliedCount = 0;
    let suppressedCount = 0;

    for (const decision of candidateDecisions) {
      const guardResult = this.guardrails.validate(decision);

      if (!guardResult.allowed) {
        suppressedCount++;
        this.logAuditRecord({
          auditId: crypto.randomUUID(),
          timestampMs: Date.now(),
          decisionId: decision.decisionId,
          ruleTriggered: decision.ruleTriggered,
          action: decision.action,
          status: 'SUPPRESSED_BY_GUARDRAIL',
          previousStateHash: this.lastStateHash,
          newStateHash: this.lastStateHash,
          guardrailRejectionReason: guardResult.rejectionReason,
          payloadSnapshot: decision.payload,
        });
        continue;
      }

      // Execute Approved Decision
      try {
        const prevStateHash = this.lastStateHash;
        const updatedState = this.funnel.applyDecision(decision);
        this.guardrails.commit(decision);

        this.telemetry.setFunnelContext(updatedState.funnelId, updatedState.activeCtaId);

        const nextHash = this.computeStateHash(updatedState);
        this.lastStateHash = nextHash;

        this.logAuditRecord({
          auditId: crypto.randomUUID(),
          timestampMs: Date.now(),
          decisionId: decision.decisionId,
          ruleTriggered: decision.ruleTriggered,
          action: decision.action,
          status: 'APPLIED',
          previousStateHash: prevStateHash,
          newStateHash: nextHash,
          payloadSnapshot: decision.payload,
        });

        appliedCount++;
        break; // Apply highest-priority allowed decision per tick
      } catch (err) {
        console.error(`[ExecutionBridge] Execution failure on decision ${decision.decisionId}:`, err);
        this.logAuditRecord({
          auditId: crypto.randomUUID(),
          timestampMs: Date.now(),
          decisionId: decision.decisionId,
          ruleTriggered: decision.ruleTriggered,
          action: decision.action,
          status: 'FAILED_EXECUTION',
          previousStateHash: this.lastStateHash,
          newStateHash: this.lastStateHash,
          guardrailRejectionReason: (err as Error).message,
          payloadSnapshot: decision.payload,
        });
      }
    }

    // ── 2. Phase 3 Offer Engine Invocation (if bound) ──────────────────────────
    let offerEvaluated: number | undefined;
    let offerApplied: number | undefined;
    let offerSuppressed: number | undefined;

    if (this.offerEngine) {
      const offerResult = this.evaluateOfferTick(this.offerEngine);
      offerEvaluated = offerResult.evaluated;
      offerApplied = offerResult.applied;
      offerSuppressed = offerResult.suppressed;
    }

    // ── 3. Phase 4 Narrative Engine Invocation (if bound) ──────────────────────
    let narrativeEvaluated: number | undefined;
    let narrativeApplied: number | undefined;
    let narrativeSuppressed: number | undefined;

    if (this.narrativeEngine) {
      const narrativeResult = this.evaluateNarrativeTick(this.narrativeEngine);
      narrativeEvaluated = narrativeResult.evaluated;
      narrativeApplied = narrativeResult.applied;
      narrativeSuppressed = narrativeResult.suppressed;
    }

    return {
      evaluated: candidateDecisions.length,
      applied: appliedCount,
      suppressed: suppressedCount,
      ...(offerEvaluated !== undefined ? { offerEvaluated, offerApplied, offerSuppressed } : {}),
      ...(narrativeEvaluated !== undefined ? { narrativeEvaluated, narrativeApplied, narrativeSuppressed } : {}),
    };
  }

  /**
   * Evaluates Phase 3 Autonomous Offer Decision tick explicitly:
   * - Queries OfferEngine
   * - Validates against sovereign guardrails
   * - Hashes OfferState (before and after)
   * - Mutates FunnelAgent CTA state
   * - Appends to audit ledger with type "OFFER_DECISION"
   * - Appends to offer_production.jsonl and snapshots offer_state.json
   */
  public evaluateOfferTick(engine?: OfferEngine): {
    evaluated: number;
    applied: number;
    suppressed: number;
    decision: OfferDecision | null;
  } {
    const activeEngine = engine ?? this.offerEngine ?? new OfferEngine();
    const economicState = this.telemetry.getEconomicState();
    const currentFunnelState = this.funnel.getState();

    const offerDecision = activeEngine.evaluate(
      economicState,
      this.telemetry,
      currentFunnelState
    );

    if (!offerDecision) {
      return { evaluated: 0, applied: 0, suppressed: 0, decision: null };
    }

    const guardResult = this.guardrails.validateOffer(offerDecision);
    const stateHashBefore = this.computeStateHash(this.offerState);

    if (!guardResult.allowed) {
      this.logAuditRecord({
        auditId: crypto.randomUUID(),
        timestampMs: Date.now(),
        decisionId: offerDecision.id,
        ruleTriggered: offerDecision.ruleTriggered,
        action: 'OFFER_DECISION',
        status: 'SUPPRESSED_BY_GUARDRAIL',
        previousStateHash: this.lastStateHash,
        newStateHash: this.lastStateHash,
        stateHashBefore,
        stateHashAfter: stateHashBefore,
        type: 'OFFER_DECISION',
        offerDecision,
        guardrailRejectionReason: guardResult.rejectionReason,
        payloadSnapshot: offerDecision.payload,
      });

      return { evaluated: 1, applied: 0, suppressed: 1, decision: offerDecision };
    }

    try {
      this.offerState = {
        activeOffer: offerDecision,
        lastOfferTs: offerDecision.ts,
      };

      this.guardrails.commitOffer(offerDecision);

      const updatedFunnelState = this.funnel.applyOfferState(this.offerState);
      this.telemetry.setFunnelContext(
        updatedFunnelState.funnelId,
        updatedFunnelState.activeCtaId
      );

      const stateHashAfter = this.computeStateHash(this.offerState);
      this.lastOfferStateHash = stateHashAfter;

      this.logAuditRecord({
        auditId: crypto.randomUUID(),
        timestampMs: Date.now(),
        decisionId: offerDecision.id,
        ruleTriggered: offerDecision.ruleTriggered,
        action: 'OFFER_DECISION',
        status: 'APPLIED',
        previousStateHash: this.lastStateHash,
        newStateHash: this.lastStateHash,
        stateHashBefore,
        stateHashAfter,
        type: 'OFFER_DECISION',
        offerDecision,
        payloadSnapshot: offerDecision.payload,
      });

      this.logOfferProductionRecord({
        timestampMs: offerDecision.ts,
        offerDecision,
        stateHashBefore,
        stateHashAfter,
        status: 'APPLIED',
      });

      this.persistOfferSnapshot();

      return { evaluated: 1, applied: 1, suppressed: 0, decision: offerDecision };
    } catch (err) {
      console.error(`[ExecutionBridge] Execution failure on offer ${offerDecision.id}:`, err);
      this.logAuditRecord({
        auditId: crypto.randomUUID(),
        timestampMs: Date.now(),
        decisionId: offerDecision.id,
        ruleTriggered: offerDecision.ruleTriggered,
        action: 'OFFER_DECISION',
        status: 'FAILED_EXECUTION',
        previousStateHash: this.lastStateHash,
        newStateHash: this.lastStateHash,
        stateHashBefore,
        stateHashAfter: stateHashBefore,
        type: 'OFFER_DECISION',
        offerDecision,
        guardrailRejectionReason: (err as Error).message,
        payloadSnapshot: offerDecision.payload,
      });

      return { evaluated: 1, applied: 0, suppressed: 1, decision: offerDecision };
    }
  }

  /**
   * Evaluates Phase 3 Autonomous Blog Engine tick:
   * 1. Invokes BlogEngine
   * 2. Hashes stateBefore
   * 3. Validates against sovereign guardrails (validateBlogPost)
   * 4. Computes SHA-256 postHash
   * 5. Publishes post to disk via BlogPublisher (if configured) or notifies FunnelAgent
   * 6. Appends audit record with:
   *    - type: "BLOG_POST"
   *    - topic: post.realm
   *    - stateHashBefore
   *    - stateHashAfter
   *    - postHash
   */
  public evaluateBlogTick(
    topicState: TopicState,
    immersiveState?: ImmersiveState,
    cinematicState?: CinematicState,
    engine?: BlogEngine
  ): {
    evaluated: number;
    applied: number;
    suppressed: number;
    post: BlogPost | null;
    guardrailRejectionReason?: string;
  } {
    const activeEngine = engine ?? this.blogEngine ?? new BlogEngine();
    const economicState = this.telemetry.getEconomicState();

    const post = activeEngine.generate(
      topicState,
      economicState,
      immersiveState,
      cinematicState
    );

    const guardResult = this.guardrails.validateBlogPost(post, topicState);
    const stateHashBefore = this.lastBlogStateHash;
    const postHash = crypto.createHash('sha256').update(JSON.stringify(post)).digest('hex');

    if (!guardResult.allowed) {
      this.logAuditRecord({
        auditId: crypto.randomUUID(),
        timestampMs: Date.now(),
        decisionId: post.id,
        ruleTriggered: `BLOG_${post.realm}`,
        action: 'BLOG_POST',
        status: 'SUPPRESSED_BY_GUARDRAIL',
        previousStateHash: this.lastStateHash,
        newStateHash: this.lastStateHash,
        type: 'BLOG_POST',
        topic: String(post.realm),
        blogPost: post,
        stateHashBefore,
        stateHashAfter: stateHashBefore,
        postHash,
        guardrailRejectionReason: guardResult.rejectionReason,
        payloadSnapshot: {
          slug: post.slug,
          wordCount: post.wordCount,
          glyphs: post.glyphs,
        },
      });

      return {
        evaluated: 1,
        applied: 0,
        suppressed: 1,
        post,
        guardrailRejectionReason: guardResult.rejectionReason,
      };
    }

    try {
      this.guardrails.commitBlogPost(post);
      this.lastBlogPost = post;

      if (this.blogPublisher) {
        this.blogPublisher.publish(post);
      } else {
        this.funnel.notifyBlogPost(post);
      }

      const stateHashAfter = this.computeStateHash({
        lastPostId: post.id,
        slug: post.slug,
        auditHash: post.auditHash,
        ts: post.ts,
      });
      this.lastBlogStateHash = stateHashAfter;

      this.logAuditRecord({
        auditId: crypto.randomUUID(),
        timestampMs: Date.now(),
        decisionId: post.id,
        ruleTriggered: `BLOG_${post.realm}`,
        action: 'BLOG_POST',
        status: 'APPLIED',
        previousStateHash: this.lastStateHash,
        newStateHash: this.lastStateHash,
        type: 'BLOG_POST',
        topic: String(post.realm),
        blogPost: post,
        stateHashBefore,
        stateHashAfter,
        postHash,
        payloadSnapshot: {
          slug: post.slug,
          title: post.title,
          wordCount: post.wordCount,
          glyphs: post.glyphs,
          tags: post.tags,
        },
      });

      return {
        evaluated: 1,
        applied: 1,
        suppressed: 0,
        post,
      };
    } catch (err) {
      console.error(`[ExecutionBridge] Execution failure on blog post ${post.id}:`, err);
      this.logAuditRecord({
        auditId: crypto.randomUUID(),
        timestampMs: Date.now(),
        decisionId: post.id,
        ruleTriggered: `BLOG_${post.realm}`,
        action: 'BLOG_POST',
        status: 'FAILED_EXECUTION',
        previousStateHash: this.lastStateHash,
        newStateHash: this.lastStateHash,
        type: 'BLOG_POST',
        topic: String(post.realm),
        blogPost: post,
        stateHashBefore,
        stateHashAfter: stateHashBefore,
        postHash,
        guardrailRejectionReason: (err as Error).message,
        payloadSnapshot: {
          slug: post.slug,
        },
      });

      return {
        evaluated: 1,
        applied: 0,
        suppressed: 1,
        post,
        guardrailRejectionReason: (err as Error).message,
      };
    }
  }

  public getOfferState(): OfferState {
    return { ...this.offerState };
  }

  public setOfferState(state: OfferState): void {
    this.offerState = { ...state };
    this.lastOfferStateHash = this.computeStateHash(this.offerState);
  }

  public getLastStateHash(): string {
    return this.lastStateHash;
  }

  public getLastOfferStateHash(): string {
    return this.lastOfferStateHash;
  }

  public getLastBlogStateHash(): string {
    return this.lastBlogStateHash;
  }

  public getLastBlogPost(): BlogPost | null {
    return this.lastBlogPost;
  }

  public getLastNarrativeEpisode(): NarrativeEpisode | null {
    return this.narrativeState.activeEpisode;
  }

  /**
   * Evaluates Phase 4 Immersive Narrative Episode tick:
   * - Queries NarrativeEngine
   * - Validates against sovereign narrative guardrails
   * - Hashes NarrativeState (stateHashBefore, stateHashAfter)
   * - Broadcasts NARRATIVE_EPISODE_CREATED via FunnelAgent
   * - Appends to audit ledger with type "NARRATIVE_EPISODE"
   * - Appends to narrative_production.jsonl and snapshots narrative_state.json
   */
  public evaluateNarrativeTick(engine?: NarrativeEngine, protagonistId?: string): {
    evaluated: number;
    applied: number;
    suppressed: number;
    episode: NarrativeEpisode | null;
  } {
    const activeEngine = engine ?? this.narrativeEngine ?? new NarrativeEngine();
    const economicState = this.telemetry.getEconomicState();
    const currentFunnelState = this.funnel.getState();

    const episode = activeEngine.evaluate(
      this.telemetry,
      economicState,
      this.offerState,
      currentFunnelState,
      null,
      protagonistId
    );

    if (!episode) {
      return { evaluated: 0, applied: 0, suppressed: 0, episode: null };
    }

    const guardResult = this.guardrails.validateNarrative(episode);
    const stateHashBefore = this.computeStateHash(this.narrativeState);

    if (!guardResult.allowed) {
      this.logAuditRecord({
        auditId: crypto.randomUUID(),
        timestampMs: episode.ts,
        decisionId: episode.id,
        ruleTriggered: 'NARRATIVE_GUARDRAIL_GATING',
        action: 'NARRATIVE_EPISODE',
        status: 'SUPPRESSED_BY_GUARDRAIL',
        previousStateHash: this.lastStateHash,
        newStateHash: this.lastStateHash,
        stateHashBefore,
        stateHashAfter: stateHashBefore,
        type: 'NARRATIVE_EPISODE',
        episodeId: episode.id,
        protagonistId: episode.protagonistId,
        realmFocus: episode.realmFocus,
        episodeHash: episode.auditHash,
        narrativeEpisode: episode,
        guardrailRejectionReason: guardResult.rejectionReason,
        payloadSnapshot: episode,
      });

      return { evaluated: 1, applied: 0, suppressed: 1, episode };
    }

    try {
      this.narrativeState = {
        activeEpisode: episode,
        lastEpisodeTs: episode.ts,
        totalEpisodesGenerated: this.narrativeState.totalEpisodesGenerated + 1,
        protagonistHistory: [...this.narrativeState.protagonistHistory, episode.protagonistId].slice(-20),
      };

      this.guardrails.commitNarrative(episode);

      const stateHashAfter = this.computeStateHash(this.narrativeState);
      this.lastNarrativeStateHash = stateHashAfter;

      this.funnel.broadcastNarrativeEpisode(episode);

      // Link optionally to BlogEngine
      if (this.blogEngine && typeof (this.blogEngine as any).linkNarrativeEpisode === 'function') {
        try {
          const blogPost = (this.blogEngine as any).linkNarrativeEpisode(episode);
          if (this.blogPublisher) {
            this.blogPublisher.publish(blogPost);
          }
        } catch (err) {
          console.error('[ExecutionBridge] Error linking narrative to blog post:', err);
        }
      }

      this.logAuditRecord({
        auditId: crypto.randomUUID(),
        timestampMs: episode.ts,
        decisionId: episode.id,
        ruleTriggered: 'NARRATIVE_EPISODE_SYNTHESIS',
        action: 'NARRATIVE_EPISODE',
        status: 'APPLIED',
        previousStateHash: this.lastStateHash,
        newStateHash: this.lastStateHash,
        stateHashBefore,
        stateHashAfter,
        type: 'NARRATIVE_EPISODE',
        episodeId: episode.id,
        protagonistId: episode.protagonistId,
        realmFocus: episode.realmFocus,
        episodeHash: episode.auditHash,
        narrativeEpisode: episode,
        payloadSnapshot: episode,
      });

      this.logNarrativeProductionRecord({
        timestampMs: episode.ts,
        episode,
        stateHashBefore,
        stateHashAfter,
        status: 'APPLIED',
      });

      this.persistNarrativeSnapshot();

      return { evaluated: 1, applied: 1, suppressed: 0, episode };
    } catch (err) {
      console.error(`[ExecutionBridge] Execution failure on narrative episode ${episode.id}:`, err);
      this.logAuditRecord({
        auditId: crypto.randomUUID(),
        timestampMs: episode.ts,
        decisionId: episode.id,
        ruleTriggered: 'NARRATIVE_EPISODE_SYNTHESIS',
        action: 'NARRATIVE_EPISODE',
        status: 'FAILED_EXECUTION',
        previousStateHash: this.lastStateHash,
        newStateHash: this.lastStateHash,
        stateHashBefore,
        stateHashAfter: stateHashBefore,
        type: 'NARRATIVE_EPISODE',
        episodeId: episode.id,
        protagonistId: episode.protagonistId,
        realmFocus: episode.realmFocus,
        episodeHash: episode.auditHash,
        narrativeEpisode: episode,
        guardrailRejectionReason: (err as Error).message,
        payloadSnapshot: episode,
      });

      return { evaluated: 1, applied: 0, suppressed: 1, episode };
    }
  }

  public getNarrativeState(): NarrativeState {
    return { ...this.narrativeState };
  }

  public setNarrativeState(state: NarrativeState): void {
    this.narrativeState = { ...state };
    this.lastNarrativeStateHash = this.computeStateHash(this.narrativeState);
  }

  public getLastNarrativeStateHash(): string {
    return this.lastNarrativeStateHash;
  }

  private logNarrativeProductionRecord(entry: unknown): void {
    if (this.narrativeLogPath) {
      fs.appendFileSync(this.narrativeLogPath, JSON.stringify(entry) + '\n', 'utf-8');
    }
  }

  private persistNarrativeSnapshot(): void {
    if (this.narrativeSnapshotPath) {
      fs.writeFileSync(
        this.narrativeSnapshotPath,
        JSON.stringify(this.narrativeState, null, 2),
        'utf-8'
      );
    }
  }

  public computeStateHash(state: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);
  }

  private logAuditRecord(entry: AuditEntry): void {
    fs.appendFileSync(this.auditLogPath, JSON.stringify(entry) + '\n', 'utf-8');
  }

  private logOfferProductionRecord(entry: unknown): void {
    if (this.offerLogPath) {
      fs.appendFileSync(this.offerLogPath, JSON.stringify(entry) + '\n', 'utf-8');
    }
  }

  private persistOfferSnapshot(): void {
    if (this.offerSnapshotPath) {
      fs.writeFileSync(
        this.offerSnapshotPath,
        JSON.stringify(this.offerState, null, 2),
        'utf-8'
      );
    }
  }

  public close(): void {
    // Synchronous flush complete
  }
}
