/**
 * ==============================================================================
 * 🌐 PRIMORDIA ALERT LATTICE ORCHESTRATOR
 * Centralized high-intent signal fan-out orchestrator.
 * Routes every opportunity, failure, threat, or request across 6 independent realms:
 * Phone (ntfy), Desktop, Email, Cockpit HUD, Unreal Engine 5.8, and CLI stream.
 * ==============================================================================
 */
import crypto from 'crypto';
import { db, checkpointWal } from '../db';
import { NtfyPhoneChannel } from './channels/ntfy';
import { DesktopNotificationChannel } from './channels/desktop';
import { EmailNotificationChannel } from './channels/email';
import { CockpitHudChannel } from './channels/hud';
import { UnrealEngineChannel } from './channels/unreal';
import { CliStreamChannel } from './channels/cli';
export class AlertLatticeOrchestrator {
    static config = {
        channelEnabled: {
            phone: true,
            desktop: true,
            email: true,
            hud: true,
            unreal: true,
            cli: true
        },
        minScorePerChannel: {
            phone: 70,
            desktop: 70,
            email: 50,
            hud: 0,
            unreal: 85,
            cli: 40
        },
        quietHours: {
            enabled: false,
            start: '22:00',
            end: '07:00',
            overrideScore: 90
        },
        phoneWebhookUrl: process.env.FLOW_MOBILE_PUSH_URL || 'https://ntfy.sh/primordia_flow_shane',
        alertRecipientEmail: process.env.ALERT_RECIPIENT_EMAIL || 'shane@primordialorigin.com'
    };
    static initialized = false;
    static init(broadcastFn) {
        if (this.initialized)
            return;
        try {
            db.exec(`
        CREATE TABLE IF NOT EXISTS alert_config (
          id TEXT PRIMARY KEY DEFAULT 'primary',
          config_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
            // Load saved config if present
            const saved = db.prepare('SELECT config_json FROM alert_config WHERE id = ?').get('primary');
            if (saved && saved.config_json) {
                try {
                    const parsed = JSON.parse(saved.config_json);
                    this.config = { ...this.config, ...parsed };
                }
                catch { }
            }
            CockpitHudChannel.init();
            if (broadcastFn) {
                this.setBroadcast(broadcastFn);
            }
            this.initialized = true;
            console.log('[AlertLattice] Sovereign 6-Rail Alert Lattice Initialized.');
        }
        catch (err) {
            console.error('[AlertLattice Init Error]:', err.message);
        }
    }
    static setBroadcast(fn) {
        CockpitHudChannel.setBroadcast(fn);
        DesktopNotificationChannel.setBroadcast(fn);
    }
    static getConfig() {
        return { ...this.config };
    }
    static updateConfig(partial) {
        this.init();
        this.config = {
            ...this.config,
            ...partial,
            channelEnabled: { ...this.config.channelEnabled, ...(partial.channelEnabled || {}) },
            minScorePerChannel: { ...this.config.minScorePerChannel, ...(partial.minScorePerChannel || {}) },
            quietHours: { ...this.config.quietHours, ...(partial.quietHours || {}) }
        };
        try {
            db.prepare(`
        INSERT INTO alert_config (id, config_json, updated_at)
        VALUES ('primary', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          config_json = excluded.config_json,
          updated_at = excluded.updated_at
      `).run(JSON.stringify(this.config), Math.floor(Date.now() / 1000));
            checkpointWal();
        }
        catch { }
        return this.getConfig();
    }
    /**
     * Evaluates if current time falls within configured quiet hours
     */
    static isQuietHoursActive() {
        if (!this.config.quietHours.enabled)
            return false;
        try {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const [startH, startM] = this.config.quietHours.start.split(':').map(Number);
            const [endH, endM] = this.config.quietHours.end.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            if (startMinutes <= endMinutes) {
                return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
            }
            else {
                // Crosses midnight (e.g. 22:00 to 07:00)
                return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
            }
        }
        catch {
            return false;
        }
    }
    /**
     * Computes urgency profile
     */
    static classifyUrgency(signal, context) {
        if (context?.urgency)
            return context.urgency;
        if (signal.type === 'failure' || signal.type === 'threat' || signal.score >= 90) {
            return 'critical';
        }
        if (signal.score >= 70 || signal.type === 'opportunity') {
            return 'high';
        }
        if (signal.score >= 50) {
            return 'medium';
        }
        return 'low';
    }
    /**
     * Resolves target channels based on signal, urgency, score, and quiet hours
     */
    static resolveChannels(signal, urgency, context) {
        const isQuiet = this.isQuietHoursActive() && !context?.overrideQuietHours;
        const canOverrideQuiet = signal.score >= this.config.quietHours.overrideScore || urgency === 'critical';
        const candidates = ['phone', 'desktop', 'email', 'hud', 'unreal', 'cli'];
        const activeChannels = [];
        for (const ch of candidates) {
            // 1. Is channel globally enabled?
            if (!this.config.channelEnabled[ch])
                continue;
            // 2. Explicit preference override
            if (context?.channelPreferences && context.channelPreferences[ch] === false) {
                continue;
            }
            // 3. Minimum score threshold check
            const minScore = this.config.minScorePerChannel[ch] ?? 0;
            if (signal.score < minScore && urgency !== 'critical') {
                continue;
            }
            // 4. Quiet hours suppression for intrusive channels
            if (isQuiet && !canOverrideQuiet && (ch === 'phone' || ch === 'desktop')) {
                continue;
            }
            activeChannels.push(ch);
        }
        return activeChannels;
    }
    /**
     * Master Dispatch Function:
     * Fans out any high-intent signal across all resolved channel adapters concurrently.
     */
    static async dispatch(signal, context) {
        this.init();
        const alertId = `alt_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
        const urgency = this.classifyUrgency(signal, context);
        const targetChannels = this.resolveChannels(signal, urgency, context);
        const results = {};
        const channelsDelivered = [];
        // Concurrently fan out across all target channels
        const promises = targetChannels.map(async (ch) => {
            let result;
            switch (ch) {
                case 'phone':
                    result = await NtfyPhoneChannel.send(signal, urgency, this.config.phoneWebhookUrl);
                    break;
                case 'desktop':
                    result = await DesktopNotificationChannel.send(signal, urgency);
                    break;
                case 'email':
                    result = await EmailNotificationChannel.send(signal, urgency, this.config.alertRecipientEmail);
                    break;
                case 'hud':
                    result = await CockpitHudChannel.send(signal, urgency, targetChannels);
                    break;
                case 'unreal':
                    result = await UnrealEngineChannel.send(signal, urgency);
                    break;
                case 'cli':
                    result = await CliStreamChannel.send(signal, urgency);
                    break;
                default:
                    result = { channel: ch, success: false, deliveredAt: Date.now(), error: 'Unknown channel' };
            }
            results[ch] = result;
            if (result.success) {
                channelsDelivered.push(ch);
            }
        });
        await Promise.allSettled(promises);
        // Persist dispatch record in SQLite alert_history
        CockpitHudChannel.persistRecord({
            id: alertId,
            signalId: signal.id,
            source: signal.source,
            score: signal.score,
            type: signal.type,
            urgency,
            title: signal.title,
            summary: signal.summary,
            url: signal.url,
            channelsAttempted: targetChannels,
            results
        });
        return {
            alertId,
            signalId: signal.id,
            urgency,
            type: signal.type,
            score: signal.score,
            title: signal.title,
            summary: signal.summary,
            url: signal.url,
            channelsAttempted: targetChannels,
            channelsDelivered,
            results,
            dispatchedAt: Date.now()
        };
    }
}
