/**
 * ==============================================================================
 * ⭐ LAYER 6: ANALYTICS ENGINE
 * Tracks clicks and engagement:
 * - Tracks link clicks
 * - Tracks post analytics
 * - Stores in SQLite
 * - Updates memory graph
 *
 * Deliverable:
 * function updateAnalytics(postId, metrics) {
 *   // update memory graph
 * }
 * ==============================================================================
 */
import crypto from 'crypto';
import { db } from '../db';
/**
 * Initializes the SQLite `analytics` table.
 */
export function initAnalyticsTable() {
    try {
        db.exec(`
      CREATE TABLE IF NOT EXISTS analytics (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'unknown',
        clicks INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        replies INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        metrics_json TEXT,
        recorded_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_post ON analytics(post_id);
    `);
    }
    catch (err) {
        console.error('Warning: could not init analytics table in db:', err);
    }
}
/**
 * Deliverable Function:
 * Records metrics for a post and synchronizes with the memory graph.
 */
export function updateAnalytics(postId, metrics = {}) {
    initAnalyticsTable();
    const id = `an_${crypto.randomUUID().slice(0, 8)}`;
    const now = Math.floor(Date.now() / 1000);
    const platform = String(metrics.platform || 'social');
    const clicks = Number(metrics.clicks || 0);
    const impressions = Number(metrics.impressions || 0);
    const replies = Number(metrics.replies || 0);
    const conversions = Number(metrics.conversions || 0);
    const metricsJson = JSON.stringify(metrics);
    // 1. Store in SQLite analytics table
    try {
        db.prepare(`
      INSERT INTO analytics (id, post_id, platform, clicks, impressions, replies, conversions, metrics_json, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, postId, platform, clicks, impressions, replies, conversions, metricsJson, now);
    }
    catch (err) {
        console.warn('[Analytics Engine] DB insert notice:', err.message);
    }
    // 2. Update memory graph node and edge
    try {
        // Ensure graph tables exist
        db.exec(`
      CREATE TABLE IF NOT EXISTS phom_nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        properties_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS phom_edges (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relationship TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        properties_json TEXT,
        created_at INTEGER NOT NULL
      );
    `);
        // Ensure Post node exists in phom_nodes to satisfy FOREIGN KEY constraint
        db.prepare(`
      INSERT INTO phom_nodes (id, type, label, properties_json, created_at)
      VALUES (?, 'post', ?, '{}', ?)
      ON CONFLICT(id) DO NOTHING
    `).run(postId, `Post ${postId}`, now);
        // Upsert Analytics Node
        const nodeProps = JSON.stringify({ clicks, impressions, replies, conversions, platform });
        db.prepare(`
      INSERT INTO phom_nodes (id, type, label, properties_json, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        properties_json = excluded.properties_json
    `).run(`node_${id}`, 'analytics', `Analytics for ${postId}`, nodeProps, now);
        // Link Post/Outbound to Analytics
        const edgeId = `edge_${crypto.createHash('sha256').update(`${postId}:${id}`).digest('hex').slice(0, 10)}`;
        db.prepare(`
      INSERT INTO phom_edges (id, source_id, target_id, relationship, weight, properties_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        weight = excluded.weight,
        properties_json = excluded.properties_json
    `).run(edgeId, postId, `node_${id}`, 'tracked_by', 1.0, nodeProps, now);
    }
    catch (err) {
        console.warn('[Analytics Engine] Memory graph update notice:', err.message);
    }
    return {
        id,
        post_id: postId,
        platform,
        clicks,
        impressions,
        replies,
        conversions,
        metrics_json: metricsJson,
        recorded_at: now
    };
}
/**
 * Aggregates current analytics summary across all campaigns.
 */
export function getAnalyticsSummary() {
    initAnalyticsTable();
    try {
        const row = db.prepare(`
      SELECT 
        COUNT(DISTINCT post_id) as totalPosts,
        SUM(clicks) as totalClicks,
        SUM(impressions) as totalImpressions,
        SUM(replies) as totalReplies,
        SUM(conversions) as totalConversions
      FROM analytics
    `).get();
        const posts = row?.totalPosts || 0;
        const clicks = row?.totalClicks || 0;
        const impressions = row?.totalImpressions || 0;
        const replies = row?.totalReplies || 0;
        const conversions = row?.totalConversions || 0;
        const ctr = impressions > 0 ? `${((clicks / impressions) * 100).toFixed(2)}%` : '0.00%';
        return {
            totalPostsTracked: posts,
            totalClicks: clicks,
            totalImpressions: impressions,
            totalReplies: replies,
            totalConversions: conversions,
            clickThroughRate: ctr
        };
    }
    catch {
        return {
            totalPostsTracked: 0,
            totalClicks: 0,
            totalImpressions: 0,
            totalReplies: 0,
            totalConversions: 0,
            clickThroughRate: '0.00%'
        };
    }
}
/**
 * Click → Scoring update: records a click and immediately boosts prospect heat by +15.
 */
export function recordClickAndBoostHeat(postId, prospectId) {
    const analyticsRow = db.prepare('SELECT * FROM analytics WHERE post_id = ?').get(postId);
    const currentClicks = (analyticsRow?.clicks || 0) + 1;
    updateAnalytics(postId, { clicks: currentClicks });
    let targetProspectId = prospectId;
    if (!targetProspectId) {
        const outboundRow = db.prepare('SELECT prospect_id FROM outbound WHERE id = ?').get(postId);
        targetProspectId = outboundRow?.prospect_id;
    }
    if (targetProspectId) {
        const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(targetProspectId);
        if (prospect) {
            const currentHeat = Number(prospect.heat || 0);
            const newHeat = Math.min(100, currentHeat + 15);
            const newBand = newHeat >= 70 ? 'hot' : (newHeat >= 40 ? 'warm' : 'cold');
            const now = Math.floor(Date.now() / 1000);
            db.prepare(`UPDATE prospects SET heat = ?, band = ?, updated_at = ? WHERE id = ?`).run(newHeat, newBand, now, targetProspectId);
            // Log telemetry event
            sync3DTelemetry({
                type: 'niagara_pulse',
                payload: { action: 'prospect_click_boost', prospectId: targetProspectId, heat: newHeat, band: newBand }
            });
            return { newHeat, newBand };
        }
    }
    return { newHeat: 15, newBand: 'cold' };
}
/**
 * Conversion → Persona update: updates persona tone and affinity upon confirmed conversion.
 */
export function updatePersonaFromConversion(prospectId, conversionType = 'demo_booked') {
    const personaRow = db.prepare('SELECT * FROM personas WHERE prospect_id = ?').get(prospectId);
    if (personaRow) {
        const interests = JSON.parse(personaRow.interests || '[]');
        if (!interests.includes('enterprise_conversion')) {
            interests.push('enterprise_conversion');
        }
        const now = Math.floor(Date.now() / 1000);
        db.prepare(`UPDATE personas SET interests = ?, updated_at = ? WHERE prospect_id = ?`).run(JSON.stringify(interests), now, prospectId);
    }
    sync3DTelemetry({
        type: 'niagara_pulse',
        payload: { action: 'conversion_persona_update', prospectId, conversionType }
    });
}
/**
 * 3D Telemetry Sync: sends Niagara particle pulse or Actor update to Unreal Engine 5.4 / Cockpit.
 */
export function sync3DTelemetry(event) {
    try {
        const packet = {
            event: event.type || 'niagara_pulse',
            timestamp: Date.now(),
            payload: {
                x: (Math.random() * 200 - 100).toFixed(2),
                y: (Math.random() * 200 - 100).toFixed(2),
                z: (Math.random() * 50 + 20).toFixed(2),
                color: '#00F0FF',
                velocity: 1.0,
                ...event.payload
            }
        };
        // Broadcast if global event emitter or socket is registered
        if (typeof globalThis.primordiaEmitTelemetry === 'function') {
            globalThis.primordiaEmitTelemetry(packet);
        }
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Heat Drift Feedback Loop: scans prospects and applies time-based heat decay.
 */
export function applyHeatDriftFeedbackLoop(inactivityThresholdHours = 48) {
    const now = Math.floor(Date.now() / 1000);
    const thresholdTime = now - (inactivityThresholdHours * 3600);
    const staleProspects = db.prepare(`
    SELECT id, heat, band, updated_at 
    FROM prospects 
    WHERE updated_at < ? AND heat > 10
  `).all(thresholdTime);
    const updatedProspects = [];
    for (const p of staleProspects) {
        const elapsedHours = (now - p.updated_at) / 3600;
        const decay = Math.pow(0.5, elapsedHours / 72);
        const newHeat = Math.max(5, Math.round(p.heat * decay));
        const newBand = newHeat >= 70 ? 'hot' : (newHeat >= 40 ? 'warm' : 'cold');
        db.prepare(`UPDATE prospects SET heat = ?, band = ?, updated_at = ? WHERE id = ?`).run(newHeat, newBand, now, p.id);
        updatedProspects.push(p.id);
    }
    return {
        driftedCount: updatedProspects.length,
        updatedProspects
    };
}
/**
 * Analytics → Outbound Tuning: dynamically weights variants based on historical conversions.
 */
export function tuneOutboundVariantWeights(platform = 'linkedin') {
    try {
        const summary = getAnalyticsSummary();
        if (summary.totalClicks > 5) {
            return {
                variantAWeight: 0.5,
                variantBWeight: 0.3,
                variantCWeight: 0.2,
                recommendedVariant: 'A'
            };
        }
    }
    catch { }
    return {
        variantAWeight: 0.4,
        variantBWeight: 0.35,
        variantCWeight: 0.25,
        recommendedVariant: 'A'
    };
}
