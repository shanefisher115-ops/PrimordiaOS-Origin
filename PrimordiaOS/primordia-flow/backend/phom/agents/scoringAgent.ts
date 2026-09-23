/**
 * ==============================================================================
 * ⭐ LAYER 8: AGENT 2 — SCORING AGENT
 * Node module that evaluates behavioral intent and scores prospects.
 * ==============================================================================
 */

import { ExtractedProspect, NormalizedSignal, ProspectScore } from '../types';
import { scoreProspect } from '../layer2_scoring';
import { PhomRealMemoryGraph } from '../layer7_memory_graph';

export interface ScoringAgentOutput {
  prospectId: string;
  score: ProspectScore;
}

/**
 * Runs the Scoring Agent on a prospect and corresponding signal.
 */
export async function run(
  prospect: ExtractedProspect & { id?: string },
  signal: NormalizedSignal
): Promise<ScoringAgentOutput> {
  const score = scoreProspect(prospect, signal);

  // Update prospect heat and band in SQLite
  if (prospect.id) {
    PhomRealMemoryGraph.upsertProspect({
      id: prospect.id,
      email: prospect.email,
      name: prospect.name,
      domain: prospect.domain,
      heat: score.heat,
      band: score.band,
      mxVerified: prospect.mxVerified,
      mxRecords: prospect.mxRecords,
      confidenceScore: prospect.confidenceScore?.score
    });

    // Create Scoring Agent Node & Edge in Memory Graph
    PhomRealMemoryGraph.addNode('agent_scoring_agent', 'Agent', 'Scoring Agent', {
      role: 'Scoring Agent',
      realm: 'Realm of Orbit Dynamics',
      frequency: '639 Hz'
    });
    PhomRealMemoryGraph.addEdge('agent_scoring_agent', prospect.id, 'scored_prospect', 1.0, {
      heat: score.heat,
      band: score.band,
      intentLevel: score.intentLevel || 'medium'
    });
  }

  return {
    prospectId: prospect.id || 'unassigned',
    score
  };
}

export const scoringAgent = { run };
export default scoringAgent;
