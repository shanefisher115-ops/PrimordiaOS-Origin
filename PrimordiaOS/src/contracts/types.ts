// src/contracts/types.ts

/**
 * Supported ingest event classifications.
 */
export type LiveEventType =
  | 'VIEWER_JOIN'
  | 'CHAT_MESSAGE'
  | 'GIFT_DONATION'
  | 'SHARE'
  | 'FOLLOW'
  | 'FUNNEL_IMPRESSION'
  | 'FUNNEL_CLICK'
  | 'CONVERSION_SUCCESS';

/**
 * Classified intent extracted from chat messages.
 */
export type ChatIntentType =
  | 'LINK_REQUEST'      // e.g. "where is the link", "how do I get it"
  | 'ACCESS_QUERY'      // e.g. "how do I join", "is it open"
  | 'PRICE_QUERY'       // e.g. "how much", "cost"
  | 'POSITIVE_AFFIRM'   // e.g. "bought it", "super fire", "W"
  | 'GENERAL_NOISE';

/**
 * Normalized live event contract emitted by ingest agents.
 */
export interface LiveEvent {
  readonly eventId: string;
  readonly sequence: number;
  readonly platform: 'tiktok_live' | 'origin_web' | 'moneyplughub';
  readonly type: LiveEventType;
  readonly timestampMs: number;
  readonly payload: {
    readonly userId?: string;
    readonly username?: string;
    readonly text?: string;
    readonly intent?: ChatIntentType;
    readonly giftValueCoins?: number;
    readonly giftName?: string;
    readonly targetUrl?: string;
    readonly orderValueUsd?: number;
    readonly [key: string]: unknown;
  };
}

/**
 * Telemetry metrics snapshot computed across rolling time windows.
 */
export interface RollingWindowMetrics {
  readonly windowDurationSec: number;
  readonly currentViewers: number;
  readonly chatVelocityPerMin: number;
  readonly giftCoinsPerMin: number;
  readonly shareVelocityPerMin: number;
  readonly linkRequestVelocityPerMin: number;
  readonly funnelImpressions: number;
  readonly funnelClicks: number;
  readonly conversions: number;
  readonly clickThroughRate: number; // 0.0 to 1.0
  readonly conversionRate: number;   // 0.0 to 1.0
}

/**
 * Complete consolidated economic state provided to the decision kernel.
 */
export interface EconomicState {
  readonly timestampMs: number;
  readonly microWindow: RollingWindowMetrics;  // e.g., 60 seconds
  readonly macroWindow: RollingWindowMetrics;  // e.g., 300 seconds
  readonly activeFunnelId: string;
  readonly currentCtaId: string;
  readonly isSystemThrottled: boolean;
}

/**
 * Actions the economic kernel can propose.
 */
export type DecisionActionType =
  | 'UPDATE_CTA'
  | 'TRIGGER_URGENCY_PIN'
  | 'SWITCH_OFFER_TIER'
  | 'THROTTLE_TRAFFIC'
  | 'MAINTAIN_STATE'
  | 'OFFER_DECISION';

/**
 * Formal decision output emitted by the economic kernel.
 */
export interface Decision {
  readonly decisionId: string;
  readonly timestampMs: number;
  readonly ruleTriggered: string;
  readonly action: DecisionActionType;
  readonly priority: number; // 1 (highest) to 100 (lowest)
  readonly idempotencyKey: string;
  readonly payload: {
    readonly targetCtaId?: string;
    readonly ctaLabel?: string;
    readonly targetUrl?: string;
    readonly messageToPin?: string;
    readonly promoExpiresAtMs?: number;
    readonly discountPercent?: number;
    readonly [key: string]: unknown;
  };
  readonly rationale: string;
}

/**
 * Supported autonomous offer types.
 */
export type OfferType = 'STATIC' | 'DYNAMIC' | 'VIP' | 'RECOVERY';

/**
 * Sovereign Blog Topic Realms.
 */
