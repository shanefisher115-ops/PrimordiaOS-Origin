export class MonetizationBrain {
    events = [];
    record(event) {
        this.events.push(event);
    }
    total() {
        return this.events.reduce((sum, e) => sum + e.amount, 0);
    }
    bySource(source) {
        return this.events.filter(e => e.source === source);
    }
    summary() {
        const map = new Map();
        for (const e of this.events) {
            map.set(e.source, (map.get(e.source) || 0) + e.amount);
        }
        return map;
    }
}
export const Monetization = new MonetizationBrain();
