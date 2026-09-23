// state/temporalEventStore.ts
class TemporalEventStore {
    events = [];
    record(event) {
        this.events.push(event);
    }
    getEventsWithin(ms) {
        const cutoff = Date.now() - ms;
        return this.events.filter((e) => e.timestamp >= cutoff);
    }
}
export const temporalEventStore = new TemporalEventStore();
