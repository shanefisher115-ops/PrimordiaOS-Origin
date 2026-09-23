// temporal/temporal-agent.ts
// PrimordiaOS Temporal Agent — full implementation
// Agents that operate on temporal streams instead of real-time events
import { TemporalStream } from "./temporal-stream";
import { eventBus } from "../primordia-core/shared/event-bus";
export class TemporalAgent {
    id;
    stream;
    constructor(id) {
        this.id = id;
        this.stream = new TemporalStream();
    }
    push(state) {
        const frame = this.stream.push(state);
        eventBus.emit(`temporal.${this.id}.frame`, frame, this.id);
    }
    rewind(steps = 1) {
        const frame = this.stream.rewind(steps);
        if (frame) {
            eventBus.emit(`temporal.${this.id}.rewind`, frame, this.id);
        }
        return frame;
    }
    fastForward(steps = 1) {
        const frame = this.stream.fastForward(steps);
        if (frame) {
            eventBus.emit(`temporal.${this.id}.fastforward`, frame, this.id);
        }
        return frame;
    }
    current() {
        return this.stream.current();
    }
    all() {
        return this.stream.all();
    }
}
export const temporalAgents = {
    vision: new TemporalAgent("vision"),
    sim: new TemporalAgent("sim"),
    cloud: new TemporalAgent("cloud")
};