export type BlogTopic =
  | 'PRIMORDIAOS_CORE'
  | 'PLUGIN_OS'
  | 'MONEYPLUGHUB'
  | 'PRIMORDIAL_ORIGIN'
  | 'IMMERSIVE_COMPUTATION'
  | 'CINEMATIC_PROTAGONIST_ENGINE'
  | 'SPATIAL_COMPUTATION_REALM'
  | 'MULTI_REALM_OS_THEORY'
  | 'ANTIGRAV_PHILOSOPHY';

/**
 * Permitted sovereign glyph bindings.
 */
export type SovereignGlyph = 'Starflare' | 'Spiral' | 'Seed' | 'Clock' | 'Gate';

/**
 * Canonical BlogPost contract.
 */
export interface BlogPost {
  readonly id: string;
  readonly ts: number;
  readonly title: string;
  readonly slug: string;
  readonly realm: BlogTopic | string;
  readonly tags: readonly string[];
  readonly body: string;
  readonly idempotencyKey: string;
  readonly auditHash: string;
  readonly glyphs?: readonly SovereignGlyph[];
  readonly wordCount?: number;
  readonly ctaUrl?: string;
  readonly ctaText?: string;
}

/**
 * Topic rotation and lineage state tracked across blog tick cycles.
 */
export interface TopicState {
  readonly activeTopic: BlogTopic;
  readonly topicIndex: number;
  readonly lastPublishedTs: number;
  readonly rotationOrder: readonly BlogTopic[];
  readonly totalPublished: number;
  readonly recentHistory: readonly {
    readonly topic: BlogTopic;
    readonly postId: string;
    readonly ts: number;
  }[];
}

/**
 * Telemetry and state feeds from immersive computation (Niagara / Unreal).
 */
export interface ImmersiveState {
  readonly spatialCluster: string;
  readonly attentionWeight: number;
  readonly simulationFps: number;
  readonly activeNiagaraParticles: number;
  readonly visualLut: string;
}

/**
 * Narrative and scene feeds from cinematic protagonist engine.
 */
export interface CinematicState {
  readonly protagonistId: string;
  readonly scenePhase: string;
  readonly narrativeAltitude: number;
  readonly activeArc: string;
}

/**
 * Blog event broadcast types.
 */
export type BlogEventType = 'BLOG_POST_CREATED' | 'BLOG_LINEAGE_UPDATED' | 'BLOG_COOLDOWN_ACTIVE';

/**
 * Canonical Phase 3 OfferDecision contract extending sovereign Decision.
 */
export interface OfferDecision extends Decision {
  readonly id: string;
  readonly ts: number;
  readonly offerType: OfferType;
  readonly price: number;
  readonly ctaText: string;
  readonly cooldownKey: string;
  readonly destinationUrl: string;
  readonly reason: string;
}

/**
 * Offer state model tracked across tick cycles.
 */
export interface OfferState {
  readonly activeOffer: OfferDecision | null;
  readonly lastOfferTs: number;
}

/**
 * Offer event broadcast signatures.
 */
export type OfferEventType = 'OFFER_UPDATED' | 'OFFER_CLEARED';

/**
 * Supported narrative beat types.
 */
export type NarrativeBeatType = 'DISCOVERY' | 'THRESHOLD' | 'TRIAL' | 'REWARD' | 'REVELATION';

/**
 * Deterministic narrative beat grounded in system telemetry.
 */
export interface NarrativeBeat {
  readonly beatId: string;
  readonly beatType: NarrativeBeatType;
  readonly title: string;
  readonly narrativeText: string;
  readonly groundedSignal: string;
  readonly glyph?: SovereignGlyph;
  readonly sequence: number;
}

/**
 * Canonical 3-act narrative structure.
 */
export interface ActStructure {
  readonly actI: {
    readonly name: string;
    readonly exposition: string;
    readonly beats: readonly NarrativeBeat[];
  };
  readonly actII: {
    readonly name: string;
    readonly conflict: string;
    readonly beats: readonly NarrativeBeat[];
  };
  readonly actIII: {
    readonly name: string;
    readonly resolution: string;
    readonly beats: readonly NarrativeBeat[];
  };
}

/**
 * Approved sovereign narrative realm focus topics.
 */
