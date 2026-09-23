// src/ingest/tiktokLiveAdapter.ts

import * as crypto from 'crypto';
import { LiveEvent, LiveEventType, ChatIntentType } from '../contracts/types.js';

export interface RawTikTokCommentPayload {
  userId?: string;
  uniqueId?: string;
  nickname?: string;
  comment?: string;
  createTime?: number;
}

export interface RawTikTokGiftPayload {
  userId?: string;
  uniqueId?: string;
  nickname?: string;
  giftId?: number;
  giftName?: string;
  diamondCount?: number;
  repeatCount?: number;
}

export class TikTokLiveAdapter {
  private sequenceCounter: number = 0;

  /**
   * Classify user intent based on chat content.
   */
  public classifyIntent(text: string): ChatIntentType {
    const normalized = text.toLowerCase().trim();

    // Link queries
    if (
      normalized.includes('link') ||
      normalized.includes('where is the site') ||
      normalized.includes('website') ||
      normalized.includes('url') ||
      normalized.includes('in bio') ||
      normalized.includes('drop the link')
    ) {
      return 'LINK_REQUEST';
    }

    // Access / join queries
    if (
      normalized.includes('how do i join') ||
      normalized.includes('how to join') ||
      normalized.includes('how to get in') ||
      normalized.includes('how to enter') ||
      normalized.includes('how do i get access') ||
      normalized.includes('sign up') ||
      normalized.includes('whitelist')
    ) {
      return 'ACCESS_QUERY';
    }

    // Pricing queries
    if (
      normalized.includes('how much') ||
      normalized.includes('price') ||
      normalized.includes('cost') ||
      normalized.includes('is it free')
    ) {
      return 'PRICE_QUERY';
    }

    // Positive affirmations
    if (
      normalized === 'w' ||
      normalized.includes('fire') ||
      normalized.includes('copped') ||
      normalized.includes('bought') ||
      normalized.includes('lets go') ||
      normalized.includes('secured')
    ) {
      return 'POSITIVE_AFFIRM';
    }

    return 'GENERAL_NOISE';
  }

  /**
   * Convert raw comment frame into LiveEvent.
   */
  public transformComment(raw: RawTikTokCommentPayload): LiveEvent {
    this.sequenceCounter++;
    const text = raw.comment ?? '';
    const intent = this.classifyIntent(text);

    return {
      eventId: `ev_tt_chat_${crypto.randomUUID()}`,
      sequence: this.sequenceCounter,
      platform: 'tiktok_live',
      type: 'CHAT_MESSAGE',
      timestampMs: raw.createTime ? Number(raw.createTime) : Date.now(),
      payload: {
        userId: raw.userId ?? raw.uniqueId,
        username: raw.nickname ?? raw.uniqueId,
        text,
        intent,
      },
    };
  }

  /**
   * Convert raw gift frame into LiveEvent.
   */
  public transformGift(raw: RawTikTokGiftPayload): LiveEvent {
    this.sequenceCounter++;
    const coins = (raw.diamondCount ?? 1) * (raw.repeatCount ?? 1);

    return {
      eventId: `ev_tt_gift_${crypto.randomUUID()}`,
      sequence: this.sequenceCounter,
      platform: 'tiktok_live',
      type: 'GIFT_DONATION',
      timestampMs: Date.now(),
      payload: {
        userId: raw.userId ?? raw.uniqueId,
        username: raw.nickname ?? raw.uniqueId,
        giftName: raw.giftName ?? 'Gift',
        giftValueCoins: coins,
      },
    };
  }

  /**
   * Convert viewer join event into LiveEvent.
   */
  public transformJoin(userId?: string, username?: string): LiveEvent {
    this.sequenceCounter++;
    return {
      eventId: `ev_tt_join_${crypto.randomUUID()}`,
      sequence: this.sequenceCounter,
      platform: 'tiktok_live',
      type: 'VIEWER_JOIN',
      timestampMs: Date.now(),
      payload: {
        userId,
        username,
      },
    };
  }
}
