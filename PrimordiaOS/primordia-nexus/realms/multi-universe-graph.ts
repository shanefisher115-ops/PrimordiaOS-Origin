// realms/multi-universe-graph.ts
// PrimordiaOS Multi-Universe State Graph — full implementation
// Tracks relationships, links, and flows between realms

export interface UniverseLink {
    from: string;
    to: string;
    type: string;
    metadata?: any;
}

export class MultiUniverseGraph {
    private links: UniverseLink[];

    constructor() {
        this.links = [];
    }

    link(from: string, to: string, type: string, metadata?: any) {
        this.links.push({ from, to, type, metadata });
    }

    getLinks() {
        return this.links;
    }

    getLinksForRealm(id: string) {
        return this.links.filter(l => l.from === id || l.to === id);
    }
}

export const multiUniverseGraph = new MultiUniverseGraph();
