/**
 * ==============================================================================
 * 📱 PHONE RAIL — NTFY.SH PUSH ADAPTER
 * Delivers instant lock-screen alerts to user's iOS/Android device with sound.
 * ==============================================================================
 */

import { AlertSignal, AlertUrgency, ChannelResult } from '../types';

export class NtfyPhoneChannel {
  public static async send(
    signal: AlertSignal,
    urgency: AlertUrgency,
    endpointUrl: string = 'https://ntfy.sh/primordia_flow_shane'
  ): Promise<ChannelResult> {
    const start = Date.now();
    if (!endpointUrl) {
      return {
        channel: 'phone',
        success: false,
        deliveredAt: start,
        error: 'No phone push endpoint configured'
      };
    }

    try {
      const priorityMap: Record<AlertUrgency, string> = {
        critical: 'urgent',
        high: 'high',
        medium: 'default',
        low: 'low'
      };

      const tagMap: Record<string, string> = {
        failure: 'rotating_light,fire',
        threat: 'skull,warning',
        opportunity: 'zap,moneybag',
        request: 'handshake,bell',
        info: 'information_source,satellite_antenna'
      };

      const priority = priorityMap[urgency] || 'high';
      const tags = tagMap[signal.type] || 'fire,satellite_antenna';

      const headers: Record<string, string> = {
        'Title': `[${urgency.toUpperCase()}] ${signal.title.slice(0, 80)}`,
        'Priority': priority,
        'Tags': tags
      };

      if (signal.url) {
        headers['Click'] = signal.url;
        headers['Actions'] = `view, Open Signal, ${signal.url}`;
      }

      const bodyText = `${signal.summary}\n\n[Score: ${signal.score}/100 | Realm: ${signal.source}]`;

      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: bodyText,
        signal: AbortSignal.timeout(6000)
      });

      if (!res.ok) {
        throw new Error(`ntfy returned HTTP ${res.status}: ${res.statusText}`);
      }

      return {
        channel: 'phone',
        success: true,
        deliveredAt: Date.now(),
        metadata: {
          endpoint: endpointUrl,
          priority,
          tags,
          latencyMs: Date.now() - start
        }
      };
    } catch (err: any) {
      return {
        channel: 'phone',
        success: false,
        deliveredAt: Date.now(),
        error: err.message
      };
    }
  }
}
