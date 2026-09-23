// src/agents/funnelAgent.ts
export class FunnelAgent {
    currentState;
    currentOfferState = { activeOffer: null, lastOfferTs: 0 };
    listeners = new Set();
    offerListeners = new Set();
    blogListeners = new Set();
    narrativeListeners = new Set();
    wsBroadcaster;
    sseBroadcaster;
    constructor(initialState) {
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
    getState() {
        return { ...this.currentState };
    }
    getOfferState() {
        return { ...this.currentOfferState };
    }
    /**
     * Applies standard Decision mutation to funnel state.
     */
    applyDecision(decision) {
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
    applyOfferState(offerState) {
        this.currentOfferState = { ...offerState };
        const offer = offerState.activeOffer;
        if (offer) {
            const targetCtaId = offer.payload?.targetCtaId ??
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
        }
        else {
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
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    subscribeOfferEvents(listener) {
        this.offerListeners.add(listener);
        return () => this.offerListeners.delete(listener);
    }
    subscribeBlogEvents(listener) {
        this.blogListeners.add(listener);
        return () => this.blogListeners.delete(listener);
    }
    subscribeNarrativeEvents(listener) {
        this.narrativeListeners.add(listener);
        return () => this.narrativeListeners.delete(listener);
    }
    setWebSocketBroadcaster(broadcaster) {
        this.wsBroadcaster = broadcaster;
    }
    setSseBroadcaster(broadcaster) {
        this.sseBroadcaster = broadcaster;
    }
    /**
     * Broadcasts generated narrative episode across multi-channels:
     * 1. Registered narrativeListeners
     * 2. WebSocket stream
     * 3. Server-Sent Events (SSE)
     * 4. CLI console
     */
    broadcastNarrativeEpisode(episode) {
        // 1. In-process listeners
        this.narrativeListeners.forEach((listener) => {
            try {
                listener('NARRATIVE_EPISODE_CREATED', episode);
            }
            catch (err) {
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
        }
        catch (err) {
            console.error('[FunnelAgent] Error broadcasting narrative episode over WebSocket:', err);
        }
        // 3. SSE broadcast
        try {
            this.sseBroadcaster?.('NARRATIVE_EPISODE_CREATED', {
                episode,
                timestampMs: Date.now(),
            });
        }
        catch (err) {
            console.error('[FunnelAgent] Error broadcasting narrative episode over SSE:', err);
        }
        // 4. CLI console output
        console.log(`[SOVEREIGN_NARRATIVE] 📜 Episode Created: "${episode.title}"\n` +
            `                     Protagonist: ${episode.protagonistId} | Realm Focus: ${episode.realmFocus}\n` +
            `                     Audit Hash: ${episode.auditHash.slice(0, 16)}... | Words: ${episode.wordCount}`);
    }
    /**
     * Broadcasts auto-published blog post across multi-channels:
     * 1. Registered blogListeners
     * 2. WebSocket stream
     * 3. Server-Sent Events (SSE)
     * 4. CLI console
     */
    notifyBlogPost(post) {
        // 1. In-process listeners
        this.blogListeners.forEach((listener) => {
            try {
                listener('BLOG_POST_CREATED', post);
            }
            catch (err) {
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
        }
        catch (err) {
            console.error('[FunnelAgent] Error broadcasting blog post over WebSocket:', err);
        }
        // 3. SSE broadcast
        try {
            this.sseBroadcaster?.('BLOG_POST_CREATED', {
                post,
                timestampMs: Date.now(),
            });
        }
        catch (err) {
            console.error('[FunnelAgent] Error broadcasting blog post over SSE:', err);
        }
        // 4. CLI console output
        const glyphStr = post.glyphs && post.glyphs.length > 0 ? `[✦ ${post.glyphs.join(' · ')}]` : '';
        console.log(`[SOVEREIGN_BLOG] ✦ Auto-Published: "${post.title}" ${glyphStr}\n` +
            `                 Realm: ${post.realm} | Slug: /data/blog/${post.slug}.md\n` +
            `                 Audit Hash: ${post.auditHash.slice(0, 16)}... | Words: ${post.wordCount ?? 0}`);
    }
    notifyListeners() {
        const state = this.getState();
        this.listeners.forEach((listener) => {
            try {
                listener(state);
            }
            catch (err) {
                console.error('[FunnelAgent] Error notifying state listener:', err);
            }
        });
    }
    broadcastOfferEvent(event, state) {
        this.offerListeners.forEach((listener) => {
            try {
                listener(event, state);
            }
            catch (err) {
                console.error(`[FunnelAgent] Error broadcasting ${event}:`, err);
            }
        });
    }
}
