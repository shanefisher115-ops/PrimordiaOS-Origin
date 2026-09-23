export class SocialGraph {
    channels = new Map();
    register(node) {
        this.channels.set(node.id, node);
    }
    get(id) {
        return this.channels.get(id);
    }
    all() {
        return Array.from(this.channels.values());
    }
    enabled() {
        return this.all().filter(c => c.enabled);
    }
}
export const Social = new SocialGraph();
// bootstrap
Social.register({ id: "technophysical", label: "Technophysical Brand", enabled: true });
Social.register({ id: "moneyplughub", label: "MoneyPlugHub Portal", enabled: true });
Social.register({ id: "tiktok", label: "TikTok", enabled: true });
Social.register({ id: "tiktok_live", label: "TikTok Live", enabled: true });
