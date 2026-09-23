// pipelines/pipeline-registry.ts
// PrimordiaOS Pipeline Registry — full implementation

import { eventBus } from "../shared/event-bus";

export interface Pipeline {
    id: string;
    name: string;
    start(): Promise<void>;
    stop(): Promise<void>;
    process(input: any): Promise<any>;
}

export class PipelineRegistry {
    private pipelines: Map<string, Pipeline>;

    constructor() {
        this.pipelines = new Map();
    }

    register(pipeline: Pipeline) {
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

    async runPipeline(id: string, input: any) {
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

    getPipeline(id: string): Pipeline | undefined {
        return this.pipelines.get(id);
    }
}

export const pipelineRegistry = new PipelineRegistry();