export type NarrativeRealmFocus =
  | 'PRIMORDIAOS_CORE'
  | 'PLUGIN_OS'
  | 'MONEYPLUGHUB'
  | 'PRIMORDIAL_ORIGIN'
  | 'IMMERSIVE_COMPUTATION'
  | 'CINEMATIC_PROTAGONIST_OS'
  | 'OFFER_ENGINE'
  | 'OFFER_ENGINE_TRIALS'
  | 'ANTIGRAV_SOVEREIGN_MYTH'
  | string;

/**
 * Canonical Phase 4 NarrativeEpisode contract.
 */
export interface NarrativeEpisode {
  readonly id: string;
  readonly ts: number;
  readonly protagonistId: string;
  readonly realmFocus: NarrativeRealmFocus;
  readonly title: string;
  readonly actStructure: ActStructure;
  readonly beats: readonly NarrativeBeat[];
  readonly linkedOfferId?: string;
  readonly linkedBlogPostId?: string;
  readonly idempotencyKey: string;
  readonly auditHash: string;
  readonly wordCount: number;
}

/**
 * Narrative state tracked across tick cycles.
 */
export interface NarrativeState {
  readonly activeEpisode: NarrativeEpisode | null;
  readonly lastEpisodeTs: number;
  readonly totalEpisodesGenerated: number;
  readonly protagonistHistory: readonly string[];
}

/**
 * Narrative event broadcast signatures.
 */
export type NarrativeEventType = 'NARRATIVE_EPISODE_CREATED';

/**
 * Gatekeeper evaluation response.
 */
export interface GuardrailResult {
  readonly allowed: boolean;
  readonly decision?: Decision | BlogPost | NarrativeEpisode;
  readonly rejectionCode?:
    | 'COOLDOWN_ACTIVE'
    | 'IDEMPOTENT_DUPLICATE'
    | 'INVALID_PAYLOAD'
    | 'RATE_LIMIT_EXCEEDED'
    | 'UNSAFE_PRICE_RANGE'
    | 'UNAUTHORIZED_DOMAIN'
    | 'TOPIC_ROTATION_VIOLATION'
    | 'RECURSION_LIMIT_EXCEEDED'
    | 'WORD_COUNT_OUT_OF_BOUNDS'
    | 'UNSAFE_GLYPH_BINDING'
    | 'NON_DETERMINISTIC_DRIFT'
    | 'MAX_EPISODE_LENGTH_EXCEEDED'
    | 'PROTAGONIST_COOLDOWN_ACTIVE'
    | 'TOPIC_SAFETY_VIOLATION';
  readonly rejectionReason?: string;
}

/**
 * Funnel state model maintained by funnelAgent.
 */
export interface FunnelState {
  readonly funnelId: string;
  readonly activeCtaId: string;
  readonly ctaLabel: string;
  readonly targetUrl: string;
  readonly pinnedMessage?: string;
  readonly activeTier: 'CORE' | 'ACCELERATOR' | 'SOVEREIGN_ENTERPRISE';
  readonly lastModifiedMs: number;
  readonly updateCount: number;
  readonly activeOfferPrice?: number;
}

/**
 * Audit record stored in append-only storage with chained lineage.
 */
export interface AuditEntry {
  readonly auditId: string;
  readonly timestampMs: number;
  readonly decisionId: string;
  readonly ruleTriggered: string;
  readonly action: DecisionActionType | string;
  readonly status: 'APPLIED' | 'SUPPRESSED_BY_GUARDRAIL' | 'FAILED_EXECUTION';
  readonly previousStateHash: string;
  readonly newStateHash: string;
  readonly guardrailRejectionReason?: string;
  readonly payloadSnapshot: unknown;
  // Lineage extensions (Phase 3 & 4)
  readonly type?: 'OFFER_DECISION' | 'BLOG_POST' | 'NARRATIVE_EPISODE' | string;
  readonly offerDecision?: OfferDecision;
  readonly blogPost?: BlogPost;
  readonly narrativeEpisode?: NarrativeEpisode;
  readonly episodeId?: string;
  readonly protagonistId?: string;
  readonly realmFocus?: string;
  readonly episodeHash?: string;
  readonly topic?: string;
  readonly postHash?: string;
  readonly stateHashBefore?: string;
  readonly stateHashAfter?: string;
}

export * from './phase5Types.js';
