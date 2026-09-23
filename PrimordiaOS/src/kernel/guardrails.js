// src/kernel/guardrails.ts
export class Guardrails {
    config;
    lastActionTimestampMs = new Map();
    lastOfferTimestampMs = new Map();
    lastProtagonistTimestampMs = new Map();
    protagonistHistory = new Map();
    lastBlogTimestampMs = 0;
    lastBlogTopic = null;
    processedIdempotencyKeys = new Set();
    hourlyActionTimestamps = [];
    hourlyOfferTimestamps = [];
    hourlyBlogTimestamps = [];
    minOfferCooldownSec;
    minPriceFloorUsd;
    maxPriceCeilingUsd;
    maxOffersPerHour;
    minBlogCooldownSec;
    maxBlogWordCount;
    minBlogWordCount;
    maxBlogPostsPerHour;
    minProtagonistCooldownSec;
    maxEpisodeWordCount;
    allowedNarrativeRealms;
    constructor(config) {
        this.config = config;
        this.minOfferCooldownSec = config.minOfferCooldownSec ?? 120;
        this.minPriceFloorUsd = config.minPriceFloorUsd ?? 1;
        this.maxPriceCeilingUsd = config.maxPriceCeilingUsd ?? 999;
        this.maxOffersPerHour = config.maxOffersPerHour ?? 30;
        this.minBlogCooldownSec = config.minBlogCooldownSec ?? 45;
        this.maxBlogWordCount = config.maxBlogWordCount ?? 2500;
        this.minBlogWordCount = config.minBlogWordCount ?? 150;
        this.maxBlogPostsPerHour = config.maxBlogPostsPerHour ?? 60;
        this.minProtagonistCooldownSec = config.minProtagonistCooldownSec ?? 60;
        this.maxEpisodeWordCount = config.maxEpisodeWordCount ?? 2000;
        this.allowedNarrativeRealms = config.allowedNarrativeRealms ?? [
            'PRIMORDIAOS_CORE',
            'PLUGIN_OS',
            'MONEYPLUGHUB',
            'PRIMORDIAL_ORIGIN',
            'IMMERSIVE_COMPUTATION',
            'CINEMATIC_PROTAGONIST_OS',
            'OFFER_ENGINE',
            'OFFER_ENGINE_TRIALS',
            'ANTIGRAV_SOVEREIGN_MYTH',
        ];
    }
    /**
     * Validates standard decisions, offer decisions, blog posts, or narrative episodes against sovereign guardrails.
     */
    validate(decision) {
        const isNarrative = 'actStructure' in decision && 'beats' in decision;
        if (isNarrative) {
            return this.validateNarrative(decision);
        }
        const isBlog = 'realm' in decision && 'body' in decision;
        if (isBlog) {
            return this.validateBlogPost(decision);
        }
        const isOffer = ('action' in decision && decision.action === 'OFFER_DECISION') ||
            'offerType' in decision ||
            'price' in decision;
        if (isOffer) {
            return this.validateOffer(decision);
        }
        const now = Date.now();
        // 1. Idempotency Check
        if (this.processedIdempotencyKeys.has(decision.idempotencyKey)) {
            return {
                allowed: false,
                decision,
                rejectionCode: 'IDEMPOTENT_DUPLICATE',
                rejectionReason: `Idempotency key ${decision.idempotencyKey} has already been executed.`,
            };
        }
        // 2. Cooldown Check per Action Type
        const lastTimestamp = this.lastActionTimestampMs.get(decision.action) ?? 0;
        const elapsedSec = (now - lastTimestamp) / 1000;
        if (elapsedSec < this.config.minActionCooldownSec) {
            return {
                allowed: false,
                decision,
                rejectionCode: 'COOLDOWN_ACTIVE',
                rejectionReason: `Action ${decision.action} triggered too quickly. ${Math.ceil(this.config.minActionCooldownSec - elapsedSec)}s remaining on cooldown.`,
            };
        }
        // 3. Hourly Velocity Ceiling
        this.cleanHourlyTimestamps(now);
        if (this.hourlyActionTimestamps.length >= this.config.maxDecisionsPerHour) {
            return {
                allowed: false,
                decision,
                rejectionCode: 'RATE_LIMIT_EXCEEDED',
                rejectionReason: `Max hourly decision threshold (${this.config.maxDecisionsPerHour}/hr) reached.`,
            };
        }
        // 4. Payload & Domain Whitelist Validation
        const url = decision.payload?.targetUrl;
        if (url) {
            const urlCheck = this.validateDomain(url, decision, false);
            if (!urlCheck.allowed)
                return urlCheck;
        }
        return {
            allowed: true,
            decision,
        };
    }
    /**
     * Sovereign Guardrail check specifically for OfferDecision:
     * - Price Floor: $1
     * - Price Ceiling: $999
     * - Domain Whitelist Enforcement
     * - SHA-256 Idempotency Deduplication
     * - 120s Offer Cooldown
     * - OfferType Throttling Rules
     */
    validateOffer(offer) {
        const now = Date.now();
        // 1. Price Floor & Ceiling Guardrail
        if (offer.price < this.minPriceFloorUsd || offer.price > this.maxPriceCeilingUsd) {
            return {
                allowed: false,
                decision: offer,
                rejectionCode: 'UNSAFE_PRICE_RANGE',
                rejectionReason: `Offer price $${offer.price} violates sovereign bounds [$${this.minPriceFloorUsd}, $${this.maxPriceCeilingUsd}].`,
            };
        }
        // 2. SHA-256 Idempotency Deduplication
        if (this.processedIdempotencyKeys.has(offer.idempotencyKey)) {
            return {
                allowed: false,
                decision: offer,
                rejectionCode: 'IDEMPOTENT_DUPLICATE',
                rejectionReason: `Offer idempotency key ${offer.idempotencyKey} has already been executed.`,
            };
        }
        // 3. Offer Cooldown Check (120s)
        const cooldownKey = offer.cooldownKey || `OFFER_COOLDOWN_${offer.offerType}`;
        const lastTimestamp = this.lastOfferTimestampMs.get(cooldownKey) ?? 0;
        const elapsedSec = (now - lastTimestamp) / 1000;
        if (elapsedSec < this.minOfferCooldownSec) {
            return {
                allowed: false,
                decision: offer,
                rejectionCode: 'COOLDOWN_ACTIVE',
                rejectionReason: `Offer cooldown active for ${cooldownKey}. ${Math.ceil(this.minOfferCooldownSec - elapsedSec)}s remaining on 120s cooldown.`,
            };
        }
        // 4. Offer Velocity Ceiling & Throttling
        this.cleanHourlyOfferTimestamps(now);
        if (this.hourlyOfferTimestamps.length >= this.maxOffersPerHour) {
            return {
                allowed: false,
                decision: offer,
                rejectionCode: 'RATE_LIMIT_EXCEEDED',
                rejectionReason: `Max hourly offer threshold (${this.maxOffersPerHour}/hr) reached. Throttling active.`,
            };
        }
        // 5. Destination URL & Domain Whitelist Enforcement
        const targetUrl = offer.destinationUrl || offer.payload?.targetUrl;
        if (targetUrl) {
            const urlCheck = this.validateDomain(targetUrl, offer, true);
            if (!urlCheck.allowed)
                return urlCheck;
        }
        return {
            allowed: true,
            decision: offer,
        };
    }
    /**
     * Sovereign Guardrail check specifically for BlogPost:
     * - 45s Blog Cooldown
     * - SHA-256 Idempotency Deduplication
     * - Topic Rotation Enforcement
     * - Anti-Collapse Recursion Guard
     * - Word Count Bounds [150, 2500]
     * - Glyph-Bound Safety Constraints
     * - Deterministic Generation & Audit Integrity
     */
    validateBlogPost(post, topicState) {
        const now = Date.now();
        // 1. Idempotency Deduplication Check
        if (this.processedIdempotencyKeys.has(post.idempotencyKey)) {
            return {
                allowed: false,
                decision: post,
                rejectionCode: 'IDEMPOTENT_DUPLICATE',
                rejectionReason: `Blog post idempotency key ${post.idempotencyKey} has already been executed.`,
            };
        }
        // 2. Blog Cooldown Check (45s)
        const elapsedSec = (now - this.lastBlogTimestampMs) / 1000;
        if (elapsedSec < this.minBlogCooldownSec) {
            return {
                allowed: false,
                decision: post,
                rejectionCode: 'COOLDOWN_ACTIVE',
                rejectionReason: `Blog engine cooldown active. ${Math.ceil(this.minBlogCooldownSec - elapsedSec)}s remaining on ${this.minBlogCooldownSec}s cooldown.`,
            };
        }
        // 3. Hourly Velocity Ceiling
        this.cleanHourlyBlogTimestamps(now);
        if (this.hourlyBlogTimestamps.length >= this.maxBlogPostsPerHour) {
            return {
                allowed: false,
                decision: post,
                rejectionCode: 'RATE_LIMIT_EXCEEDED',
                rejectionReason: `Max hourly blog post threshold (${this.maxBlogPostsPerHour}/hr) reached.`,
            };
        }
        // 4. Topic Rotation Enforcement
        if (this.lastBlogTopic && this.lastBlogTopic === post.realm) {
            return {
                allowed: false,
                decision: post,
                rejectionCode: 'TOPIC_ROTATION_VIOLATION',
                rejectionReason: `Topic rotation violation: consecutive post in realm '${post.realm}' is prohibited without rotating through other sovereign topics.`,
            };
        }
        if (topicState && post.realm !== topicState.activeTopic) {
            return {
                allowed: false,
                decision: post,
                rejectionCode: 'TOPIC_ROTATION_VIOLATION',
                rejectionReason: `Topic drift detected: post realm '${post.realm}' does not match expected active topic '${topicState.activeTopic}'.`,
            };
        }
        // 5. Anti-Collapse Recursion Guard
        if (topicState?.recentHistory) {
            const recentHistory = topicState.recentHistory;
            const recentOccurrences = recentHistory
                .slice(-3)
                .filter((entry) => entry.topic === post.realm).length;
            if (recentOccurrences >= 2) {
                return {
                    allowed: false,
                    decision: post,
                    rejectionCode: 'RECURSION_LIMIT_EXCEEDED',
                    rejectionReason: `Anti-collapse recursion guard: topic '${post.realm}' appeared ${recentOccurrences} times in the last 3 entries.`,
                };
            }
        }
        if (/(while\s*\(\s*(?:true|1)\s*\)|for\s*\(\s*;\s*;\s*\))/i.test(post.body)) {
            return {
                allowed: false,
                decision: post,
                rejectionCode: 'RECURSION_LIMIT_EXCEEDED',
                rejectionReason: `Anti-collapse recursion guard: infinite unconstrained loop pattern detected in post body.`,
            };
        }
        // 6. Word Count Bounds [150, 2500]
        const wordCount = post.wordCount ?? post.body.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < this.minBlogWordCount || wordCount > this.maxBlogWordCount) {
            return {
                allowed: false,
                decision: post,
                rejectionCode: 'WORD_COUNT_OUT_OF_BOUNDS',
                rejectionReason: `Blog post word count (${wordCount}) violates sovereign bounds [${this.minBlogWordCount}, ${this.maxBlogWordCount}].`,
            };
        }
        // 7. Glyph-Bound Safety Constraints
        const allowedGlyphs = new Set(['Starflare', 'Spiral', 'Seed', 'Clock', 'Gate']);
        if (!post.glyphs ||
            post.glyphs.length === 0 ||
            post.glyphs.some((g) => !allowedGlyphs.has(g))) {
            return {
                allowed: false,
                decision: post,
                rejectionCode: 'UNSAFE_GLYPH_BINDING',
                rejectionReason: `Blog post must bind to authorized sovereign glyphs (Starflare, Spiral, Seed, Clock, Gate).`,
            };
        }
        // 8. Deterministic Generation & Audit Integrity
        if (!post.auditHash || !post.idempotencyKey || !post.slug || !post.title) {
            return {
                allowed: false,
                decision: post,
                rejectionCode: 'NON_DETERMINISTIC_DRIFT',
                rejectionReason: `Blog post is missing deterministic cryptographic tokens or slug.`,
            };
        }
        return {
            allowed: true,
            decision: post,
        };
    }
    /**
     * Commits decision to internal guardrail state.
     */
    commit(decision) {
        const isNarrative = 'actStructure' in decision && 'beats' in decision;
        if (isNarrative) {
            this.commitNarrative(decision);
            return;
        }
        const isBlog = 'realm' in decision && 'body' in decision;
        if (isBlog) {
            this.commitBlogPost(decision);
            return;
        }
        const isOffer = ('action' in decision && decision.action === 'OFFER_DECISION') ||
            'offerType' in decision ||
            'price' in decision;
        if (isOffer) {
            this.commitOffer(decision);
            return;
        }
        const now = Date.now();
        this.lastActionTimestampMs.set(decision.action, now);
        this.processedIdempotencyKeys.add(decision.idempotencyKey);
        this.hourlyActionTimestamps.push(now);
        this.pruneIdempotencyKeys();
    }
    /**
     * Commits offer decision to guardrail tracking structures.
     */
    commitOffer(offer) {
        const now = Date.now();
        const cooldownKey = offer.cooldownKey || `OFFER_COOLDOWN_${offer.offerType}`;
        this.lastOfferTimestampMs.set(cooldownKey, now);
        this.processedIdempotencyKeys.add(offer.idempotencyKey);
        this.hourlyOfferTimestamps.push(now);
        this.pruneIdempotencyKeys();
    }
    /**
     * Commits blog post to guardrail tracking structures.
     */
    commitBlogPost(post) {
        const now = Date.now();
        this.lastBlogTimestampMs = now;
        this.lastBlogTopic = post.realm;
        this.processedIdempotencyKeys.add(post.idempotencyKey);
        this.hourlyBlogTimestamps.push(now);
        this.pruneIdempotencyKeys();
    }
    /**
     * Sovereign Guardrail check for NarrativeEpisode:
     * - Max Episode Length: 2,000 words equivalent in beats
     * - Cooldown per protagonistId: 60s
     * - Topic Safety Constraints: no external speculation, only system-derived lore
     * - SHA-256 Idempotency Deduplication per (protagonistId, realmFocus, tsBucket)
     * - Anti-Recursion Guard: blocks self-referential infinite loops
     */
    validateNarrative(episode) {
        const now = Date.now();
        // 1. Max Episode Length Guardrail (2,000 words equivalent)
        if (episode.wordCount > this.maxEpisodeWordCount) {
            return {
                allowed: false,
                decision: episode,
                rejectionCode: 'MAX_EPISODE_LENGTH_EXCEEDED',
                rejectionReason: `Episode word count (${episode.wordCount}) exceeds sovereign limit of ${this.maxEpisodeWordCount} words.`,
            };
        }
        // 2. Cooldown per protagonistId (60s)
        const lastTimestamp = this.lastProtagonistTimestampMs.get(episode.protagonistId) ?? 0;
        const elapsedSec = (now - lastTimestamp) / 1000;
        if (elapsedSec < this.minProtagonistCooldownSec) {
            return {
                allowed: false,
                decision: episode,
                rejectionCode: 'PROTAGONIST_COOLDOWN_ACTIVE',
                rejectionReason: `Protagonist ${episode.protagonistId} is on narrative cooldown. ${Math.ceil(this.minProtagonistCooldownSec - elapsedSec)}s remaining on 60s cooldown.`,
            };
        }
        // 3. Topic Safety & System-Derived Lore Constraints
        const isAllowedRealm = this.allowedNarrativeRealms.some((r) => r.toUpperCase() === String(episode.realmFocus).toUpperCase());
        if (!isAllowedRealm) {
            return {
                allowed: false,
                decision: episode,
                rejectionCode: 'TOPIC_SAFETY_VIOLATION',
                rejectionReason: `Narrative realm '${episode.realmFocus}' violates topic safety constraint. Only system-derived lore schemas permitted.`,
            };
        }
        // Ensure all beats are system-grounded (no hallucination)
        const hasUngroundedBeats = episode.beats.some((b) => !b.groundedSignal || b.groundedSignal.trim() === '');
        if (hasUngroundedBeats) {
            return {
                allowed: false,
                decision: episode,
                rejectionCode: 'TOPIC_SAFETY_VIOLATION',
                rejectionReason: `Narrative contains ungrounded beats lacking verified system telemetry.`,
            };
        }
        // 4. SHA-256 Idempotency Deduplication per (protagonistId, realmFocus, tsBucket)
        if (this.processedIdempotencyKeys.has(episode.idempotencyKey)) {
            return {
                allowed: false,
                decision: episode,
                rejectionCode: 'IDEMPOTENT_DUPLICATE',
                rejectionReason: `Episode idempotency key ${episode.idempotencyKey} has already been recorded.`,
            };
        }
        // 5. Anti-Recursion Guard (no self-referential infinite loops)
        const history = this.protagonistHistory.get(episode.protagonistId) ?? [];
        if (history.length >= 2 && history.slice(-2).every((h) => h === episode.auditHash)) {
            return {
                allowed: false,
                decision: episode,
                rejectionCode: 'RECURSION_LIMIT_EXCEEDED',
                rejectionReason: `Protagonist ${episode.protagonistId} triggered anti-recursion lock with repeated audit hash ${episode.auditHash}.`,
            };
        }
        return {
            allowed: true,
            decision: episode,
        };
    }
    /**
     * Commits narrative episode to guardrail tracking structures.
     */
    commitNarrative(episode) {
        const now = Date.now();
        this.lastProtagonistTimestampMs.set(episode.protagonistId, now);
        this.processedIdempotencyKeys.add(episode.idempotencyKey);
        const history = this.protagonistHistory.get(episode.protagonistId) ?? [];
        history.push(episode.auditHash);
        if (history.length > 20)
            history.shift();
        this.protagonistHistory.set(episode.protagonistId, history);
        this.pruneIdempotencyKeys();
    }
    setProtagonistTimestampForTest(protagonistId, timestampMs) {
        this.lastProtagonistTimestampMs.set(protagonistId, timestampMs);
    }
    setActionTimestampForTest(action, timestampMs) {
        this.lastActionTimestampMs.set(action, timestampMs);
    }
    setOfferTimestampForTest(cooldownKey, timestampMs) {
        this.lastOfferTimestampMs.set(cooldownKey, timestampMs);
    }
    setBlogTimestampForTest(timestampMs) {
        this.lastBlogTimestampMs = timestampMs;
    }
    setLastBlogTopicForTest(topic) {
        this.lastBlogTopic = topic;
    }
    validateDomain(urlStr, decision, isOffer) {
        try {
            const parsed = new URL(urlStr);
            const isAllowed = this.config.allowedUrlDomains.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
            if (!isAllowed) {
                return {
                    allowed: false,
                    decision,
                    rejectionCode: isOffer ? 'UNAUTHORIZED_DOMAIN' : 'INVALID_PAYLOAD',
                    rejectionReason: `Target URL domain '${parsed.hostname}' is not in approved whitelist.`,
                };
            }
        }
        catch {
            return {
                allowed: false,
                decision,
                rejectionCode: 'INVALID_PAYLOAD',
                rejectionReason: `Target URL '${urlStr}' is malformed.`,
            };
        }
        return { allowed: true, decision };
    }
    cleanHourlyTimestamps(now) {
        const oneHourAgo = now - 3600 * 1000;
        this.hourlyActionTimestamps = this.hourlyActionTimestamps.filter((t) => t > oneHourAgo);
    }
    cleanHourlyOfferTimestamps(now) {
        const oneHourAgo = now - 3600 * 1000;
        this.hourlyOfferTimestamps = this.hourlyOfferTimestamps.filter((t) => t > oneHourAgo);
    }
    cleanHourlyBlogTimestamps(now) {
        const oneHourAgo = now - 3600 * 1000;
        this.hourlyBlogTimestamps = this.hourlyBlogTimestamps.filter((t) => t > oneHourAgo);
    }
    pruneIdempotencyKeys() {
        if (this.processedIdempotencyKeys.size > 2000) {
            const iterator = this.processedIdempotencyKeys.values();
            for (let i = 0; i < 400; i++) {
                const val = iterator.next().value;
                if (val)
                    this.processedIdempotencyKeys.delete(val);
            }
        }
    }
}
