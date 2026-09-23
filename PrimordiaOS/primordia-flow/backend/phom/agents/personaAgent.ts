/**
 * ==============================================================================
 * ⭐ LAYER 8: AGENT 3 — PERSONA AGENT
 * Node module that analyzes prospect context, tone, and interests to synthesize
 * a psychological and behavioral persona.
 * ==============================================================================
 */

import { ExtractedProspect, NormalizedSignal, SynthesizedPersona } from '../types';
import { synthesizePersona } from '../layer3_persona';
import { PhomRealMemoryGraph } from '../layer7_memory_graph';

export interface PersonaAgentOutput {
  prospectId: string;
  persona: SynthesizedPersona;
}

/**
 * Runs the Persona Agent to extract tone and interests, storing in SQLite.
 */
export async function run(
  prospect: ExtractedProspect & { id?: string },
  signal?: NormalizedSignal
): Promise<PersonaAgentOutput> {
  const persona = synthesizePersona(prospect, signal);

  // Ensure persona is linked to prospect in memory graph
  if (prospect.id) {
    persona.prospectId = prospect.id;
    PhomRealMemoryGraph.upsertPersona(persona);

    // Create Persona Agent Node & Edges in Memory Graph
    PhomRealMemoryGraph.addNode('agent_persona_agent', 'Agent', 'Persona Agent', {
      role: 'Persona Agent',
      realm: 'Realm of Cognitive Synthesis',
      frequency: '741 Hz'
    });
    PhomRealMemoryGraph.addEdge('agent_persona_agent', persona.id || `pers_${prospect.id}`, 'synthesized_persona', 1.0, {
      tone: persona.tone,
      platform: persona.preferredPlatform
    });
    PhomRealMemoryGraph.addEdge(prospect.id, persona.id || `pers_${prospect.id}`, 'has_persona', 1.0);
  }

  return {
    prospectId: prospect.id || 'unassigned',
    persona
  };
}

export const personaAgent = { run };
export default personaAgent;
