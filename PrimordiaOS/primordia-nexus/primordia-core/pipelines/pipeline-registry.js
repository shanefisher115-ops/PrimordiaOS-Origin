// pipelines/pipeline-registry.ts
// PrimordiaOS Pipeline Registry — full implementation
import { eventBus } from "../shared/event-bus";
export class PipelineRegistry {
    pipelines;
    constructor() {
        this.pipelines = new Map();
    }
    register(pipeline) {
        if (this.pipelines.has(pipeline.id)) {
            throw new Error(`[PipelineRegistry] Pipeline with ID ${pipeline.id} already registered.`);
        }
        this.pipelines.set(pipeline.id, pipeline);
    }
    async startAll() {
        for (const pipeline of this.pipelines.values()) {
            await pipeline.start();
        }
    }
    async stopAll() {
        for (const pipeline of this.pipelines.values()) {
            await pipeline.stop();
        }
    }
    async runPipeline(id, input) {
        const pipeline = this.pipelines.get(id);
        if (!pipeline) {
            throw new Error(`[PipelineRegistry] Pipeline "${id}" not found.`);
        }
        const result = await pipeline.process(input);
        eventBus.emit("pipeline.completed", {
            pipelineId: id,
            input,
            result,
            ts: Date.now()
        }, id);
        return result;
    }
    getPipeline(id) {
        return this.pipelines.get(id);
    }
}
export const pipelineRegistry = new PipelineRegistry();
