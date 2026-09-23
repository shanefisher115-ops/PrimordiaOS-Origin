/**
 * ==============================================================================
 * 🌐 PRIMORDIA ALERT LATTICE — CORE TYPE DEFINITIONS
 * High-intent signal fan-out architecture across 6 independent realms:
 * Phone (ntfy), Desktop, Email, Cockpit HUD, Unreal Engine 5.8, and CLI.
 * ==============================================================================
 */

export type AlertType = 'opportunity' | 'failure' | 'threat' | 'request' | 'info';

export type AlertUrgency = 'critical' | 'high' | 'medium' | 'low';

export type AlertChannel = 'phone' | 'desktop' | 'email' | 'hud' | 'unreal' | 'cli';

export interface AlertSignal {
  id: string;
  source: string;
  score: number;
  type: AlertType;
  title: string;
  summary: string;
  url?: string;
  payload?: Record<string, any>;
  createdAt: number;
}

export interface AlertContext {
  realm?: string;
  urgency?: AlertUrgency;
  channelPreferences?: Partial<Record<AlertChannel, boolean>>;
  overrideQuietHours?: boolean;
  metadata?: Record<string, any>;
}

export interface ChannelResult {
  channel: AlertChannel;
  success: boolean;
  deliveredAt: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AlertDispatchResult {
  alertId: string;
  signalId: string;
  urgency: AlertUrgency;
  type: AlertType;
  score: number;
  title: string;
  summary: string;
  url?: string;
  channelsAttempted: AlertChannel[];
  channelsDelivered: AlertChannel[];
  results: Partial<Record<AlertChannel, ChannelResult>>;
  dispatchedAt: number;
}

export interface LatticeConfig {
  channelEnabled: Record<AlertChannel, boolean>;
  minScorePerChannel: Record<AlertChannel, number>;
  quietHours: {
    enabled: boolean;
    start: string; // e.g. "22:00"
    end: string;   // e.g. "07:00"
    overrideScore: number; // e.g. 90
  };
  phoneWebhookUrl: string;
  alertRecipientEmail: string;
}

export interface AlertRecord {
  id: string;
  signal_id: string;
  source: string;
  score: number;
  type: string;
  urgency: string;
  title: string;
  summary: string;
  url: string | null;
  channels_json: string;
  results_json: string;
  created_at: number;
}
