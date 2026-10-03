import { postToConsole } from './platforms/console.js';
import { postToTwitter } from './platforms/twitter.js';
import { postToTikTok } from './platforms/tiktok.js';
import { postToYouTube } from './platforms/youtube.js';
import { postToReddit } from './platforms/reddit.js';
import { postToInstagram } from './platforms/instagram.js';

import { credentialGateway } from '../auth/gateway.js';
import { twitterProvider } from '../auth/providers/twitter.js';
import { redditProvider } from '../auth/providers/reddit.js';
import { youtubeProvider } from '../auth/providers/youtube.js';
import { instagramProvider } from '../auth/providers/instagram.js';
import { tiktokProvider } from '../auth/providers/tiktok.js';

export class PromotionEngine {
  constructor() {
    this.mode = process.env.PROMOTION_MODE || 'soft';
    this.scheduleEnabled = process.env.PROMOTION_SCHEDULE_ENABLED === 'true';
    this.intervalMs = Number(process.env.PROMOTION_INTERVAL_MS || 3600000);
    this.analytics = { posts: [] };

    // Register providers once
    credentialGateway.registerProvider('twitter', twitterProvider);
    credentialGateway.registerProvider('reddit', redditProvider);
    credentialGateway.registerProvider('youtube', youtubeProvider);
    credentialGateway.registerProvider('instagram', instagramProvider);
    credentialGateway.registerProvider('tiktok', tiktokProvider);

    if (this.scheduleEnabled) {
      this.startScheduler();
    }
  }

  startScheduler() {
    console.log('[Promotion] Scheduler enabled, interval(ms):', this.intervalMs);

    setInterval(async () => {
      console.log('[Promotion] Scheduled promotion tick');
      const event = {
        type: 'scheduled',
        sessionId: null,
        productId: 'PrimordiaOS',
        amount: null,
      };
      const content = await this.generateContent(event, { scheduled: true });
      await this.distributeContent(content, { scheduled: true });
    }, this.intervalMs);
  }

  async onRevenue(event) {
    console.log('[Promotion] Revenue event received:', event.type, event.sessionId);

    const content = await this.generateContent(event, { revenue: true });
    await this.distributeContent(content, { revenue: true });
  }

  async generateContent(event, context = {}) {
    const productId = event.productId ?? 'PrimordiaOS';
    const amount = event.amount ?? null;

    let baseText;

    if (context.revenue) {
      baseText = `Someone just bought ${productId}. PrimordiaOS is evolving itself based on real revenue.`;
    } else if (context.scheduled) {
      baseText = `PrimordiaOS is an autonomous OS that sells, fulfills, and evolves itself. Explore it now.`;
    } else {
      baseText = `PrimordiaOS is live and operating as a self-evolving commercial organism.`;
    }

    const modeTag =
      this.mode === 'hard'
        ? 'HIGH INTENSITY'
        : this.mode === 'medium'
        ? 'BALANCED'
        : 'SOFT';

    const text = `${baseText} [${modeTag}]`;

    const tags = ['#primordiaos', '#autonomous', '#ai', '#devtools'];

    if (this.mode === 'hard') {
      tags.push('#growth', '#startup', '#automation');
    }

    const payload = {
      text,
      tags,
      meta: {
        mode: this.mode,
        context,
        productId,
        amount,
        timestamp: Date.now(),
      },
    };

    this.recordAnalytics('generated', payload);

    return payload;
  }

  async distributeContent(content, context = {}) {
    console.log('[Promotion] Mode:', this.mode);
    console.log('[Promotion] Content:', content.text);

    await postToConsole('console', content);

    if (this.mode === 'soft') {
      await postToTwitter(content);
    } else if (this.mode === 'medium') {
      await postToTwitter(content);
      await postToYouTube(content);
      await postToReddit(content);
    } else if (this.mode === 'hard') {
      await postToTwitter(content);
      await postToYouTube(content);
      await postToTikTok(content);
      await postToReddit(content);
      await postToInstagram(content);
    }

    this.recordAnalytics('distributed', { content, context });
  }

  recordAnalytics(type, payload) {
    this.analytics.posts.push({
      type,
      payload,
      at: Date.now(),
    });

    if (this.analytics.posts.length > 1000) {
      this.analytics.posts.shift();
    }
  }

  getAnalyticsSummary() {
    return {
      totalEvents: this.analytics.posts.length,
      byType: this.analytics.posts.reduce((acc, evt) => {
        acc[evt.type] = (acc[evt.type] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

export const promotionEngine = new PromotionEngine();
