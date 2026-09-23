/**
 * ==============================================================================
 * 💻 DESKTOP NOTIFICATION RAIL
 * Emits browser Web Notifications via WebSocket and native Windows toast events.
 * ==============================================================================
 */

import { AlertSignal, AlertUrgency, ChannelResult } from '../types';

export class DesktopNotificationChannel {
  private static broadcastFn: ((event: string, data: any) => void) | null = null;

  public static setBroadcast(fn: (event: string, data: any) => void) {
    this.broadcastFn = fn;
  }

  public static async send(
    signal: AlertSignal,
    urgency: AlertUrgency
  ): Promise<ChannelResult> {
    const start = Date.now();
    try {
      const payload = {
        id: signal.id,
        title: `[Primordia ${urgency.toUpperCase()}] ${signal.title}`,
        body: `${signal.summary.slice(0, 160)} (Score: ${signal.score}/100)`,
        urgency,
        type: signal.type,
        source: signal.source,
        url: signal.url,
        timestamp: Date.now(),
        sound: urgency === 'critical' ? 'alert_critical.wav' : 'alert_standard.wav'
      };

      if (this.broadcastFn) {
        this.broadcastFn('alert:desktop', payload);
      }

      return {
        channel: 'desktop',
        success: true,
        deliveredAt: Date.now(),
        metadata: {
          broadcasted: Boolean(this.broadcastFn),
          latencyMs: Date.now() - start
        }
      };
    } catch (err: any) {
      return {
        channel: 'desktop',
        success: false,
        deliveredAt: Date.now(),
        error: err.message
      };
    }
  }
}
