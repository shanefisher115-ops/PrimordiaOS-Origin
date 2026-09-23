/**
 * ==============================================================================
 * ⭐ LAYER 2: HEAT-ORBIT SCORING
 * Scores prospects based on behavior using:
 * - Sentiment analysis (local rule-based NLP)
 * - Keyword matching (high-intent tech/buying signals)
 * - Engagement depth (length, frequency, detail)
 * - Simple scoring formula
 *
 * Deliverable:
 * function scoreProspect(prospect, signal) {
 *   return {
 *     heat: 0–100,
 *     band: "cold" | "warm" | "hot"
 *   }
 * }
 * ==============================================================================
 */

import { NormalizedSignal, ExtractedProspect, ProspectScore, HeatBand } from './types';

// Intent keywords that signal strong commercial or technical interest
const HIGH_INTENT_KEYWORDS = [
  'evaluating', 'benchmarks', 'reach out', 'contact', 'pricing', 'demo', 
  'latency', 'scale', 'cold start', 'production', 'pipeline', 'integrate',
  'buying', 'enterprise', 'interested', 'looking for', 'architecture', 
  'sqlite', 'swarms', 'migration', 'database', 'investigating'
];

const POSITIVE_SENTIMENT_TOKENS = [
  'interesting', 'great', 'solid', 'valuable', 'impressive', 'promising', 
  'love', 'optimizing', 'excited', 'solving', 'smooth', 'faster', 'sub-millisecond'
];

const NEGATIVE_SENTIMENT_TOKENS = [
  'choking', 'slow', 'failing', 'broken', 'issue', 'downtime', 'bottleneck',
  'waste', 'hate', 'bad', 'scam', 'unusable'
];

/**
 * Calculates a local sentiment score between -1.0 and 1.0.
 */
export function analyzeSentiment(text: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase();

  let positiveHits = 0;
  let negativeHits = 0;

  for (const token of POSITIVE_SENTIMENT_TOKENS) {
    if (lower.includes(token)) positiveHits++;
  }

  for (const token of NEGATIVE_SENTIMENT_TOKENS) {
    if (lower.includes(token)) negativeHits++;
  }

  const net = positiveHits - negativeHits;
  if (net > 0) return Math.min(1.0, 0.2 + (net * 0.25));
  if (net < 0) return Math.max(-1.0, -0.2 + (net * 0.25));
  return 0.1; // Neutral-inquisitive default
}

/**
 * Deliverable Function:
 * Scores prospects based on behavior and signal characteristics.
 */
export function scoreProspect(
  prospect: ExtractedProspect | Record<string, any>,
  signal: NormalizedSignal | Record<string, any>
): ProspectScore {
  const content = String(signal?.content || '');
  const lowerContent = content.toLowerCase();

  // 1. Keyword Matching
  const matchedKeywords: string[] = [];
  for (const keyword of HIGH_INTENT_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  }
  const keywordScore = Math.min(35, matchedKeywords.length * 9);

  // 2. Sentiment Analysis (-1.0 to 1.0) -> scaled -15 to +20
  const sentiment = analyzeSentiment(content);
  const sentimentScore = Math.round(sentiment * 20);

  // 3. Engagement & Behavior Depth (length, frequency, scroll depth, dwell time)
  let depthScore = 10;
  if (content.length > 60) depthScore += 5;
  if (content.length > 120) depthScore += 5;
  if (prospect?.email) depthScore += 10;
  if (prospect?.domain && typeof prospect.domain === 'string' && !prospect.domain.includes('gmail')) depthScore += 5;

  // Behavior Depth: scroll depth % and dwell time
  const scrollDepth = Number(
    signal?.metadata?.scrollDepth || 
    signal?.metadata?.scroll_depth_pct || 
    (signal as any)?.scrollDepth || 
    0
  );
  if (scrollDepth > 75) depthScore += 8;
  else if (scrollDepth > 40) depthScore += 4;

  const dwellTime = Number(
    signal?.metadata?.dwellTime || 
    signal?.metadata?.dwell_time_seconds || 
    (signal as any)?.dwellTime || 
    0
  );
  if (dwellTime > 180) depthScore += 8;
  else if (dwellTime > 60) depthScore += 4;

  // Evaluate frequency / interaction depth
  const frequency = Number(
    signal?.metadata?.frequency || 
    signal?.metadata?.interactions || 
    (signal as any)?.frequency || 
    (prospect as any)?.frequency || 
    1
  );
  if (frequency > 1) {
    depthScore += Math.min(15, (frequency - 1) * 5);
  }

  // 4. Intent Quorum Evaluation
  const quorum = evaluateIntentQuorum([signal as NormalizedSignal]);

  // 5. Base Score & Formula
  const baseHeat = 20;
  let rawHeat = baseHeat + keywordScore + sentimentScore + depthScore + (quorum.quorumReached ? 15 : 0);

  // Clamp strictly to 0 - 100
  const heat = Math.max(0, Math.min(100, Math.round(rawHeat)));

  // 6. Band Classification
  let band: HeatBand = 'cold';
  if (heat >= 70) {
    band = 'hot';
  } else if (heat >= 40) {
    band = 'warm';
  } else {
    band = 'cold';
  }

  const intentLevel = heat >= 85 ? 'ultra' : (heat >= 65 ? 'high' : (heat >= 35 ? 'medium' : 'low'));

  return {
    heat,
    band,
    intentLevel,
    quorum,
    behaviorDepth: {
      scrollDepthPct: scrollDepth,
      dwellTimeSeconds: dwellTime
    },
    breakdown: {
      sentiment,
      keywordScore,
      depthScore,
      matchedKeywords
    }
  };
}

