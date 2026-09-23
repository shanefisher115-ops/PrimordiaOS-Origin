// ======================================================
// PRIMORDIAOS — KNOWLEDGE GRAPH ENGINE
// ======================================================
// Responsibilities:
// - Semantic graph of agents, realms, claims, tasks
// - Relationship tracking
// - Query + traversal API
// - Integration with Attribution + Ledger
// ======================================================

export interface KGNode {
    id: string;
    type: string;          // agent, realm, claim, task, event
    data: any;
}

export interface KGEdge {
    from: string;
    to: string;
    relation: string;      // "produced", "verified", "belongs_to", etc.
    timestamp: number;
}

export class KnowledgeGraph {
    private nodes: Map<string, KGNode> = new Map();
    private edges: KGEdge[] = [];

    constructor() {}

    // ------------------------------------------------------
    // ADD NODE
    // ------------------------------------------------------
    addNode(id: string, type: string, data: any) {
        this.nodes.set(id, { id, type, data });
    }

    // ------------------------------------------------------
    // ADD EDGE
    // ------------------------------------------------------
    addEdge(from: string, to: string, relation: string) {
        this.edges.push({
            from,
            to,
            relation,
            timestamp: Date.now()
        });
    }

    // ------------------------------------------------------
    // GET NODE
    // ------------------------------------------------------
    getNode(id: string): KGNode | null {
        return this.nodes.get(id) || null;
    }

    // ------------------------------------------------------
    // GET EDGES FROM NODE
    // ------------------------------------------------------
    getEdgesFrom(id: string): KGEdge[] {
        return this.edges.filter(e => e.from === id);
    }

    // ------------------------------------------------------
    // GET EDGES TO NODE
    // ------------------------------------------------------
    getEdgesTo(id: string): KGEdge[] {
        return this.edges.filter(e => e.to === id);
    }

    // ------------------------------------------------------
    // CLEAR (REPLAY MODE)
    // ------------------------------------------------------
    clear() {
        this.nodes.clear();
        this.edges = [];
    }
}
