// src/telemetry/telemetryCollector.ts

import * as fs from 'fs';
import * as path from 'path';
import { LiveEvent, RollingWindowMetrics, EconomicState } from '../contracts/types.js';

interface MetricBucket {
  timestampSec: number;
  chatCount: number;
  giftCoins: number;
  shareCount: number;
  linkRequestCount: number;
  impressions: number;
  clicks: number;
  conversions: number;
  lastViewerCount: number;
}

export class TelemetryCollector {
  private readonly buckets: Map<number, MetricBucket> = new Map();
  private readonly logStream: fs.WriteStream;
  private currentViewers: number = 0;
  private activeFunnelId: string = 'primordia_default_funnel';
  private currentCtaId: string = 'cta_standard_access';

  constructor(private readonly logFilePath: string) {
    const dir = path.dirname(logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.logStream = fs.createWriteStream(logFilePath, { flags: 'a', encoding: 'utf-8' });
  }

  public recordEvent(event: LiveEvent): void {
    const second = Math.floor(event.timestampMs / 1000);
    const bucket = this.getOrCreateBucket(second);

    switch (event.type) {
      case 'VIEWER_JOIN':
        this.currentViewers++;
        bucket.lastViewerCount = this.currentViewers;
        break;
      case 'CHAT_MESSAGE':
        bucket.chatCount++;
        if (event.payload.intent === 'LINK_REQUEST' || event.payload.intent === 'ACCESS_QUERY') {
          bucket.linkRequestCount++;
        }
        break;
      case 'GIFT_DONATION':
        bucket.giftCoins += event.payload.giftValueCoins ?? 0;
        break;
      case 'SHARE':
        bucket.shareCount++;
        break;
      case 'FUNNEL_IMPRESSION':
        bucket.impressions++;
        break;
      case 'FUNNEL_CLICK':
        bucket.clicks++;
        break;
      case 'CONVERSION_SUCCESS':
        bucket.conversions++;
        break;
    }

    // Persist raw event to JSONL
    this.logStream.write(JSON.stringify(event) + '\n');
    this.pruneStaleBuckets(second - 600); // Retain max 10 minutes in memory
  }

  public getEconomicState(): EconomicState {
    const nowSec = Math.floor(Date.now() / 1000);
    return {
      timestampMs: Date.now(),
      microWindow: this.computeWindow(nowSec, 60),
      macroWindow: this.computeWindow(nowSec, 300),
      activeFunnelId: this.activeFunnelId,
      currentCtaId: this.currentCtaId,
      isSystemThrottled: false,
    };
  }

  public setFunnelContext(funnelId: string, ctaId: string): void {
    this.activeFunnelId = funnelId;
    this.currentCtaId = ctaId;
  }

  public computeWindow(currentSec: number, durationSec: number): RollingWindowMetrics {
    let totalChat = 0;
    let totalGifts = 0;
    let totalShares = 0;
    let totalLinkRequests = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    for (let i = 0; i < durationSec; i++) {
      const bucket = this.buckets.get(currentSec - i);
      if (bucket) {
        totalChat += bucket.chatCount;
        totalGifts += bucket.giftCoins;
        totalShares += bucket.shareCount;
        totalLinkRequests += bucket.linkRequestCount;
        totalImpressions += bucket.impressions;
        totalClicks += bucket.clicks;
        totalConversions += bucket.conversions;
      }
    }

    const multiplier = 60 / durationSec;
    return {
      windowDurationSec: durationSec,
      currentViewers: this.currentViewers,
      chatVelocityPerMin: Math.round(totalChat * multiplier * 100) / 100,
      giftCoinsPerMin: Math.round(totalGifts * multiplier * 100) / 100,
      shareVelocityPerMin: Math.round(totalShares * multiplier * 100) / 100,
      linkRequestVelocityPerMin: Math.round(totalLinkRequests * multiplier * 100) / 100,
      funnelImpressions: totalImpressions,
      funnelClicks: totalClicks,
      conversions: totalConversions,
      clickThroughRate: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 1000 : 0,
      conversionRate: totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 1000) / 1000 : 0,
    };
  }

  private getOrCreateBucket(second: number): MetricBucket {
    let bucket = this.buckets.get(second);
    if (!bucket) {
      bucket = {
        timestampSec: second,
        chatCount: 0,
        giftCoins: 0,
        shareCount: 0,
        linkRequestCount: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        lastViewerCount: this.currentViewers,
      };
      this.buckets.set(second, bucket);
    }
    return bucket;
  }

  private pruneStaleBuckets(thresholdSec: number): void {
    for (const sec of Array.from(this.buckets.keys())) {
      if (sec < thresholdSec) {
        this.buckets.delete(sec);
      }
    }
  }

  public close(): void {
    this.logStream.end();
  }
}
