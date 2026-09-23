// state/temporalEventStore.ts

import { TemporalEvent } from "../core/types";

class TemporalEventStore {
  private events: TemporalEvent[] = [];

  record(event: TemporalEvent) {
    this.events.push(event);
  }

  getEventsWithin(ms: number): TemporalEvent[] {
    const cutoff = Date.now() - ms;
    return this.events.filter((e) => e.timestamp >= cutoff);
  }
}

export const temporalEventStore = new TemporalEventStore();
