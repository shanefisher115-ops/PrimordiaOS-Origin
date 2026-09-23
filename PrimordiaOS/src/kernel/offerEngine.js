// src/kernel/offerEngine.ts
import * as crypto from 'crypto';
/**
 * Generates a deterministic SHA-256 identifier slice without nonces or timestamps.
 */
function deterministicHash(payload) {
    return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}
/**
 * Deterministic helper to construct canonical OfferDecision.
 * Guarantees zero randomness, identical inputs yield identical outputs.
 */
function createOfferDecision(ruleName, priority, economicState, funnelState, offerType, price, ctaText, destinationUrl, reason) {
    const ts = economicState.timestampMs;
    const clampedPrice = Math.max(1, Math.min(999, Math.round(price)));
    const cooldownKey = `OFFER_COOLDOWN_${offerType}`;
    const id = `off_${deterministicHash(`${ruleName}:${ts}:${funnelState.funnelId}:${offerType}:${clampedPrice}`)}`;
    const idempotencyKey = deterministicHash(`OFFER:${ruleName}:${offerType}:${clampedPrice}:${destinationUrl}`);
    return {
        id,
        decisionId: id,
        ts,
        timestampMs: ts,
        ruleTriggered: ruleName,
        action: 'OFFER_DECISION',
        priority,
        offerType,
        price: clampedPrice,
        ctaText,
        cooldownKey,
        idempotencyKey,
        destinationUrl,
        reason,
        rationale: reason,
        payload: {
            targetCtaId: `cta_${offerType.toLowerCase()}_${clampedPrice}`,
            ctaLabel: ctaText,
            targetUrl: destinationUrl,
            price: clampedPrice,
            offerType,
            cooldownKey,
        },
    };
}
/**
 * Pure deterministic rule: RULE_SYSTEM_THROTTLE_OFFER
 * Priority 1: Circuit breaker when isSystemThrottled is true.
 */
export const ruleSystemThrottleOffer = {
    name: 'RULE_SYSTEM_THROTTLE_OFFER',
    priority: 1,
    evaluate: (economicState, _telemetry, funnelState) => {
        if (economicState.isSystemThrottled) {
            return createOfferDecision('RULE_SYSTEM_THROTTLE_OFFER', 1, economicState, funnelState, 'STATIC', 1, 'Primordia Sovereign Portal (Static Tier)', 'https://primordialorigin.com/status', 'System throttle flag active. Circuit breaker engaged; deploying deterministic static offer.');
        }
        return null;
    },
};
/**
 * Pure deterministic rule: RULE_HIGH_INTENT_SURGE_OFFER
 * Priority 10: Triggered when chat link requests >= 3/min or chat velocity >= 40/min.
 */
export const ruleHighIntentSurgeOffer = {
    name: 'RULE_HIGH_INTENT_SURGE_OFFER',
    priority: 10,
    evaluate: (economicState, _telemetry, funnelState) => {
        const linkVelocity = economicState.microWindow.linkRequestVelocityPerMin ?? 0;
        const chatVelocity = economicState.microWindow.chatVelocityPerMin ?? 0;
        if (linkVelocity >= 3 || chatVelocity >= 40) {
            return createOfferDecision('RULE_HIGH_INTENT_SURGE_OFFER', 10, economicState, funnelState, 'DYNAMIC', 47, '⚡ INSTANT ORIGIN ACCESS: High-Intent Surge Pass', 'https://primordialorigin.com/access?offer=surge', `High-intent surge detected (Link reqs: ${linkVelocity}/min, Chat: ${chatVelocity}/min). Deploying surge pass.`);
        }
        return null;
    },
};
/**
 * Pure deterministic rule: RULE_IDENTITY_BOUND_OFFER
 * Priority 15: Triggered when gift coins >= 100/min or funnel tier is SOVEREIGN_ENTERPRISE.
 */
export const ruleIdentityBoundOffer = {
    name: 'RULE_IDENTITY_BOUND_OFFER',
    priority: 15,
    evaluate: (economicState, _telemetry, funnelState) => {
        const giftCoins = economicState.microWindow.giftCoinsPerMin ?? 0;
        const isSovereign = funnelState.activeTier === 'SOVEREIGN_ENTERPRISE';
        if (giftCoins >= 100 || isSovereign) {
            return createOfferDecision('RULE_IDENTITY_BOUND_OFFER', 15, economicState, funnelState, 'VIP', 297, '👑 SOVEREIGN FOUNDER PASS: Identity-Bound VIP Tier', 'https://primordialorigin.com/vip?src=identity_bound', `Identity-bound VIP threshold met (Gifts: ${giftCoins} coins/min, Tier: ${funnelState.activeTier}). Deploying VIP offer.`);
        }
        return null;
    },
};
/**
 * Pure deterministic rule: RULE_CONVERSION_RECOVERY_OFFER
 * Priority 25: Triggered when viewers >= 20, conversions == 0, and impressions >= 25.
 */
