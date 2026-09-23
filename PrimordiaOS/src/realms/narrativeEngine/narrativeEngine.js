// src/realms/narrativeEngine/narrativeEngine.ts
import * as crypto from 'crypto';
import { getNarrativeSchema } from './narrativeSchemas.js';
import { NARRATIVE_RULES } from './rules.js';
function deterministicHash(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}
/**
 * Pure deterministic function to synthesize a sovereign NarrativeEpisode.
 * (telemetryState, economicState, offerState, funnelState, realmTopology) -> NarrativeEpisode
 * Zero randomness, zero external network calls, zero unseeded timestamps.
 */
export function synthesizeEpisode(telemetryState, economicState, offerState, funnelState, realmTopology, protagonistIdOverride, realmFocusOverride) {
    const ts = economicState.timestampMs;
    // Deterministic protagonist identity
    const protagonistId = protagonistIdOverride ||
        `seeker_${deterministicHash(`${funnelState.funnelId}:${Math.floor(ts / 60000)}`).slice(0, 8)}`;
    // Determine realm focus deterministically based on system state
    let realmFocus = realmFocusOverride || 'CINEMATIC_PROTAGONIST_OS';
    if (!realmFocusOverride) {
        if (economicState.isSystemThrottled) {
            realmFocus = 'PRIMORDIAOS_CORE';
        }
        else if (offerState?.activeOffer) {
            realmFocus = 'OFFER_ENGINE';
        }
        else if ((economicState.microWindow?.giftCoinsPerMin ?? 0) >= 50) {
            realmFocus = 'MONEYPLUGHUB';
        }
        else if ((economicState.microWindow?.chatVelocityPerMin ?? 0) >= 30) {
            realmFocus = 'IMMERSIVE_COMPUTATION';
        }
        else if ((economicState.microWindow?.linkRequestVelocityPerMin ?? 0) >= 3) {
            realmFocus = 'OFFER_ENGINE_TRIALS';
        }
    }
    const schema = getNarrativeSchema(realmFocus);
    // Evaluate rules in priority order
    const activeBeats = [];
    let seq = 1;
    for (const rule of NARRATIVE_RULES) {
        try {
            const beat = rule.evaluate(telemetryState, economicState, offerState, funnelState, realmTopology, protagonistId, seq);
            if (beat) {
                activeBeats.push(beat);
                seq++;
            }
        }
        catch (err) {
            console.error(`[NarrativeEngine] Rule evaluation error (${rule.name}):`, err);
        }
    }
    // Ensure baseline beat coverage if minimal rules fired
    if (activeBeats.length === 0) {
        activeBeats.push({
            beatId: `beat_${deterministicHash(`default_disc:${protagonistId}:${ts}`).slice(0, 16)}`,
            beatType: 'DISCOVERY',
            title: 'Crossing the Boundary',
            narrativeText: `Protagonist ${protagonistId} crosses into ${schema.displayName}, seeking sovereign sanctuary.`,
            groundedSignal: `baseline: ${schema.realmFocus}`,
            glyph: schema.defaultGlyph,
            sequence: 1,
        });
    }
    // Partition beats into Act I, Act II, Act III
    const actIBeats = activeBeats.filter((b) => b.beatType === 'DISCOVERY');
    const actIIBeats = activeBeats.filter((b) => b.beatType === 'THRESHOLD' || b.beatType === 'TRIAL');
    const actIIIBeats = activeBeats.filter((b) => b.beatType === 'REWARD' || b.beatType === 'REVELATION');
    // Guarantee at least one beat per act from schema templates
    if (actIBeats.length === 0) {
        actIBeats.push({
            beatId: `beat_${deterministicHash(`act1_fill:${protagonistId}:${ts}`).slice(0, 16)}`,
            beatType: 'DISCOVERY',
            title: schema.actTemplates.actI.name,
            narrativeText: schema.actTemplates.actI.exposition,
            groundedSignal: 'schema.actTemplates.actI',
            glyph: schema.defaultGlyph,
            sequence: seq++,
        });
    }
    if (actIIBeats.length === 0) {
        actIIBeats.push({
            beatId: `beat_${deterministicHash(`act2_fill:${protagonistId}:${ts}`).slice(0, 16)}`,
            beatType: 'TRIAL',
            title: schema.actTemplates.actII.name,
            narrativeText: schema.actTemplates.actII.conflict,
            groundedSignal: 'schema.actTemplates.actII',
            glyph: schema.defaultGlyph,
            sequence: seq++,
        });
    }
    if (actIIIBeats.length === 0) {
        actIIIBeats.push({
            beatId: `beat_${deterministicHash(`act3_fill:${protagonistId}:${ts}`).slice(0, 16)}`,
            beatType: 'REVELATION',
            title: schema.actTemplates.actIII.name,
            narrativeText: schema.actTemplates.actIII.resolution,
            groundedSignal: 'schema.actTemplates.actIII',
            glyph: schema.defaultGlyph,
            sequence: seq++,
        });
    }
    const allConsolidatedBeats = [...actIBeats, ...actIIBeats, ...actIIIBeats].sort((a, b) => a.sequence - b.sequence);
    const actStructure = {
        actI: {
            name: schema.actTemplates.actI.name,
            exposition: schema.actTemplates.actI.exposition,
            beats: actIBeats,
        },
        actII: {
            name: schema.actTemplates.actII.name,
            conflict: schema.actTemplates.actII.conflict,
            beats: actIIBeats,
        },
        actIII: {
            name: schema.actTemplates.actIII.name,
            resolution: schema.actTemplates.actIII.resolution,
            beats: actIIIBeats,
        },
    };
    // Approximate word count
    let totalWords = 0;
    totalWords += actStructure.actI.exposition.split(/\s+/).length;
    totalWords += actStructure.actII.conflict.split(/\s+/).length;
    totalWords += actStructure.actIII.resolution.split(/\s+/).length;
    for (const b of allConsolidatedBeats) {
        totalWords += b.narrativeText.split(/\s+/).length;
        totalWords += b.title.split(/\s+/).length;
    }
    // 1-minute time bucket for idempotency
    const timeBucket = Math.floor(ts / 60000);
    const idempotencyKey = deterministicHash(`${protagonistId}:${realmFocus}:${timeBucket}`).slice(0, 16);
    const auditHash = deterministicHash(`${idempotencyKey}:${JSON.stringify(allConsolidatedBeats)}`).slice(0, 16);
    const id = `ep_${deterministicHash(`${auditHash}:${ts}`).slice(0, 16)}`;
    const title = `${schema.displayName}: Chronicle of Protagonist ${protagonistId}`;
    return {
        id,
        ts,
        protagonistId,
        realmFocus,
        title,
        actStructure,
        beats: allConsolidatedBeats,
        linkedOfferId: offerState?.activeOffer?.id,
        linkedBlogPostId: undefined, // Bound optionally by BlogEngine
        idempotencyKey,
        auditHash,
        wordCount: totalWords,
    };
}
/**
 * Subsystem: NarrativeEngine class wrapping deterministic synthesis.
 */
export class NarrativeEngine {
    evaluate(telemetryState, economicState, offerState, funnelState, realmTopology, protagonistIdOverride, realmFocusOverride) {
        return synthesizeEpisode(telemetryState, economicState, offerState, funnelState, realmTopology, protagonistIdOverride, realmFocusOverride);
    }
}
