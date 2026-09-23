// src/realms/blogEngine/blogEngine.ts
import * as crypto from 'crypto';
import { generateDeterministicArticle, } from './generators/deterministicGenerator.js';
export * from './topics.js';
export * from './generators/deterministicGenerator.js';
/**
 * Pure, deterministic blog generation function:
 * (topicState, economicState, immersiveState, cinematicState) -> BlogPost
 *
 * Invariants:
 * - Zero randomness (no Math.random, no non-deterministic UUIDs)
 * - Zero external calls (no network I/O, no async fetch)
 * - Byte-level determinism: identical inputs produce identical outputs
 */
export function generateBlogPost(topicState, economicState, immersiveState, cinematicState) {
    const topic = topicState.activeTopic;
    const article = generateDeterministicArticle(topic, topicState, economicState, immersiveState, cinematicState);
    // Deterministic timestamp anchored to economicState or topicState sequence
    const ts = economicState?.timestampMs ??
        (topicState.lastPublishedTs > 0 ? topicState.lastPublishedTs : 1773412000000);
    const id = `post_${topic.toLowerCase()}_seq_${topicState.totalPublished}`;
    const idempotencyPayload = `${topic}:${article.ruleTriggered}:${article.slug}:${topicState.totalPublished}`;
    const idempotencyKey = crypto.createHash('sha256').update(idempotencyPayload).digest('hex');
    const auditPayload = JSON.stringify({
        id,
        ts,
        title: article.title,
        slug: article.slug,
        realm: topic,
        tags: article.tags,
        body: article.body,
        idempotencyKey,
    });
    const auditHash = crypto.createHash('sha256').update(auditPayload).digest('hex');
    return {
        id,
        ts,
        title: article.title,
        slug: article.slug,
        realm: topic,
        tags: article.tags,
        body: article.body,
        idempotencyKey,
        auditHash,
        glyphs: article.glyphs,
        wordCount: article.wordCount,
        ctaUrl: article.ctaUrl,
        ctaText: article.ctaText,
    };
}
/**
 * BlogEngine subsystem manager.
 */
export class BlogEngine {
    generate(topicState, economicState, immersiveState, cinematicState) {
        return generateBlogPost(topicState, economicState, immersiveState, cinematicState);
    }
    computeIdempotencyKey(topic, rule, slug, index) {
        return crypto
            .createHash('sha256')
            .update(`${topic}:${rule}:${slug}:${index}`)
            .digest('hex');
    }
    computeAuditHash(post) {
        const auditPayload = JSON.stringify({
            id: post.id,
            ts: post.ts,
            title: post.title,
            slug: post.slug,
            realm: post.realm,
            tags: post.tags,
            body: post.body,
            idempotencyKey: post.idempotencyKey,
        });
        return crypto.createHash('sha256').update(auditPayload).digest('hex');
    }
    /**
     * Deterministically links a NarrativeEpisode into a persistent BlogPost chronicle.
     */
    linkNarrativeEpisode(episode) {
        const slug = `${episode.title.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-')}-${episode.ts}`;
        const id = `post_${crypto.createHash('sha256').update(`blog_${episode.id}`).digest('hex').slice(0, 16)}`;
        const lines = [
            `# ${episode.title}`,
            `*Protagonist Chronicle: ${episode.protagonistId} | Realm Focus: ${episode.realmFocus}*`,
            '',
            `## ${episode.actStructure.actI.name}`,
            `${episode.actStructure.actI.exposition}`,
            '',
            `## ${episode.actStructure.actII.name}`,
            `${episode.actStructure.actII.conflict}`,
            '',
            `## ${episode.actStructure.actIII.name}`,
            `${episode.actStructure.actIII.resolution}`,
            '',
            '### Narrative Beats',
        ];
        for (const beat of episode.beats) {
            lines.push(`- **[${beat.beatType}] ${beat.title}**: ${beat.narrativeText} *(Signal: ${beat.groundedSignal})*`);
        }
        if (episode.linkedOfferId) {
            lines.push('', `> [!NOTE]`, `> Bound Offer Trial ID: ${episode.linkedOfferId}`);
        }
        const body = lines.join('\n');
        const wordCount = body.split(/\s+/).length;
        const idempotencyKey = crypto.createHash('sha256').update(`BLOG:${episode.idempotencyKey}`).digest('hex').slice(0, 16);
        const auditHash = crypto.createHash('sha256').update(`BLOG_HASH:${episode.auditHash}:${idempotencyKey}`).digest('hex').slice(0, 16);
        return {
            id,
            ts: episode.ts,
            title: episode.title,
            slug,
            realm: episode.realmFocus,
            tags: ['sovereign_narrative', String(episode.realmFocus).toLowerCase(), 'phase4_chronicle'],
            body,
            wordCount,
            idempotencyKey,
            auditHash,
            glyphs: ['Starflare', 'Gate'],
            ctaUrl: `https://primordialorigin.com/access?narrative=${episode.id}`,
            ctaText: 'Claim Sovereign Passage',
        };
    }
}
