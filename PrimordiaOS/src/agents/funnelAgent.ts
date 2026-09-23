// src/agents/funnelAgent.ts

import {
  FunnelState,
  Decision,
  OfferState,
  OfferEventType,
  BlogPost,
  BlogEventType,
  NarrativeEpisode,
  NarrativeEventType,
} from '../contracts/types.js';

export type StateChangeListener = (newState: FunnelState) => void;
export type OfferEventListener = (event: OfferEventType, state: OfferState) => void;
export type BlogEventListener = (event: BlogEventType, post: BlogPost) => void;
export type NarrativeEventListener = (event: NarrativeEventType, episode: NarrativeEpisode) => void;
export type WebSocketBroadcaster = (channel: string, payload: unknown) => void;
export type SseBroadcaster = (event: string, data: unknown) => void;

export class FunnelAgent {
  private currentState: FunnelState;
  private currentOfferState: OfferState = { activeOffer: null, lastOfferTs: 0 };
  private readonly listeners: Set<StateChangeListener> = new Set();
  private readonly offerListeners: Set<OfferEventListener> = new Set();
  private readonly blogListeners: Set<BlogEventListener> = new Set();
  private readonly narrativeListeners: Set<NarrativeEventListener> = new Set();
  private wsBroadcaster?: WebSocketBroadcaster;
  private sseBroadcaster?: SseBroadcaster;

  constructor(initialState?: Partial<FunnelState>) {
    this.currentState = {
      funnelId: initialState?.funnelId ?? 'primordia_default_funnel',
      activeCtaId: initialState?.activeCtaId ?? 'cta_standard_access',
      ctaLabel: initialState?.ctaLabel ?? 'Enter Primordial Origin',
      targetUrl: initialState?.targetUrl ?? 'https://primordialorigin.com',
      pinnedMessage: initialState?.pinnedMessage,
      activeTier: initialState?.activeTier ?? 'CORE',
      lastModifiedMs: Date.now(),
      updateCount: 0,
      activeOfferPrice: initialState?.activeOfferPrice,
    };
  }

  public getState(): FunnelState {
    return { ...this.currentState };
  }

  public getOfferState(): OfferState {
    return { ...this.currentOfferState };
  }

  /**
   * Applies standard Decision mutation to funnel state.
   */
  public applyDecision(decision: Decision): FunnelState {
    const { payload } = decision;

    this.currentState = {
      ...this.currentState,
      activeCtaId: payload.targetCtaId ?? this.currentState.activeCtaId,
      ctaLabel: payload.ctaLabel ?? this.currentState.ctaLabel,
      targetUrl: payload.targetUrl ?? this.currentState.targetUrl,
      pinnedMessage: payload.messageToPin ?? this.currentState.pinnedMessage,
      activeTier: decision.action === 'SWITCH_OFFER_TIER' ? 'SOVEREIGN_ENTERPRISE' : this.currentState.activeTier,
      lastModifiedMs: Date.now(),
      updateCount: this.currentState.updateCount + 1,
    };

    this.notifyListeners();
    return this.getState();
  }

