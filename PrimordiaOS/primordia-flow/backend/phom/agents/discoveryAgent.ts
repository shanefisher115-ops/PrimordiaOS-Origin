/**
 * ==============================================================================
 * ⭐ LAYER 8: AGENT 1 — DISCOVERY AGENT
 * Node module that ingests raw/normalized signals, extracts prospects,
 * and persists them into the SQLite database.
 * ==============================================================================
 */

import { NormalizedSignal, ExtractedProspect } from '../types';
import { extractProspect } from '../layer1_discovery';
import { PhomRealMemoryGraph } from '../layer7_memory_graph';
import crypto from 'crypto';

import { normalizeSignal } from '../layer0_inputs';

export interface DiscoveryAgentOutput {
  signal: NormalizedSignal;
  prospect: ExtractedProspect & { id: string };
  isNew: boolean;
}

/**
 * Runs the Discovery Agent on an inbound signal.
 */
export async function run(signal: NormalizedSignal | Record<string, any>, options?: { checkMx?: boolean }): Promise<DiscoveryAgentOutput> {
  const normSignal = (signal?.url && typeof signal?.timestamp === 'number')
    ? (signal as NormalizedSignal)
    : normalizeSignal(signal);

  // 1. Extract prospect from signal
  const extracted = await extractProspect(normSignal, options);

  // 2. Generate deterministic or random prospect ID
  const prospectId = extracted.email 
    ? `prosp_${crypto.createHash('sha256').update(extracted.email.toLowerCase()).digest('hex').slice(0, 10)}`
    : `prosp_${crypto.randomUUID().slice(0, 10)}`;

  // 3. Persist to SQLite
  const savedProspect = PhomRealMemoryGraph.upsertProspect({
    id: prospectId,
    email: extracted.email,
    name: extracted.name,
    domain: extracted.domain,
    heat: 0,
    band: 'cold',
    mxVerified: extracted.mxVerified,
    mxRecords: extracted.mxRecords,
    confidenceScore: extracted.confidenceScore?.score
  });

  // 4. Save signal linked to prospect
  const signalId = PhomRealMemoryGraph.insertSignal(normSignal, prospectId);
  normSignal.id = signalId;

  // 5. Create Discovery Agent Node & Edges in Memory Graph
  PhomRealMemoryGraph.addNode('agent_discovery_agent', 'Agent', 'Discovery Agent', {
    role: 'Discovery Agent',
    realm: 'Realm of Primordia Intake',
    frequency: '432 Hz'
  });
  PhomRealMemoryGraph.addEdge('agent_discovery_agent', prospectId, 'discovered_prospect', 1.0, {
    confidence: extracted.confidenceScore?.confidence || 'medium'
  });
  PhomRealMemoryGraph.addEdge('agent_discovery_agent', signalId, 'ingested_signal', 1.0);

  return {
    signal: normSignal,
    prospect: {
      id: prospectId,
      email: savedProspect.email,
      name: savedProspect.name,
      domain: savedProspect.domain,
      mxVerified: extracted.mxVerified,
      mxRecords: extracted.mxRecords,
      enrichment: extracted.enrichment,
      confidenceScore: extracted.confidenceScore
    },
    isNew: true
  };
}

export const discoveryAgent = { run };
export default discoveryAgent;
