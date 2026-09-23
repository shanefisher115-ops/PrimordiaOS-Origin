// src/realms/blogEngine/narrativeBinding.ts

import * as crypto from 'crypto';
import { BlogPost, NarrativeEpisode } from '../../contracts/types.js';

function deterministicHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-');
}

/**
 * BlogEngine adapter that deterministically binds NarrativeEpisodes to BlogPosts.
 */
export class BlogEngine {
  /**
   * Transforms a NarrativeEpisode into a permanent sovereign blog post chronicle.
   */
  public linkNarrativeEpisode(episode: NarrativeEpisode): BlogPost {
    const slug = `${slugify(episode.title)}-${episode.ts}`;
    const id = `post_${deterministicHash(`blog_${episode.id}`).slice(0, 16)}`;

    // Compose formatted markdown body from the 3-act structure and beats
    const lines: string[] = [
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

    const idempotencyKey = deterministicHash(`BLOG:${episode.idempotencyKey}`).slice(0, 16);
    const auditHash = deterministicHash(`BLOG_HASH:${episode.auditHash}:${idempotencyKey}`).slice(0, 16);

    return {
      id,
      ts: episode.ts,
      title: episode.title,
      slug,
      realm: episode.realmFocus,
      tags: ['sovereign_narrative', episode.realmFocus.toLowerCase(), 'phase4_chronicle'],
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

export const defaultBlogEngine = new BlogEngine();