  /**
   * Applies autonomous OfferState to Funnel CTA state.
   * Emits OFFER_UPDATED or OFFER_CLEARED to subscribers.
   */
  public applyOfferState(offerState: OfferState): FunnelState {
    this.currentOfferState = { ...offerState };
    const offer = offerState.activeOffer;

    if (offer) {
      const targetCtaId =
        (offer.payload?.targetCtaId as string) ??
        `cta_${offer.offerType.toLowerCase()}_${offer.price}`;

      this.currentState = {
        ...this.currentState,
        activeCtaId: targetCtaId,
        ctaLabel: offer.ctaText,
        targetUrl: offer.destinationUrl,
        activeOfferPrice: offer.price,
        activeTier: offer.offerType === 'VIP' ? 'SOVEREIGN_ENTERPRISE' : this.currentState.activeTier,
        lastModifiedMs: Date.now(),
        updateCount: this.currentState.updateCount + 1,
      };

      this.broadcastOfferEvent('OFFER_UPDATED', this.currentOfferState);
    } else {
      this.currentState = {
        ...this.currentState,
        activeOfferPrice: undefined,
        lastModifiedMs: Date.now(),
        updateCount: this.currentState.updateCount + 1,
      };

      this.broadcastOfferEvent('OFFER_CLEARED', this.currentOfferState);
    }

    this.notifyListeners();
    return this.getState();
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeOfferEvents(listener: OfferEventListener): () => void {
    this.offerListeners.add(listener);
    return () => this.offerListeners.delete(listener);
  }

  public subscribeBlogEvents(listener: BlogEventListener): () => void {
    this.blogListeners.add(listener);
    return () => this.blogListeners.delete(listener);
  }

  public subscribeNarrativeEvents(listener: NarrativeEventListener): () => void {
    this.narrativeListeners.add(listener);
    return () => this.narrativeListeners.delete(listener);
  }

  public setWebSocketBroadcaster(broadcaster: WebSocketBroadcaster): void {
    this.wsBroadcaster = broadcaster;
  }

  public setSseBroadcaster(broadcaster: SseBroadcaster): void {
    this.sseBroadcaster = broadcaster;
  }

  /**
   * Broadcasts generated narrative episode across multi-channels:
   * 1. Registered narrativeListeners
   * 2. WebSocket stream
   * 3. Server-Sent Events (SSE)
   * 4. CLI console
   */
  public broadcastNarrativeEpisode(episode: NarrativeEpisode): void {
    // 1. In-process listeners
    this.narrativeListeners.forEach((listener) => {
      try {
        listener('NARRATIVE_EPISODE_CREATED', episode);
      } catch (err) {
        console.error('[FunnelAgent] Error notifying narrative listener:', err);
      }
    });

    // 2. WebSocket broadcast
    try {
      this.wsBroadcaster?.('NARRATIVE_EPISODE_CREATED', {
        type: 'NARRATIVE_EPISODE_CREATED',
        episode,
        timestampMs: Date.now(),
      });
    } catch (err) {
      console.error('[FunnelAgent] Error broadcasting narrative episode over WebSocket:', err);
    }

    // 3. SSE broadcast
    try {
      this.sseBroadcaster?.('NARRATIVE_EPISODE_CREATED', {
        episode,
        timestampMs: Date.now(),
      });
    } catch (err) {
      console.error('[FunnelAgent] Error broadcasting narrative episode over SSE:', err);
    }

    // 4. CLI console output
    console.log(
      `[SOVEREIGN_NARRATIVE] 📜 Episode Created: "${episode.title}"\n` +
      `                     Protagonist: ${episode.protagonistId} | Realm Focus: ${episode.realmFocus}\n` +
      `                     Audit Hash: ${episode.auditHash.slice(0, 16)}... | Words: ${episode.wordCount}`
    );
  }

  /**
   * Broadcasts auto-published blog post across multi-channels:
   * 1. Registered blogListeners
   * 2. WebSocket stream
   * 3. Server-Sent Events (SSE)
   * 4. CLI console
   */
  public notifyBlogPost(post: BlogPost): void {
    // 1. In-process listeners
    this.blogListeners.forEach((listener) => {
      try {
        listener('BLOG_POST_CREATED', post);
      } catch (err) {
        console.error('[FunnelAgent] Error notifying blog listener:', err);
      }
    });

    // 2. WebSocket broadcast
    try {
      this.wsBroadcaster?.('BLOG_POST_CREATED', {
        type: 'BLOG_POST_CREATED',
        post,
        timestampMs: Date.now(),
      });
    } catch (err) {
      console.error('[FunnelAgent] Error broadcasting blog post over WebSocket:', err);
    }

    // 3. SSE broadcast
    try {
      this.sseBroadcaster?.('BLOG_POST_CREATED', {
        post,
        timestampMs: Date.now(),
      });
    } catch (err) {
      console.error('[FunnelAgent] Error broadcasting blog post over SSE:', err);
    }

    // 4. CLI console output
    const glyphStr = post.glyphs && post.glyphs.length > 0 ? `[✦ ${post.glyphs.join(' · ')}]` : '';
    console.log(
      `[SOVEREIGN_BLOG] ✦ Auto-Published: "${post.title}" ${glyphStr}\n` +
      `                 Realm: ${post.realm} | Slug: /data/blog/${post.slug}.md\n` +
      `                 Audit Hash: ${post.auditHash.slice(0, 16)}... | Words: ${post.wordCount ?? 0}`
    );
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[FunnelAgent] Error notifying state listener:', err);
      }
    });
  }

  private broadcastOfferEvent(event: OfferEventType, state: OfferState): void {
    this.offerListeners.forEach((listener) => {
      try {
        listener(event, state);
      } catch (err) {
        console.error(`[FunnelAgent] Error broadcasting ${event}:`, err);
      }
    });
  }
}
