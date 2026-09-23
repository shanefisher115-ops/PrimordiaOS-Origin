/**
 * ==============================================================================
 * 🔥 PHOM AUTONOMOUS SIGNAL SCOUT & AUTO-THRUST ENGINE
 * Continuously scans developer ecosystems (Reddit & Hacker News) for high-intent
 * pain points and automatically thrusts them directly into PHOM's SQLite Memory
 * Graph and Cockpit in real time — with zero manual searching required.
 *
 * Capabilities:
 * 1. Autonomous non-blocking background polling loop (Reddit JSON & HN Algolia API).
 * 2. Surgical category matching & intent scoring (0-100).
 * 3. Immediate ACID SQLite persistence (signals, prospects, personas, outbound).
 * 4. Unreal Engine 5.8 Niagara pulse telemetry emission.
 * 5. Instant Cockpit WebSocket broadcasting ('signal:ingested', 'graph:updated').
 * 6. Direct Mobile / Phone push alerting (via ntfy.sh or custom webhook).
 * ==============================================================================
 */
import crypto from 'crypto';
import { db, checkpointWal } from '../db';
import { PhomRealMemoryGraph } from './layer7_memory_graph';
import { createSignalEnvelope } from './layer0_inputs';
import { generateOutbound } from './layer4_outbound';
import { emitNiagaraPulse, emitAgentNiagaraPulse } from './unreal_niagara_bridge';
import { AlertLatticeOrchestrator } from '../alert_lattice';
const CATEGORY_PATTERNS = {
    STRIPE_WEBHOOK_ERROR: [
        /stripe.*webhook/i,
        /signature.*verification/i,
        /constructevent/i,
        /raw.*body/i,
        /webhook.*failed/i
    ],
    BOILERPLATE_DEMAND: [
        /(recommend|best|looking for).*boilerplate/i,
        /(recommend|best|looking for).*starter.*kit/i,
        /boilerplate.*fatigue/i,
        /tired of.*boilerplate/i,
        /build vs buy.*boilerplate/i
    ],
    SQLITE_LOCAL_FIRST: [
        /sqlite.*wal/i,
        /database.*locked/i,
        /local-first.*sync/i,
        /background.*worker/i,
        /daemon.*architecture/i
    ],
    UNREAL_AI_METAHUMAN: [
        /metahuman.*dialogue/i,
        /metahuman.*ai/i,
        /npc.*ai.*unreal/i,
        /unreal.*websocket/i,
        /niagara.*telemetry/i
    ]
};
const SURGICAL_SOLUTIONS = {
    STRIPE_WEBHOOK_ERROR: {
        summary: 'Fix Next.js 15 App Router Stripe raw-buffer signature verification failure',
        snippet: 'In Next.js 15 App Router, do not call req.json() before verification. Stripe requires the untouched raw body string: `const rawBody = await req.text();`. Pass rawBody, req.headers.get("stripe-signature"), and STRIPE_WEBHOOK_SECRET directly into stripe.webhooks.constructEvent(). Store event.id in DB for idempotency.',
        interests: ['Stripe', 'Next.js 15', 'Webhooks', 'TypeScript', 'App Router']
    },
    BOILERPLATE_DEMAND: {
        summary: 'Recommend Zero-Bloat, Local-First Production Architecture',
        snippet: 'Skip hyper-marketed starter kits that bundle 50 unused dependencies. Prioritize 3 essentials: (1) Raw-buffer webhook handling for Stripe/SES, (2) Local-first state durability with SQLite WAL mode, and (3) Decoupled auth/billing domains that keep core business logic clean and portable.',
        interests: ['Next.js', 'React 19', 'TypeScript', 'SaaS Boilerplate', 'Tailwind CSS']
    },
    SQLITE_LOCAL_FIRST: {
        summary: 'Fix SQLite database locks with WAL mode & checkpoint intervals',
        snippet: 'Set `PRAGMA journal_mode = WAL;`, `PRAGMA synchronous = NORMAL;`, and `PRAGMA busy_timeout = 10000;`. Run background checkpointing on an unreferenced interval (walInterval.unref()) to prevent writer starvation during concurrent ingestion.',
        interests: ['SQLite', 'WAL Mode', 'Node.js Daemon', 'Local-First', 'ACID']
    },
    UNREAL_AI_METAHUMAN: {
        summary: 'Bi-directional WebSocket Telemetry Bridge for MetaHuman NPCs',
        snippet: 'Decouple cognitive deliberation from the game loop: run agent logic in an external daemon, stream high-rate player telemetry via WebSockets, and emit authoritative npc_action and Niagara pulse packets back to Unreal Engine 5.8 to minimize runtime latency.',
        interests: ['Unreal Engine 5.8', 'MetaHuman', 'Niagara Telemetry', 'WebSockets', 'AI NPCs']
    }
};
export class AutonomousSignalScout {
    static config = {
        enabled: true,
        intervalMs: 300000, // 5 minutes
        minScore: 40,
        mobilePushUrl: process.env.FLOW_MOBILE_PUSH_URL || 'https://ntfy.sh/primordia_flow_shane',
        subreddits: ['SaaS', 'nextjs', 'webdev', 'IndieHackers', 'unrealengine'],
        hnQueries: [
            'SaaS boilerplate',
            'Next.js boilerplate',
            'Stripe webhook',
            'local-first sync',
            'background worker daemon',
            'MetaHuman AI'
        ]
    };
    static timer = null;
    static isScanning = false;
    static totalThrustCount = 0;
    static lastScanTime = null;
    static broadcastFn = null;
    static setBroadcast(fn) {
        this.broadcastFn = fn;
    }
    static getConfig() {
        return { ...this.config };
    }
    static updateConfig(partial) {
        this.config = { ...this.config, ...partial };
        if (this.config.enabled && !this.timer) {
            this.start();
        }
        else if (!this.config.enabled && this.timer) {
            this.stop();
        }
        return this.getConfig();
    }
    static getStatus() {
        return {
            enabled: this.config.enabled,
            isScanning: this.isScanning,
            intervalMinutes: Math.round(this.config.intervalMs / 60000),
            minScore: this.config.minScore,
            totalThrustCount: this.totalThrustCount,
            lastScanTime: this.lastScanTime ? new Date(this.lastScanTime).toISOString() : null,
            mobilePushTarget: this.config.mobilePushUrl
        };
    }
    /**
     * Starts continuous background scouting loop
     */
    static start() {
        if (this.timer)
            clearInterval(this.timer);
        this.config.enabled = true;
        console.log(`[AutoScout] Autonomous Signal Scout started. Polling every ${Math.round(this.config.intervalMs / 60000)}m.`);
        // Initial scan shortly after boot (15 seconds)
        setTimeout(() => {
            this.scan().catch(err => console.warn('[AutoScout Initial Scan Error]:', err.message));
        }, 15000);
        this.timer = setInterval(() => {
            this.scan().catch(err => console.warn('[AutoScout Interval Scan Error]:', err.message));
        }, this.config.intervalMs);
        if (this.timer.unref)
            this.timer.unref();
    }
    static stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.config.enabled = false;
        console.log('[AutoScout] Autonomous Signal Scout stopped.');
    }
    /**
     * Manual pass trigger
     */
    static async runOnce() {
        return this.scan();
    }
    /**
     * Evaluates text for intent score & problem category
     */
    static scoreIntent(title, body = '') {
        const text = `${title} ${body}`.toLowerCase();
        let score = 0;
        const matchedCategories = [];
        for (const [cat, patterns] of Object.entries(CATEGORY_PATTERNS)) {
            for (const pat of patterns) {
                if (pat.test(text)) {
                    score += 35;
                    if (!matchedCategories.includes(cat))
                        matchedCategories.push(cat);
                    break;
                }
            }
        }
        const frictionKeywords = ['failed', 'failing', 'error', 'broken', 'stuck', 'issue', 'help', 'trouble', 'frustrated', 'why does'];
        if (frictionKeywords.some(k => text.includes(k)))
            score += 25;
        const intentKeywords = ['recommend', 'looking for', 'best', 'which', 'alternative', 'starter kit', 'boilerplate'];
        if (intentKeywords.some(k => text.includes(k)))
            score += 25;
        if (title.includes('?'))
            score += 10;
        const promoKeywords = ['i built', 'check out my', 'launching today', 'my new project', 'giveaway', 'discount'];
        if (promoKeywords.some(k => text.includes(k)))
            score -= 40;
        const finalScore = Math.max(0, Math.min(100, score));
        const category = matchedCategories[0] || 'GENERAL_TECHNICAL_INQUIRY';
        return { score: finalScore, category };
    }
    /**
     * Master Ingestion function:
     * Persists signal directly to SQLite signals, prospects, personas, and outbound,
     * fires Niagara particle pulses to Unreal Engine 5.8, and emits WebSocket + mobile notifications.
     */
    static async ingestSignal(raw, options = {}) {
        const { autoOutbound = true, notifyMobile = true } = options;
        const content = String(raw.content || '').trim();
        const title = raw.url || content.slice(0, 80);
        const authorRaw = String(raw.author || 'Anonymous Lead').trim();
        const cleanAuthor = authorRaw.replace(/^(u\/|@)/, '');
        const source = String(raw.source || 'web_scout').toLowerCase().trim();
        const url = String(raw.url || '').trim();
        const timestamp = raw.timestamp ? Math.floor(raw.timestamp) : Math.floor(Date.now() / 1000);
        // Intent scoring
        const scoring = this.scoreIntent(title, content);
        const intentScore = Number(raw.platformMetadata?.intentScore) || scoring.score;
        const category = String(raw.platformMetadata?.category || scoring.category);
        const heat = Math.max(30, Math.min(99, intentScore > 0 ? intentScore : 75));
        const band = heat >= 85 ? 'supercritical' : heat >= 70 ? 'hot' : 'warm';
        // Parse domain
        let domain = 'dev-community';
        if (url.startsWith('http')) {
            try {
                const u = new URL(url);
                domain = u.hostname.replace(/^www\./, '');
            }
            catch { }
        }
        const prospectId = `prosp_${crypto.randomUUID().slice(0, 8)}`;
        const signalId = `sig_${crypto.randomUUID().slice(0, 8)}`;
        // 1. Upsert Prospect in Memory Graph & SQLite
        PhomRealMemoryGraph.upsertProspect({
            id: prospectId,
            name: cleanAuthor,
            domain,
            heat,
            band,
            mxVerified: false,
            confidenceScore: heat
        });
        // 2. Normalized envelope
        const envelope = createSignalEnvelope({
            id: signalId,
            source,
            author: authorRaw,
            content,
            url,
            timestamp,
            platformMetadata: {
                ...(raw.platformMetadata || {}),
                intentScore: heat,
                category,
                autoThrusted: true
            }
        });
        // 3. Insert Signal in SQLite & Memory Graph
        PhomRealMemoryGraph.insertSignal(envelope, prospectId);
        // 4. Solution & Persona Synthesis
        const solution = SURGICAL_SOLUTIONS[category] || {
            summary: 'Targeted Technical Recommendation',
            snippet: 'Offer direct empathetic diagnosis, share clean production-tested code snippet, and invite collaboration.',
            interests: ['SaaS', 'Full-Stack', 'Architecture']
        };
        try {
            db.prepare(`
        INSERT INTO personas (id, prospect_id, tone, interests, preferred_platform, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(prospect_id) DO UPDATE SET
          interests = excluded.interests,
          updated_at = excluded.updated_at
      `).run(`pers_${crypto.randomUUID().slice(0, 8)}`, prospectId, 'technical', JSON.stringify(solution.interests), source.includes('reddit') ? 'reddit' : 'email', Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000));
        }
        catch { }
        // 5. Synthesize Outbound Draft
        if (autoOutbound) {
            try {
                const outbound = generateOutbound({
                    tone: 'technical',
                    interests: solution.interests,
                    preferredPlatform: source.includes('reddit') ? 'reddit' : 'email',
                    ctaPreference: solution.summary
                }, {
                    name: cleanAuthor,
                    domain,
                    heat,
                    band
                });
                db.prepare(`
          INSERT INTO outbound (id, prospect_id, persona_id, platform, text, variants_json, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'ready', ?)
        `).run(`out_${crypto.randomUUID().slice(0, 8)}`, prospectId, null, source.includes('reddit') ? 'reddit' : 'email', `[${solution.summary}]\n\n${solution.snippet}\n\n${outbound.text}`, JSON.stringify([solution.snippet, outbound.text]), Math.floor(Date.now() / 1000));
            }
            catch (err) {
                console.warn('[AutoScout Outbound Gen Notice]:', err.message);
            }
        }
        // 6. Unreal Engine 5.8 Telemetry Pulse
        try {
            emitAgentNiagaraPulse('discoveryAgent', 'High-Intent Signal Thrust', {
                source,
                author: cleanAuthor,
                heat,
                category,
                url
            });
            emitNiagaraPulse({
                emitter: 'ProspectBeacon',
                intensity: heat / 30,
                color: heat >= 85 ? [1.0, 0.25, 0.1, 1.0] : [0.15, 0.8, 1.0, 1.0],
                coordinates: { x: (heat - 50) * 8, y: 120, z: 200 },
                velocity: { vx: 0, vy: 0, vz: 45 },
                metadata: { source, heat, category }
            });
        }
        catch { }
        // 7. WebSocket Broadcast to Cockpit
        if (this.broadcastFn) {
            this.broadcastFn('signal:ingested', envelope);
            this.broadcastFn('graph:updated', { source: 'auto_scout', signalId, prospectId, heat });
        }
        // 8. Sovereign 6-Rail Alert Lattice Fan-Out (Phone, Desktop, Email, HUD, Unreal 5.8, CLI)
        if (notifyMobile && heat >= 40) {
            AlertLatticeOrchestrator.dispatch({
                id: signalId,
                source,
                score: heat,
                type: category === 'STRIPE_WEBHOOK_ERROR' ? 'failure' : 'opportunity',
                title: `${cleanAuthor}: ${content.slice(0, 80)}`,
                summary: content.slice(0, 300),
                url,
                createdAt: timestamp,
                payload: { prospectId, category, solutionSummary: solution.summary }
            }).catch((err) => {
                console.warn('[AlertLattice AutoScout Notice]:', err.message);
            });
        }
        checkpointWal();
        this.totalThrustCount++;
        return {
            success: true,
            signalId,
            prospectId,
            heat,
            band,
            category,
            author: cleanAuthor,
            envelope
        };
    }
    /**
     * Dispatches instant alert to user's phone via ntfy.sh or webhook
     */
    static async dispatchMobileAlert(payload) {
        if (!this.config.mobilePushUrl)
            return false;
        try {
            const headers = {
                'Title': payload.title,
                'Priority': payload.priority || 'high',
                'Tags': 'fire,satellite_antenna'
            };
            if (payload.url) {
                headers['Click'] = payload.url;
                headers['Actions'] = `view, Open Signal, ${payload.url}`;
            }
            await fetch(this.config.mobilePushUrl, {
                method: 'POST',
                headers,
                body: payload.message,
                signal: AbortSignal.timeout(4000)
            });
            console.log(`[AutoScout] 📱 Mobile alert thrust to ${this.config.mobilePushUrl}`);
            return true;
        }
        catch (err) {
            // Non-blocking mobile push notice
            return false;
        }
    }
    /**
     * Master scan cycle across Reddit & Hacker News
     */
    static async scan() {
        if (this.isScanning)
            return { count: 0, signals: [] };
        this.isScanning = true;
        this.lastScanTime = Date.now();
        const discoveredSignals = [];
        try {
            console.log('[AutoScout] 🛰️ Autonomous searchers scanning internet feeds for high-intent signals...');
            // 1. Fetch Reddit Subreddits
            for (const sub of this.config.subreddits) {
                try {
                    const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=12`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PrimordiaFlow-AutoScout/2.0'
                        },
                        signal: AbortSignal.timeout(5000)
                    });
                    if (!res.ok)
                        continue;
                    const data = await res.json();
                    const posts = data?.data?.children || [];
                    for (const post of posts) {
                        const p = post?.data;
                        if (!p)
                            continue;
                        const permalink = `https://reddit.com${p.permalink}`;
                        // Check if already in SQLite
                        const exists = db.prepare('SELECT id FROM signals WHERE url = ? LIMIT 1').get(permalink);
                        if (exists)
                            continue;
                        const { score, category } = this.scoreIntent(p.title || '', p.selftext || '');
                        if (score >= this.config.minScore) {
                            const result = await this.ingestSignal({
                                source: `r/${sub}`,
                                author: `u/${p.author || 'dev'}`,
                                content: `${p.title}\n\n${(p.selftext || '').slice(0, 600)}`,
                                url: permalink,
                                timestamp: p.created_utc || Math.floor(Date.now() / 1000),
                                platformMetadata: { intentScore: score, category }
                            });
                            console.log(`[AutoScout] 🔥 Auto-thrusted Reddit signal into PHOM: [r/${sub}] u/${p.author} (Score: ${score})`);
                            discoveredSignals.push(result);
                        }
                    }
                }
                catch (subErr) {
                    // Soft fail per sub to continue scanning
                }
            }
            // 2. Fetch Hacker News (Algolia API)
            for (const q of this.config.hnQueries.slice(0, 3)) { // scan top queries
                try {
                    const enc = encodeURIComponent(q);
                    const res = await fetch(`https://hn.algolia.com/api/v1/search_by_date?tags=ask_hn,story&query=${enc}&hitsPerPage=10`, {
                        signal: AbortSignal.timeout(5000)
                    });
                    if (!res.ok)
                        continue;
                    const data = await res.json();
                    const hits = data?.hits || [];
                    for (const hit of hits) {
                        const hnUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;
                        const exists = db.prepare('SELECT id FROM signals WHERE url = ? LIMIT 1').get(hnUrl);
                        if (exists)
                            continue;
                        const { score, category } = this.scoreIntent(hit.title || '', hit.story_text || '');
                        if (score >= this.config.minScore) {
                            const result = await this.ingestSignal({
                                source: 'Hacker News',
                                author: hit.author || 'hn_user',
                                content: `${hit.title}\n\n${(hit.story_text || '').slice(0, 600)}`,
                                url: hnUrl,
                                timestamp: hit.created_at_i || Math.floor(Date.now() / 1000),
                                platformMetadata: { intentScore: score, category }
                            });
                            console.log(`[AutoScout] 🔥 Auto-thrusted Hacker News signal into PHOM: ${hit.title?.slice(0, 40)} (Score: ${score})`);
                            discoveredSignals.push(result);
                        }
                    }
                }
                catch (hnErr) { }
            }
            if (discoveredSignals.length > 0) {
                console.log(`[AutoScout] ✅ Auto-thrust complete: ${discoveredSignals.length} new high-intent signals loaded into PHOM Memory Graph.`);
            }
        }
        finally {
            this.isScanning = false;
        }
        return { count: discoveredSignals.length, signals: discoveredSignals };
    }
}
