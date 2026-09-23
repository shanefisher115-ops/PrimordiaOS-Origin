// devtools/inspector.ts
// PrimordiaOS Inspector — full implementation
// Provides runtime inspection of agents, pipelines, events, and snapshots
import { agentRegistry } from "../primordia-core/agents/agent-registry";
import { pipelineRegistry } from "../primordia-core/pipelines/pipeline-registry";
import { snapshotManager } from "../primordia-core/osmium/snapshots";
import { osmiumLedger } from "../primordia-core/osmium/osmium-ledger";
export class Inspector {
    getAgents() {
        return Array.from(agentRegistry.agents?.values() || []);
    }
    getPipelines() {
        return Array.from(pipelineRegistry.pipelines?.values() || []);
    }
    getSnapshots() {
        return snapshotManager.getSnapshots();
    }
    getLedger() {
        return osmiumLedger.getEntries();
    }
    getLatestSnapshot() {
        return snapshotManager.getLatestSnapshot();
    }
    getLatestLedgerEntry() {
        return osmiumLedger.getLastEntry();
    }
}
export const inspector = new Inspector();
