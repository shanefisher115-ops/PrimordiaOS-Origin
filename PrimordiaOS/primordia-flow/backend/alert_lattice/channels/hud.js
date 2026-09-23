/**
 * ==============================================================================
 * 🖥️ COCKPIT HUD RAIL
 * In-cockpit HUD alert stream and ACID SQLite persistence (alert_history).
 * Feeds live alerts to the Primordia Flow cockpit at http://localhost:5174.
 * ==============================================================================
 */
import { db, checkpointWal } from '../../db';
export class CockpitHudChannel {
    static broadcastFn = null;
    static initialized = false;
    static init() {
        if (this.initialized)
            return;
        try {
            db.exec(`
        CREATE TABLE IF NOT EXISTS alert_history (
          id TEXT PRIMARY KEY,
          signal_id TEXT,
          source TEXT NOT NULL,
          score INTEGER NOT NULL,
          type TEXT NOT NULL,
          urgency TEXT NOT NULL,
          title TEXT NOT NULL,
          summary TEXT NOT NULL,
          url TEXT,
          channels_json TEXT NOT NULL,
          results_json TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_alerts_urgency ON alert_history(urgency);
        CREATE INDEX IF NOT EXISTS idx_alerts_created ON alert_history(created_at);
      `);
            this.initialized = true;
        }
        catch (err) {
            console.error('[CockpitHudChannel Init Error]:', err);
        }
    }
    static setBroadcast(fn) {
        this.broadcastFn = fn;
    }
    static async send(signal, urgency, channelsAttempted = []) {
        this.init();
        const start = Date.now();
        try {
            const hudAlert = {
                id: `alt_${Date.now()}_${signal.id.slice(-6)}`,
                signalId: signal.id,
                source: signal.source,
                score: signal.score,
                type: signal.type,
                urgency,
                title: signal.title,
                summary: signal.summary,
                url: signal.url,
                channels: channelsAttempted,
                timestamp: Date.now()
            };
            // Broadcast over WebSocket to active cockpit clients
            if (this.broadcastFn) {
                this.broadcastFn('alert:hud', hudAlert);
            }
            return {
                channel: 'hud',
                success: true,
                deliveredAt: Date.now(),
                metadata: {
                    hudAlertId: hudAlert.id,
                    broadcasted: Boolean(this.broadcastFn),
                    latencyMs: Date.now() - start
                }
            };
        }
        catch (err) {
            return {
                channel: 'hud',
                success: false,
                deliveredAt: Date.now(),
                error: err.message
            };
        }
    }
    static persistRecord(record) {
        this.init();
        try {
            db.prepare(`
        INSERT INTO alert_history (
          id, signal_id, source, score, type, urgency, title, summary, url, channels_json, results_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(record.id, record.signalId, record.source, record.score, record.type, record.urgency, record.title, record.summary, record.url || null, JSON.stringify(record.channelsAttempted), JSON.stringify(record.results), Math.floor(Date.now() / 1000));
            checkpointWal();
        }
        catch (err) {
            console.warn('[CockpitHud Persist Warning]:', err.message);
        }
    }
    static getRecentAlerts(limit = 50) {
        this.init();
        try {
            return db.prepare(`
        SELECT * FROM alert_history ORDER BY created_at DESC LIMIT ?
      `).all(limit);
        }
        catch (err) {
            return [];
        }
    }
}
