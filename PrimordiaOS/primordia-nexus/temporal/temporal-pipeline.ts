// temporal/temporal-pipeline.ts
// PrimordiaOS Temporal Pipeline — full implementation
// Pipelines that operate across multiple frames or timelines

import { TemporalStream } from "./temporal-stream";
import { eventBus } from "../primordia-core/shared/event-bus";

export class TemporalPipeline {
    id: string;
    private stream: TemporalStream<any>;

    constructor(id: string) {
        this.id = id;
        this.stream = new TemporalStream();
    }

    process(state: any) {
        const frame = this.stream.push(state);

        eventBus.emit(`temporal.pipeline.${this.id}.processed`, {
            pipelineId: this.id,
            frame
        }, this.id);

        return frame;
    }

    rewind(steps = 1) {
        return this.stream.rewind(steps);
    }

    fastForward(steps = 1) {
        return this.stream.fastForward(steps);
    }

    current() {
        return this.stream.current();
    }

    all() {
        return this.stream.all();
    }
}

export const temporalPipelines = {
    antigravity: new TemporalPipeline("antigravity"),
    perception: new TemporalPipeline("perception"),
    simulation: new TemporalPipeline("simulation")
};
