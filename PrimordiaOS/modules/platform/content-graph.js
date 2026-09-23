export class ContentGraph {
    nodes = new Map();
    add(node) {
        this.nodes.set(node.id, node);
    }
    get(id) {
        return this.nodes.get(id);
    }
    all() {
        return Array.from(this.nodes.values());
    }
    byChannel(channel) {
        return this.all().filter(n => n.channels.includes(channel));
    }
}
export const Content = new ContentGraph();
