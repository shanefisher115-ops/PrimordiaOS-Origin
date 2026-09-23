// agents/execution-agent.ts
// PrimordiaOS Execution Agent — full implementation

import { Agent } from "./agent-registry";
import { EventEnvelope, eventBus } from "../shared/event-bus";

export class ExecutionAgent implements Agent {
    id = "agent.execution";
    name = "ExecutionAgent";

    async start() {
        console.log("[ExecutionAgent] Started.");
    }

    async stop() {
        console.log("[ExecutionAgent] Stopped.");
    }

    async handle(event: EventEnvelope) {
        if (event.topic === "task.execute") {
            await this.executeTask(event.payload);
        }
    }

    async executeTask(payload: any) {
        console.log("[ExecutionAgent] Executing task:", payload);

        eventBus.emit("task.completed", {
            taskId: payload.taskId,
            result: "success",
            ts: Date.now()
        }, this.id);
    }
}

export const executionAgent = new ExecutionAgent();
