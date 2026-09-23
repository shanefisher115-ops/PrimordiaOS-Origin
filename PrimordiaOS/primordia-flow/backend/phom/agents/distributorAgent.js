/**
 * ==============================================================================
 * ⭐ LAYER 8: AGENT 5 — DISTRIBUTOR AGENT
 * Node module that executes multi-channel posting via X, LinkedIn, Reddit,
 * or custom Webhooks.
 * ==============================================================================
 */
import { distribute } from '../layer5_distributor';
import { PhomRealMemoryGraph } from '../layer7_memory_graph';
import { db } from '../../db';
/**
 * Runs the Distributor Agent to post content to target platform rails.
 */
export async function run(outbound) {
    PhomRealMemoryGraph.initTables();
    const result = await distribute(outbound);
    // Update outbound status in SQLite
    if (outbound.id) {
        const now = Math.floor(Date.now() / 1000);
        try {
            db.prepare(`
        UPDATE outbound 
        SET status = ?, sent_at = ?
        WHERE id = ?
      `).run(result.status, now, outbound.id);
        }
        catch (err) {
            console.warn('[Distributor Agent] DB update notice:', err.message);
        }
    }
    // Create Distributor Agent Node & Edges in Memory Graph
    PhomRealMemoryGraph.addNode('agent_distributor_agent', 'Agent', 'Distributor Agent', {
        role: 'Distributor Agent',
        realm: 'Realm of Viral Cascade',
        frequency: '963 Hz'
    });
    PhomRealMemoryGraph.addEdge('agent_distributor_agent', result.postId, 'distributed_post', 1.0, {
        platform: result.platform,
        status: result.status,
        url: result.url,
        trackingUrl: result.trackingUrl
    });
    if (outbound.id) {
        PhomRealMemoryGraph.addEdge(outbound.id, result.postId, 'broadcasted_as', 1.0);
        if (result.trackingUrl) {
            PhomRealMemoryGraph.addAnalyticsNode(`trk_${result.postId}`, {
                platform: result.platform,
                clicks: 0,
                impressions: 0
            });
            PhomRealMemoryGraph.addAnalyticsEdge(outbound.id, `trk_${result.postId}`, 'tracked_by_analytics');
        }
    }
    return {
        result,
        outboundId: outbound.id
    };
}
export const distributorAgent = { run };
export default distributorAgent;
