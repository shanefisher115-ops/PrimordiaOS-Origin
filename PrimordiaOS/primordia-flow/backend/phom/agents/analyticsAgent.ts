/**
 * ==============================================================================
 * ⭐ LAYER 8: AGENT 6 — ANALYTICS AGENT
 * Node module that updates performance metrics, click tracking, and feedback
 * loops in SQLite and the Memory Graph.
 * ==============================================================================
 */

import { AnalyticsMetrics, StoredAnalytics } from '../types';
import { updateAnalytics, recordClickAndBoostHeat, updatePersonaFromConversion } from '../layer6_analytics';
import { PhomRealMemoryGraph } from '../layer7_memory_graph';

export interface AnalyticsAgentOutput {
  postId: string;
  analytics: StoredAnalytics;
}

/**
 * Runs the Analytics Agent to record interaction feedback.
 */
export async function run(
  postId: string,
  metrics: AnalyticsMetrics,
  prospectId?: string
): Promise<AnalyticsAgentOutput> {
  const analytics = updateAnalytics(postId, metrics);

  // Wire feedback loops if conversions or prospect info present
  if (prospectId && (metrics.conversions || 0) > 0) {
    try {
      updatePersonaFromConversion(prospectId, 'agent_conversion');
    } catch (e) {
      console.warn('[Analytics Agent] Persona update notice:', e);
    }
  }

  // Create Analytics Agent Node & Edges in Memory Graph
  PhomRealMemoryGraph.addNode('agent_analytics_agent', 'Agent', 'Analytics Agent', {
    role: 'Analytics Agent',
    realm: 'Realm of Telemetry Core',
    frequency: '741 Hz'
  });
  PhomRealMemoryGraph.addEdge('agent_analytics_agent', `node_${analytics.id}`, 'tracked_analytics', 1.0, {
    clicks: analytics.clicks,
    impressions: analytics.impressions
  });
  PhomRealMemoryGraph.addEdge(`node_${analytics.id}`, postId, 'monitored_post', 1.0);

  return {
    postId,
    analytics
  };
}

export const analyticsAgent = { run };
export default analyticsAgent;
