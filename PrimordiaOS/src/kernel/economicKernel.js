// src/kernel/economicKernel.ts
import * as crypto from 'crypto';
export class EconomicKernel {
    rules = [];
    constructor() {
        this.registerDefaultRules();
    }
    evaluate(state, funnel) {
        const decisions = [];
        for (const rule of this.rules) {
            try {
                const result = rule.evaluate(state, funnel);
                if (result) {
                    decisions.push(result);
                }
            }
            catch (err) {
                console.error(`[EconomicKernel] Error executing rule ${rule.name}:`, err);
            }
        }
        // Sort decisions by priority (ascending: 1 is highest priority)
        return decisions.sort((a, b) => a.priority - b.priority);
    }
    registerDefaultRules() {
        // RULE 1: Direct Link / Access Intent Surge
        // Trigger: >= 3 explicit link requests in the last 60s
        this.rules.push({
            name: 'RULE_CHAT_LINK_INTENT_SURGE',
            evaluate: (state, funnel) => {
                if (state.microWindow.linkRequestVelocityPerMin >= 3) {
                    if (funnel.activeCtaId === 'cta_direct_link_surge') {
                        return null; // Already active
                    }
                    return {
                        decisionId: crypto.randomUUID(),
                        timestampMs: state.timestampMs,
                        ruleTriggered: 'RULE_CHAT_LINK_INTENT_SURGE',
                        action: 'UPDATE_CTA',
                        priority: 10,
                        idempotencyKey: this.hashKey('LINK_SURGE', funnel.funnelId),
                        payload: {
                            targetCtaId: 'cta_direct_link_surge',
                            ctaLabel: '🔥 TAP HERE: Instant Realm Access & Docs',
                            targetUrl: 'https://primordialorigin.com/access?src=stream_surge',
                            messageToPin: 'Link active above bio! Direct access available now.',
                        },
                        rationale: `Link intent velocity reached ${state.microWindow.linkRequestVelocityPerMin}/min. Switching CTA to direct access link.`,
                    };
                }
                return null;
            },
        });
        // RULE 2: Attention & High Engagement Spike
        // Trigger: Gift coin velocity >= 100/min OR chat velocity >= 45/min
        this.rules.push({
            name: 'RULE_ENGAGEMENT_SPIKE_VIP_OFFER',
            evaluate: (state, funnel) => {
                const isSpike = state.microWindow.giftCoinsPerMin >= 100 || state.microWindow.chatVelocityPerMin >= 45;
                if (isSpike && funnel.activeTier !== 'SOVEREIGN_ENTERPRISE') {
                    return {
                        decisionId: crypto.randomUUID(),
                        timestampMs: state.timestampMs,
                        ruleTriggered: 'RULE_ENGAGEMENT_SPIKE_VIP_OFFER',
                        action: 'SWITCH_OFFER_TIER',
                        priority: 20,
                        idempotencyKey: this.hashKey('TIER_VIP_SPIKE', funnel.funnelId),
                        payload: {
                            targetCtaId: 'cta_vip_pass',
                            ctaLabel: '⚡ CLAIM SOVEREIGN PASS (Live Batch VIP)',
                            targetUrl: 'https://primordialorigin.com/vip?promo=live_spike',
                            discountPercent: 15,
                            promoExpiresAtMs: state.timestampMs + (1000 * 60 * 10), // 10 min window
                        },
                        rationale: `Engagement spike detected (Coins: ${state.microWindow.giftCoinsPerMin}/min, Chat: ${state.microWindow.chatVelocityPerMin}/min). Elevating tier.`,
                    };
                }
                return null;
            },
        });
        // RULE 3: Conversion Stagnation Recovery
        // Trigger: Viewers >= 25, macro conversions === 0 despite >= 30 impressions in 5 minutes
        this.rules.push({
            name: 'RULE_CONVERSION_STAGNATION_RECOVERY',
            evaluate: (state, funnel) => {
                const hasAudience = state.macroWindow.currentViewers >= 25;
                const lowConversion = state.macroWindow.funnelImpressions >= 30 && state.macroWindow.conversions === 0;
                if (hasAudience && lowConversion && funnel.activeCtaId !== 'cta_frictionless_entry') {
                    return {
                        decisionId: crypto.randomUUID(),
                        timestampMs: state.timestampMs,
                        ruleTriggered: 'RULE_CONVERSION_STAGNATION_RECOVERY',
                        action: 'UPDATE_CTA',
                        priority: 30,
                        idempotencyKey: this.hashKey('RECOVERY_LOW_BARRIER', funnel.funnelId),
                        payload: {
                            targetCtaId: 'cta_frictionless_entry',
                            ctaLabel: '📖 FREE DOWNLOAD: Primordia Sovereign Codex Blueprint',
                            targetUrl: 'https://primordialorigin.com/free-codex?src=stream_drop',
                        },
                        rationale: `0 conversions across ${state.macroWindow.funnelImpressions} impressions. Swapping to zero-friction lead magnet.`,
                    };
                }
                return null;
            },
        });
        // RULE 4: Traffic Throttle & Circuit Breaker
        // Trigger: System throttle flag is set
        this.rules.push({
            name: 'RULE_SYSTEM_PROTECTION_THROTTLE',
            evaluate: (state, funnel) => {
                if (state.isSystemThrottled && funnel.activeCtaId !== 'cta_cached_static') {
                    return {
                        decisionId: crypto.randomUUID(),
                        timestampMs: state.timestampMs,
                        ruleTriggered: 'RULE_SYSTEM_PROTECTION_THROTTLE',
                        action: 'THROTTLE_TRAFFIC',
                        priority: 1, // Highest priority
                        idempotencyKey: this.hashKey('THROTTLE_STATIC', funnel.funnelId),
                        payload: {
                            targetCtaId: 'cta_cached_static',
                            ctaLabel: 'Primordia Sovereign Portal',
                            targetUrl: 'https://primordialorigin.com/status',
                        },
                        rationale: 'System throttle flag active. Directing traffic to static edge route.',
                    };
                }
                return null;
            },
        });
    }
    hashKey(prefix, targetId) {
        return crypto.createHash('sha256').update(`${prefix}:${targetId}`).digest('hex').slice(0, 16);
    }
}
