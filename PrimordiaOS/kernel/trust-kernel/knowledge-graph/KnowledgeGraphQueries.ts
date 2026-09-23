// ======================================================
// PRIMORDIAOS — KNOWLEDGE GRAPH QUERY ENGINE
// ======================================================
// Responsibilities:
// - High-level semantic queries
// - Relationship traversal
// - Agent → Task → Claim → Verification chains
// ======================================================

import { KnowledgeGraph, KGNode, KGEdge } from "./KnowledgeGraph";

export class KnowledgeGraphQueries {
    constructor(private graph: KnowledgeGraph) {}

    // ------------------------------------------------------
    // GET ALL TASKS PRODUCED BY AGENT
    // ------------------------------------------------------
    getTasksByAgent(agentId: string): KGNode[] {
        const edges = this.graph.getEdgesFrom(agentId);
        return edges
            .filter(e => e.relation === "submitted")
            .map(e => this.graph.getNode(e.to))
            .filter(Boolean) as KGNode[];
    }

    // ------------------------------------------------------
    // GET VERIFICATIONS FOR CLAIM
    // ------------------------------------------------------
    getVerificationsForClaim(claimId: string): KGNode[] {
        const edges = this.graph.getEdgesFrom(claimId);
        return edges
            .filter(e => e.relation === "verified_by")
            .map(e => this.graph.getNode(e.to))
            .filter(Boolean) as KGNode[];
    }

    // ------------------------------------------------------
    // TRACE FULL LINEAGE OF A TASK
    // ------------------------------------------------------
    traceLineage(taskId: string): KGEdge[] {
        return this.graph.getEdgesTo(taskId);
    }

    // ------------------------------------------------------
    // GET ALL CLAIMS PRODUCED BY AGENT
    // ------------------------------------------------------
    getClaimsByAgent(agentId: string): KGNode[] {
        return this.graph
            .getEdgesFrom(agentId)
            .filter(e => e.relation === "produced")
            .map(e => this.graph.getNode(e.to))
            .filter(Boolean) as KGNode[];
    }
}
