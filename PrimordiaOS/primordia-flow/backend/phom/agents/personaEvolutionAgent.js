/**
 * ==============================================================================
 * ⭐ LAYER 8: AGENT 10 — PERSONA EVOLUTION AGENT
 * Dynamically updates prospect cognitive models based on downstream conversions,
 * click interactions, and channel responsiveness.
 * ==============================================================================
 */
import { PhomRealMemoryGraph } from '../layer7_memory_graph';
import { db } from '../../db';
export async function run(input) {
    const startTime = Date.now();
    PhomRealMemoryGraph.initTables();
    // 1. Ensure Persona Evolution Agent node exists
    PhomRealMemoryGraph.addNode('agent_persona_evolution_agent', 'Agent', 'Persona Evolution Agent', {
        role: 'Persona Evolution Agent',
        realm: 'Realm of Adaptive Synthesis',
        frequency: '741 Hz'
    });
    const personaRow = db.prepare('SELECT * FROM personas WHERE prospect_id = ?').get(input.prospectId);
    if (!personaRow) {
        return {
            prospectId: input.prospectId,
            personaId: 'unassigned',
            priorTone: 'technical',
            evolvedTone: 'technical',
            addedInterests: [],
            updatedPreferredPlatform: 'LinkedIn',
            success: false,
            durationMs: Date.now() - startTime
        };
    }
    const priorTone = personaRow.tone;
    let evolvedTone = priorTone;
    const currentInterests = JSON.parse(personaRow.interests || '[]');
    const addedInterests = [];
    let updatedPlatform = personaRow.preferred_platform;
    // Evolve tone based on event
    if (input.eventType === 'conversion') {
        evolvedTone = 'executive';
        if (!currentInterests.includes('enterprise_adoption')) {
            currentInterests.push('enterprise_adoption');
            addedInterests.push('enterprise_adoption');
        }
    }
    else if (input.eventType === 'click') {
        if (evolvedTone === 'skeptical')
            evolvedTone = 'technical';
        if (!currentInterests.includes('benchmarks')) {
            currentInterests.push('benchmarks');
            addedInterests.push('benchmarks');
        }
    }
    else if (input.eventType === 'reply') {
        if (input.eventData?.platform) {
            updatedPlatform = input.eventData.platform;
        }
    }
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
    UPDATE personas 
    SET tone = ?, interests = ?, preferred_platform = ?, updated_at = ?
    WHERE id = ?
  `).run(evolvedTone, JSON.stringify(currentInterests), updatedPlatform, now, personaRow.id);
    // Link edge in memory graph
    PhomRealMemoryGraph.addEdge('agent_persona_evolution_agent', personaRow.id, 'evolved_persona', 1.0, {
        eventType: input.eventType,
        priorTone,
        evolvedTone
    });
    const durationMs = Date.now() - startTime;
    return {
        prospectId: input.prospectId,
        personaId: personaRow.id,
        priorTone,
        evolvedTone,
        addedInterests,
        updatedPreferredPlatform: updatedPlatform,
        success: true,
        durationMs
    };
}
export const personaEvolutionAgent = { run };
export default personaEvolutionAgent;
