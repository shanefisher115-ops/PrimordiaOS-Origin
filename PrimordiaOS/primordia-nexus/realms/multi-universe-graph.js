// realms/multi-universe-graph.ts
// PrimordiaOS Multi-Universe State Graph — full implementation
// Tracks relationships, links, and flows between realms
export class MultiUniverseGraph {
    links;
    constructor() {
        this.links = [];
    }
    link(from, to, type, metadata) {
        this.links.push({ from, to, type, metadata });
    }
    getLinks() {
        return this.links;
    }
    getLinksForRealm(id) {
        return this.links.filter(l => l.from === id || l.to === id);
    }
}
export const multiUniverseGraph = new MultiUniverseGraph();