export const ruleConversionRecoveryOffer = {
    name: 'RULE_CONVERSION_RECOVERY_OFFER',
    priority: 25,
    evaluate: (economicState, _telemetry, funnelState) => {
        const macro = economicState.macroWindow;
        const viewers = macro?.currentViewers ?? economicState.microWindow.currentViewers ?? 0;
        const conversions = macro?.conversions ?? economicState.microWindow.conversions ?? 0;
        const impressions = macro?.funnelImpressions ?? economicState.microWindow.funnelImpressions ?? 0;
        if (viewers >= 20 && conversions === 0 && impressions >= 25) {
            return createOfferDecision('RULE_CONVERSION_RECOVERY_OFFER', 25, economicState, funnelState, 'RECOVERY', 9, '📖 FREE CODEX PASS: Frictionless Recovery Entry', 'https://primordialorigin.com/recovery?src=stagnation_exit', `Conversion stagnation recovery triggered (0 conversions across ${impressions} impressions with ${viewers} viewers). Deploying low-barrier recovery offer.`);
        }
        return null;
    },
};
/**
 * Pure deterministic rule: RULE_DYNAMIC_PRICE_ADJUST
 * Priority 50: Baseline demand-scaled dynamic pricing with zero floating randomness.
 */
export const ruleDynamicPriceAdjust = {
    name: 'RULE_DYNAMIC_PRICE_ADJUST',
    priority: 50,
    evaluate: (economicState, _telemetry, funnelState) => {
        const viewers = economicState.microWindow.currentViewers ?? 0;
        const ctr = economicState.microWindow.clickThroughRate ?? 0;
        const impressions = economicState.microWindow.funnelImpressions ?? 0;
        let computedPrice = 49;
        computedPrice += Math.min(200, Math.floor(viewers * 0.5));
        if (ctr >= 0.2) {
            computedPrice += 20;
        }
        else if (ctr < 0.05 && impressions >= 10) {
            computedPrice -= 15;
        }
        const price = Math.max(1, Math.min(999, Math.round(computedPrice)));
        return createOfferDecision('RULE_DYNAMIC_PRICE_ADJUST', 50, economicState, funnelState, 'DYNAMIC', price, `⚡ UNLOCK PRIMORDIA PROTOCOL ($${price})`, `https://primordialorigin.com/offer?tier=dynamic&price=${price}`, `Deterministic dynamic pricing calculated ($${price}) from viewer density (${viewers}) and CTR (${ctr}).`);
    },
};
/**
 * Pure deterministic Offer Engine evaluation function.
 * (economicState, telemetry, funnelState) -> OfferDecision | null
 * Zero randomness, zero external calls, zero nondeterministic branching.
 */
export function evaluateOffer(economicState, telemetry, funnelState) {
    const rules = [
        ruleSystemThrottleOffer,
        ruleHighIntentSurgeOffer,
        ruleIdentityBoundOffer,
        ruleConversionRecoveryOffer,
        ruleDynamicPriceAdjust,
    ];
    // Evaluate strictly in ascending priority order
    for (const rule of rules) {
        try {
            const decision = rule.evaluate(economicState, telemetry, funnelState);
            if (decision) {
                return decision;
            }
        }
        catch (err) {
            console.error(`[OfferEngine] Error executing rule ${rule.name}:`, err);
        }
    }
    return null;
}
/**
 * Subsystem: OfferEngine class wrapping deterministic evaluation.
 */
export class OfferEngine {
    rules = [
        ruleSystemThrottleOffer,
        ruleHighIntentSurgeOffer,
        ruleIdentityBoundOffer,
        ruleConversionRecoveryOffer,
        ruleDynamicPriceAdjust,
    ];
    /**
     * Pure deterministic offer evaluation.
     */
    evaluate(economicState, telemetry, funnelState) {
        return evaluateOffer(economicState, telemetry, funnelState);
    }
    getRules() {
        return this.rules;
    }
}