/**
 * Calculates heat drift (score decay over time due to inactivity).
 */
export function calculateHeatDrift(
  initialHeat: number,
  lastActiveTimestamp: number,
  currentTimestamp: number = Math.floor(Date.now() / 1000),
  halfLifeHours: number = 72
): { currentHeat: number; initialHeat: number; driftDelta: number; percentDecayed: number; isDrifted: boolean; lastActiveTimestamp: number } {
  const elapsedSeconds = Math.max(0, currentTimestamp - lastActiveTimestamp);
  const elapsedHours = elapsedSeconds / 3600;

  // Exponential decay model: N(t) = N0 * (0.5)^(t / t_half)
  const decayFactor = Math.pow(0.5, elapsedHours / halfLifeHours);
  const currentHeat = Math.max(5, Math.round(initialHeat * decayFactor));
  const driftDelta = initialHeat - currentHeat;
  const percentDecayed = initialHeat > 0 ? Math.round((driftDelta / initialHeat) * 100) : 0;

  return {
    currentHeat,
    initialHeat,
    driftDelta,
    percentDecayed,
    isDrifted: driftDelta > 0,
    lastActiveTimestamp
  };
}

/**
 * Evaluates intent quorum across multiple signals agreeing on buying/evaluation intent.
 */
export function evaluateIntentQuorum(
  signals: (NormalizedSignal | Record<string, any>)[]
): { quorumReached: boolean; agreementCount: number; quorumScore: number; intentLevel: 'low' | 'medium' | 'high' | 'ultra'; matchedIntents: string[] } {
  if (!signals || signals.length === 0) {
    return { quorumReached: false, agreementCount: 0, quorumScore: 0, intentLevel: 'low', matchedIntents: [] };
  }

  const matchedIntentsSet = new Set<string>();
  let agreementCount = 0;

  for (const s of signals) {
    const text = String(s?.content || '').toLowerCase();
    let signalMatched = false;
    for (const kw of HIGH_INTENT_KEYWORDS) {
      if (text.includes(kw)) {
        matchedIntentsSet.add(kw);
        signalMatched = true;
      }
    }
    if (signalMatched) {
      agreementCount++;
    }
  }

  // Quorum reached if 2+ signals match or 3+ distinct intent keywords match
  const quorumReached = agreementCount >= 2 || matchedIntentsSet.size >= 3;
  const quorumScore = Math.min(100, (agreementCount * 25) + (matchedIntentsSet.size * 10));

  let intentLevel: 'low' | 'medium' | 'high' | 'ultra' = 'low';
  if (quorumScore >= 75) intentLevel = 'ultra';
  else if (quorumScore >= 50) intentLevel = 'high';
  else if (quorumScore >= 25) intentLevel = 'medium';

  return {
    quorumReached,
    agreementCount,
    quorumScore,
    intentLevel,
    matchedIntents: Array.from(matchedIntentsSet)
  };
}

/**
 * Aggregates multiple signals from the same prospect into a single composite score.
 */
export function aggregateMultipleSignals(
  signals: (NormalizedSignal | Record<string, any>)[],
  prospect: ExtractedProspect | Record<string, any>
): ProspectScore {
  if (!signals || signals.length === 0) {
    return scoreProspect(prospect, { content: '', author: prospect?.name || '' });
  }

  if (signals.length === 1) {
    return scoreProspect(prospect, signals[0]);
  }

  // Score each signal individually
  const scores = signals.map(s => scoreProspect(prospect, s));

  // Compute recency-weighted heat score
  const sortedSignals = [...signals].sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
  let totalWeightedHeat = 0;
  let totalWeights = 0;

  sortedSignals.forEach((s, idx) => {
    const singleScore = scoreProspect(prospect, s);
    const weight = 1 / (idx + 1); // 1.0 for most recent, 0.5 for second, etc.
    totalWeightedHeat += singleScore.heat * weight;
    totalWeights += weight;
  });

  // Multi-signal synergy boost (+5 per extra signal up to +20)
  const synergyBoost = Math.min(20, (signals.length - 1) * 5);
  const compositeHeat = Math.min(100, Math.round((totalWeightedHeat / totalWeights) + synergyBoost));

  let band: HeatBand = 'cold';
  if (compositeHeat >= 70) band = 'hot';
  else if (compositeHeat >= 40) band = 'warm';

  const quorum = evaluateIntentQuorum(signals);

  // Aggregate matched keywords across all signals
  const allKeywords = new Set<string>();
  for (const s of scores) {
    s.breakdown?.matchedKeywords.forEach(k => allKeywords.add(k));
  }

  return {
    heat: compositeHeat,
    band,
    intentLevel: quorum.intentLevel,
    quorum,
    breakdown: {
      sentiment: Number((scores.reduce((acc, s) => acc + (s.breakdown?.sentiment || 0), 0) / scores.length).toFixed(2)),
      keywordScore: Math.min(35, allKeywords.size * 8),
      depthScore: Math.min(30, scores.reduce((acc, s) => acc + (s.breakdown?.depthScore || 10), 0) / scores.length + synergyBoost),
      matchedKeywords: Array.from(allKeywords)
    }
  };
}
