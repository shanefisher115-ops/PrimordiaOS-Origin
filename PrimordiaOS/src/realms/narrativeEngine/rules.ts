// src/realms/narrativeEngine/rules.ts

import * as crypto from 'crypto';
import {
  EconomicState,
  FunnelState,
  NarrativeBeat,
  OfferState,
} from '../../contracts/types.js';

export interface NarrativeRule {
  readonly name: string;
  readonly priority: number;
  readonly evaluate: (
    telemetryState: unknown,
    economicState: EconomicState,
    offerState: OfferState | null,
    funnelState: FunnelState,
    realmTopology: unknown,
    protagonistId: string,
    sequence: number
  ) => NarrativeBeat | null;
}

function deterministicBeatId(ruleName: string, protagonistId: string, timestampMs: number, sequence: number): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${ruleName}:${protagonistId}:${timestampMs}:${sequence}`)
    .digest('hex')
    .slice(0, 16);
  return `beat_${hash}`;
}

/**
 * Priority 1: Circuit breaker / throttle triggers fate intervention beat.
 */
export const ruleSystemThrottleAsFate: NarrativeRule = {
  name: 'RULE_SYSTEM_THROTTLE_AS_FATE',
  priority: 1,
  evaluate: (_tel, economicState, _off, _funnel, _top, protagonistId, seq) => {
    if (economicState.isSystemThrottled) {
      return {
        beatId: deterministicBeatId('RULE_SYSTEM_THROTTLE_AS_FATE', protagonistId, economicState.timestampMs, seq),
        beatType: 'REVELATION',
        title: 'Fate Intervenes: The Iron Seal of Throttle',
        narrativeText: `The cosmic substrate halts external volatility; protagonist ${protagonistId} witnesses the sovereign circuit breaker freeze the gates to preserve equilibrium.`,
        groundedSignal: 'isSystemThrottled: true',
        glyph: 'Gate',
        sequence: seq,
      };
    }
    return null;
  },
};

/**
 * Priority 10: Successful conversion triggers sovereign reward beat.
 */
export const ruleConversionAsReward: NarrativeRule = {
  name: 'RULE_CONVERSION_AS_REWARD',
  priority: 10,
  evaluate: (_tel, economicState, _off, _funnel, _top, protagonistId, seq) => {
    const conversions =
      economicState.microWindow.conversions ??
      economicState.macroWindow.conversions ??
      0;

    if (conversions > 0) {
      return {
        beatId: deterministicBeatId('RULE_CONVERSION_AS_REWARD', protagonistId, economicState.timestampMs, seq),
        beatType: 'REWARD',
        title: 'The Sovereign Boon: Conversion Crowned',
        narrativeText: `A sacred pact is sealed; protagonist ${protagonistId} converts ${conversions} energetic tributes into an enduring sovereign inscription.`,
        groundedSignal: `conversions: ${conversions}`,
        glyph: 'Seed',
        sequence: seq,
      };
    }
    return null;
  },
};

/**
 * Priority 15: Active offer bound into a hero trial beat.
 */
export const ruleOfferBecomesTrial: NarrativeRule = {
  name: 'RULE_OFFER_BECOMES_TRIAL',
  priority: 15,
  evaluate: (_tel, economicState, offerState, _funnel, _top, protagonistId, seq) => {
    const offer = offerState?.activeOffer;
    if (offer) {
      return {
        beatId: deterministicBeatId('RULE_OFFER_BECOMES_TRIAL', protagonistId, economicState.timestampMs, seq),
        beatType: 'TRIAL',
        title: `Trial of the Sovereign Gate ($${offer.price})`,
        narrativeText: `The citadel presents its trial: protagonist ${protagonistId} must weigh the friction of the $${offer.price} ${offer.offerType} passage against the boundless agency beyond.`,
        groundedSignal: `activeOffer: ${offer.id} | price: $${offer.price} | type: ${offer.offerType}`,
        glyph: 'Clock',
        sequence: seq,
      };
    }
    return null;
  },
};

/**
 * Priority 20: Stagnation with high traffic converted into an obstacle beat.
 */
export const ruleStagnationAsObstacle: NarrativeRule = {
  name: 'RULE_STAGNATION_AS_OBSTACLE',
  priority: 20,
  evaluate: (_tel, economicState, _off, _funnel, _top, protagonistId, seq) => {
    const micro = economicState.microWindow;
    const macro = economicState.macroWindow;
    const viewers = micro?.currentViewers ?? macro?.currentViewers ?? 0;
    const conversions = micro !== undefined ? micro.conversions : (macro?.conversions ?? 0);
    const impressions = micro?.funnelImpressions ?? macro?.funnelImpressions ?? 0;

    if (viewers >= 20 && conversions === 0 && impressions >= 10) {
      return {
        beatId: deterministicBeatId('RULE_STAGNATION_AS_OBSTACLE', protagonistId, economicState.timestampMs, seq),
        beatType: 'THRESHOLD',
        title: 'The Stagnant Fog: Hesitation at the Veil',
        narrativeText: `Dense fog envelops the threshold; ${viewers} entities stand motionless across ${impressions} glimpses without a single soul stepping forward.`,
        groundedSignal: `viewers: ${viewers}, impressions: ${impressions}, conversions: 0`,
        glyph: 'Spiral',
        sequence: seq,
      };
    }
    return null;
  },
};

/**
 * Priority 30: Protagonist enters realm.
 */
export const ruleProtagonistEntersRealm: NarrativeRule = {
  name: 'RULE_PROTAGONIST_ENTERS_REALM',
  priority: 30,
  evaluate: (_tel, economicState, _off, funnelState, _top, protagonistId, seq) => {
    const viewers = economicState.microWindow.currentViewers ?? 1;
    return {
      beatId: deterministicBeatId('RULE_PROTAGONIST_ENTERS_REALM', protagonistId, economicState.timestampMs, seq),
      beatType: 'DISCOVERY',
      title: 'Protagonist Enters the Sovereign Citadel',
      narrativeText: `Stepping out of the formless external wild, protagonist ${protagonistId} arrives at ${funnelState.funnelId}, greeted by ${viewers} resonant minds.`,
      groundedSignal: `funnelId: ${funnelState.funnelId}, currentViewers: ${viewers}`,
      glyph: 'Gate',
      sequence: seq,
    };
  },
};

/**
 * Priority 40: Realm topology mapped to cosmic cartography beat.
 */
export const ruleRealmMapAsCosmicCartography: NarrativeRule = {
  name: 'RULE_REALM_MAP_AS_COSMIC_CARTOGRAPHY',
  priority: 40,
  evaluate: (_tel, economicState, _off, _funnel, realmTopology, protagonistId, seq) => {
    let realmCount = 6;
    if (realmTopology && typeof realmTopology === 'object' && 'realms' in (realmTopology as any)) {
      realmCount = ((realmTopology as any).realms as any[]).length;
    }

    return {
      beatId: deterministicBeatId('RULE_REALM_MAP_AS_COSMIC_CARTOGRAPHY', protagonistId, economicState.timestampMs, seq),
      beatType: 'DISCOVERY',
      title: 'Cosmic Cartography: The Constellation of Realms',
      narrativeText: `Unfurling the sovereign astrolabe, protagonist ${protagonistId} surveys the interconnected topology spanning ${realmCount} distinct computational spheres.`,
      groundedSignal: `realmTopology.realmCount: ${realmCount}`,
      glyph: 'Starflare',
      sequence: seq,
    };
  },
};

export const NARRATIVE_RULES: readonly NarrativeRule[] = [
  ruleSystemThrottleAsFate,
  ruleConversionAsReward,
  ruleOfferBecomesTrial,
  ruleStagnationAsObstacle,
  ruleProtagonistEntersRealm,
  ruleRealmMapAsCosmicCartography,
];

export interface EvaluatedNarrativeRuleResult {
  readonly ruleId: string;
  readonly matched: boolean;
  readonly beat: NarrativeBeat | null;
  readonly contextModifiers: {
    readonly trialName: string;
  };
}

export function evaluateNarrativeRules(
  telemetryState: unknown,
  economicState: EconomicState,
  offerState: OfferState | null,
  funnelState: FunnelState,
  realmTopology: unknown,
  _targetRealm?: string,
  protagonistId: string = 'Sovereign-Shane'
): EvaluatedNarrativeRuleResult[] {
  return NARRATIVE_RULES.map((rule, idx) => {
    const beat = rule.evaluate(
      telemetryState,
      economicState,
      offerState,
      funnelState,
      realmTopology,
      protagonistId,
      idx + 1
    );
    return {
      ruleId: rule.name,
      matched: beat !== null,
      beat,
      contextModifiers: {
        trialName: beat?.title ?? (offerState?.activeOffer?.ctaText ?? ''),
      },
    };
  });
}
