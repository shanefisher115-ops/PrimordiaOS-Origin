/**
 * ==============================================================================
 * ⭐ THE REAL PHOM BUILD PLAN — CORE TYPES
 * Minimal viable architecture preserving sovereign design.
 * ==============================================================================
 */

// ── Layer 0: External Inputs ──────────────────────────────────────────────────
export interface SignalEnvelope<T = any> {
  id: string;
  source: 'x' | 'linkedin' | 'reddit' | 'website' | 'email' | 'tiktok' | 'instagram' | 'bluesky' | 'mastodon' | string;
  author: string;
  content: string;
  url: string;
  timestamp: number; // Unix epoch in seconds (e.g. 1690000000)
  timezone?: string;
  normalizedTimestamp: {
    utc: number;
    local: string;
    iso: string;
  };
  payload?: T;
  metadata: Record<string, unknown>;
  hash?: string;
  raw?: any;
}

export interface NormalizedSignal {
  id?: string;
  source: 'x' | 'linkedin' | 'reddit' | 'website' | 'email' | string;
  author: string;
  content: string;
  url: string;
  timestamp: number; // Unix epoch in seconds (e.g. 1690000000)
  metadata?: Record<string, unknown>;
}

// ── Layer 1: Discovery Engine ─────────────────────────────────────────────────
export interface CorporateEnrichment {
  industry: string;
  companySize: string;
  techStack: string[];
}

export interface ProspectConfidenceScore {
  score: number; // 0 - 100
  confidence: 'low' | 'medium' | 'high' | 'verified';
  breakdown: {
    validity: number;
    domainTrust: number;
    mxStrength: number;
    reputation: number;
  };
}

export interface ExtractedProspect {
  id?: string;
  email: string | null;
  name: string | null;
  domain: string | null;
  mxVerified?: boolean;
  mxRecords?: string;
  enrichment?: CorporateEnrichment;
  confidenceScore?: ProspectConfidenceScore;
  mergedSignalsCount?: number;
}

// ── Layer 2: Heat-Orbit Scoring ───────────────────────────────────────────────
export type HeatBand = 'cold' | 'warm' | 'hot' | 'FROZEN' | 'WARM' | 'HOT' | 'SUPERCRITICAL';

export interface HeatDriftResult {
  currentHeat: number;
  initialHeat: number;
  driftDelta: number;
  percentDecayed: number;
  isDrifted: boolean;
  lastActiveTimestamp: number;
}

export interface IntentQuorumResult {
  quorumReached: boolean;
  agreementCount: number;
  quorumScore: number;
  intentLevel: 'low' | 'medium' | 'high' | 'ultra';
  matchedIntents: string[];
}

export interface BehaviorDepthMetrics {
  scrollDepthPct?: number; // 0 - 100
  dwellTimeSeconds?: number;
  pageViews?: number;
  clickVelocity?: number;
}

export interface ProspectScore {
  heat: number; // 0–100
  band: HeatBand;
  intentLevel?: 'low' | 'medium' | 'high' | 'ultra';
  drift?: HeatDriftResult;
  quorum?: IntentQuorumResult;
  behaviorDepth?: BehaviorDepthMetrics;
  breakdown?: {
    sentiment: number;
    keywordScore: number;
    depthScore: number;
    matchedKeywords: string[];
  };
}

// ── Layer 3: Persona Synthesizer ──────────────────────────────────────────────
export interface CtaPreferenceModel {
  optimalCta: string;
  ctaType: 'benchmark_teardown' | 'calibrated_pilot' | 'boardroom_briefing' | 'direct_demo' | 'quick_chat';
  ctaUrl: string;
}

export interface PlatformPreferenceModel {
  preferredPlatform: string;
  platformScores: Record<string, number>;
}

export interface TimingPredictorResult {
  bestUtcHour: number;
  recommendedDay: string;
  timezone: string;
  windowDescription: string;
}

export interface SynthesizedPersona {
  id?: string;
  prospectId?: string;
  tone: string;
  interests: string[];
  preferredPlatform: string;
  ctaPreference?: CtaPreferenceModel;
  platformPreference?: PlatformPreferenceModel;
  timingPrediction?: TimingPredictorResult;
}

// ── Layer 4: Outbound Engine ──────────────────────────────────────────────────
export interface OutboundVariants {
  variantA: string; // Direct / Technical / Benchmark
  variantB: string; // Question / Ecosystem / Visionary
  variantC: string; // Minimalist / Executive / Concise
  selected: 'A' | 'B' | 'C';
}

export interface OutboundPayload {
  id?: string;
  prospectId?: string;
  personaId?: string;
  text: string;
  platform: string;
  variants?: string[];
  variantsStructured?: OutboundVariants;
  subject?: string;
  analyticsHookUrl?: string;
  fallbackPlatforms?: string[];
  escalationLevel?: 'standard' | 'priority' | 'executive';
}

// ── Layer 5: Social Distributor ───────────────────────────────────────────────
export type SocialPlatform = 'x' | 'linkedin' | 'reddit' | 'webhook' | 'tiktok' | 'instagram' | 'bluesky' | 'mastodon';

export interface DistributionResult {
  success: boolean;
  platform: string;
  postId: string;
  url: string;
  status: 'published' | 'queued' | 'mocked' | 'failed';
  error?: string;
  fallbackTriggered?: boolean;
  trackingUrl?: string;
}

// ── Layer 6: Analytics Engine ─────────────────────────────────────────────────
export interface AnalyticsMetrics {
  postId?: string;
  platform?: string;
  clicks?: number;
  impressions?: number;
  replies?: number;
  conversions?: number;
  driftDelta?: number;
  telemetrySynced?: boolean;
  [key: string]: unknown;
}

export interface StoredAnalytics {
  id: string;
  post_id: string;
  platform: string;
  clicks: number;
  impressions: number;
  replies: number;
  conversions: number;
  metrics_json: string;
  recorded_at: number;
}

// ── Layer 7: Memory Graph ─────────────────────────────────────────────────────
export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties_json: string;
  created_at: number;
}

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  relationship: string;
  weight: number;
  properties_json?: string;
  created_at: number;
}

// ── Layer 8: Agent Swarm (10 Autonomous Agents) ───────────────────────────────
export type PhomAgentName = 
  | 'discoveryAgent'
  | 'scoringAgent'
  | 'personaAgent'
  | 'outboundAgent'
  | 'distributorAgent'
  | 'analyticsAgent'
  | 'orchestratorAgent'
  | 'memoryAgent'
  | 'heatDriftAgent'
  | 'personaEvolutionAgent';

export interface AgentExecutionRecord {
  agent: PhomAgentName;
  action: string;
  status: 'success' | 'warning' | 'failed';
  durationMs: number;
  data: Record<string, unknown>;
}

// ── Server Runtime & Trace Types ──────────────────────────────────────────────
export interface PipelineTrace {
  id: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
  startedAt: number;
  completedAt?: number;
  durationMs: number;
  layersExecuted: number;
  steps: Array<{
    layer: number;
    name: string;
    status: 'success' | 'warning' | 'failed';
    durationMs: number;
    summary: string;
    details?: Record<string, unknown>;
  }>;
  records: any[];
  error?: string;
}

