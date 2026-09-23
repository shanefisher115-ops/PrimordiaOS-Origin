/**
 * ==============================================================================
 * ⭐ LAYER 8: AGENT 4 — OUTBOUND AGENT
 * Node module that crafts targeted outbound messages with 1–3 variants.
 * ==============================================================================
 */
import { generateOutbound } from '../layer4_outbound';
import { PhomRealMemoryGraph } from '../layer7_memory_graph';
import crypto from 'crypto';
/**
 * Runs the Outbound Agent to generate message copy and stage in SQLite.
 */
export async function run(persona, prospect) {
    const outboundResult = generateOutbound(persona, prospect);
    const messageId = `out_${crypto.randomUUID().slice(0, 10)}`;
    // Store in SQLite outbound table
    PhomRealMemoryGraph.insertOutbound({
        id: messageId,
        prospectId: prospect.id,
        personaId: persona.id,
        platform: outboundResult.platform,
        text: outboundResult.text,
        variants: outboundResult.variants,
        status: 'draft'
    });
    // Create Outbound Agent Node & Edges in Memory Graph
    PhomRealMemoryGraph.addNode('agent_outbound_agent', 'Agent', 'Outbound Agent', {
        role: 'Outbound Agent',
        realm: 'Realm of Narrative Forge',
        frequency: '852 Hz'
    });
    PhomRealMemoryGraph.addEdge('agent_outbound_agent', messageId, 'generated_outbound', 1.0, {
        platform: outboundResult.platform,
        variantsCount: outboundResult.variants.length
    });
    if (prospect.id) {
        PhomRealMemoryGraph.addEdge(prospect.id, messageId, 'targeted_by_outbound', 1.0);
    }
    return {
        messageId,
        outbound: outboundResult
    };
}
export const outboundAgent = { run };
export default outboundAgent;
