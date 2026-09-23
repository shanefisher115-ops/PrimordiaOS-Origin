// src/execution/executionBridge.ts
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { OfferEngine } from '../kernel/offerEngine.js';
import { BlogEngine } from '../realms/blogEngine/blogEngine.js';
import { NarrativeEngine } from '../realms/narrativeEngine/narrativeEngine.js';
export class ExecutionBridge {
    telemetry;
    kernel;
    guardrails;
    funnel;
    auditLogPath;
    lastStateHash = '0000000000000000';
    lastOfferStateHash = '0000000000000000';
    lastBlogStateHash = '0000000000000000';
    lastNarrativeStateHash = '0000000000000000';
    lastBlogPost = null;
    offerState = { activeOffer: null, lastOfferTs: 0 };
    narrativeState = {
        activeEpisode: null,
        lastEpisodeTs: 0,
        totalEpisodesGenerated: 0,
        protagonistHistory: [],
    };
    offerEngine;
    offerLogPath;
    offerSnapshotPath;
    blogEngine;
    blogPublisher;
    narrativeEngine;
    narrativeLogPath;
    narrativeSnapshotPath;
    constructor(telemetry, kernel, guardrails, funnel, auditLogPath, options) {
        this.telemetry = telemetry;
        this.kernel = kernel;
        this.guardrails = guardrails;
        this.funnel = funnel;
        this.auditLogPath = auditLogPath;
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
    evaluateTick() {
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
            }
            catch (err) {
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
                    guardrailRejectionReason: err.message,
                    payloadSnapshot: decision.payload,
                });
            }
        }
        // ── 2. Phase 3 Offer Engine Invocation (if bound) ──────────────────────────
        let offerEvaluated;
        let offerApplied;
        let offerSuppressed;
        if (this.offerEngine) {
            const offerResult = this.evaluateOfferTick(this.offerEngine);
            offerEvaluated = offerResult.evaluated;
            offerApplied = offerResult.applied;
            offerSuppressed = offerResult.suppressed;
        }
        // ── 3. Phase 4 Narrative Engine Invocation (if bound) ──────────────────────
        let narrativeEvaluated;
        let narrativeApplied;
        let narrativeSuppressed;
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
    evaluateOfferTick(engine) {
        const activeEngine = engine ?? this.offerEngine ?? new OfferEngine();
        const economicState = this.telemetry.getEconomicState();
        const currentFunnelState = this.funnel.getState();
        const offerDecision = activeEngine.evaluate(economicState, this.telemetry, currentFunnelState);
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
            this.telemetry.setFunnelContext(updatedFunnelState.funnelId, updatedFunnelState.activeCtaId);
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
        }
        catch (err) {
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
                guardrailRejectionReason: err.message,
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
    evaluateBlogTick(topicState, immersiveState, cinematicState, engine) {
        const activeEngine = engine ?? this.blogEngine ?? new BlogEngine();
        const economicState = this.telemetry.getEconomicState();
        const post = activeEngine.generate(topicState, economicState, immersiveState, cinematicState);
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
            }
            else {
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
        }
        catch (err) {
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
                guardrailRejectionReason: err.message,
                payloadSnapshot: {
                    slug: post.slug,
                },
            });
            return {
                evaluated: 1,
                applied: 0,
                suppressed: 1,
                post,
                guardrailRejectionReason: err.message,
            };
        }
    }
    getOfferState() {
        return { ...this.offerState };
    }
    setOfferState(state) {
        this.offerState = { ...state };
        this.lastOfferStateHash = this.computeStateHash(this.offerState);
    }
    getLastStateHash() {
        return this.lastStateHash;
    }
    getLastOfferStateHash() {
        return this.lastOfferStateHash;
    }
    getLastBlogStateHash() {
        return this.lastBlogStateHash;
    }
    getLastBlogPost() {
        return this.lastBlogPost;
    }
    getLastNarrativeEpisode() {
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
    evaluateNarrativeTick(engine, protagonistId) {
        const activeEngine = engine ?? this.narrativeEngine ?? new NarrativeEngine();
        const economicState = this.telemetry.getEconomicState();
        const currentFunnelState = this.funnel.getState();
        const episode = activeEngine.evaluate(this.telemetry, economicState, this.offerState, currentFunnelState, null, protagonistId);
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
            if (this.blogEngine && typeof this.blogEngine.linkNarrativeEpisode === 'function') {
                try {
                    const blogPost = this.blogEngine.linkNarrativeEpisode(episode);
                    if (this.blogPublisher) {
                        this.blogPublisher.publish(blogPost);
                    }
                }
                catch (err) {
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
        }
        catch (err) {
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
                guardrailRejectionReason: err.message,
                payloadSnapshot: episode,
            });
            return { evaluated: 1, applied: 0, suppressed: 1, episode };
        }
    }
    getNarrativeState() {
        return { ...this.narrativeState };
    }
    setNarrativeState(state) {
        this.narrativeState = { ...state };
        this.lastNarrativeStateHash = this.computeStateHash(this.narrativeState);
    }
    getLastNarrativeStateHash() {
        return this.lastNarrativeStateHash;
    }
    logNarrativeProductionRecord(entry) {
        if (this.narrativeLogPath) {
            fs.appendFileSync(this.narrativeLogPath, JSON.stringify(entry) + '\n', 'utf-8');
        }
    }
    persistNarrativeSnapshot() {
        if (this.narrativeSnapshotPath) {
            fs.writeFileSync(this.narrativeSnapshotPath, JSON.stringify(this.narrativeState, null, 2), 'utf-8');
        }
    }
    computeStateHash(state) {
        return crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16);
    }
    logAuditRecord(entry) {
        fs.appendFileSync(this.auditLogPath, JSON.stringify(entry) + '\n', 'utf-8');
    }
    logOfferProductionRecord(entry) {
        if (this.offerLogPath) {
            fs.appendFileSync(this.offerLogPath, JSON.stringify(entry) + '\n', 'utf-8');
        }
    }
    persistOfferSnapshot() {
        if (this.offerSnapshotPath) {
            fs.writeFileSync(this.offerSnapshotPath, JSON.stringify(this.offerState, null, 2), 'utf-8');
        }
    }
    close() {
        // Synchronous flush complete
    }
}
