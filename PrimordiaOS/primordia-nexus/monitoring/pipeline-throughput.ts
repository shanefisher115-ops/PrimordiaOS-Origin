// monitoring/pipeline-throughput.ts
// PrimordiaOS Pipeline Throughput Monitor — full implementation
// Measures pipeline processing time and throughput

import { eventBus, EventEnvelope } from "../primordia-core/shared/event-bus";
import { metrics } from "./metrics";

export class PipelineThroughput {
    start() {
        eventBus.subscribe("pipeline.completed", (event: EventEnvelope) => {
            const { pipelineId, input, result, ts } = event.payload;

            const duration = ts - event.timestamp;
            metrics.recordTiming(`pipeline.${pipelineId}.duration`, duration);
            metrics.increment(`pipeline.${pipelineId}.completed`);

            console.log(`[PipelineThroughput] ${pipelineId} completed in ${duration}ms`);
        });

        console.log("[PipelineThroughput] Monitoring pipeline throughput.");
    }
}

export const pipelineThroughput = new PipelineThroughput();
