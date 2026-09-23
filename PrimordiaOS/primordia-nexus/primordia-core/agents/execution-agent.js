// agents/execution-agent.ts
// PrimordiaOS Execution Agent — full implementation
import { eventBus } from "../shared/event-bus";
export class ExecutionAgent {
    id = "agent.execution";
    name = "ExecutionAgent";
    async start() {
        console.log("[ExecutionAgent] Started.");
    }
    async stop() {
        console.log("[ExecutionAgent] Stopped.");
    }
    async handle(event) {
        if (event.topic === "task.execute") {
            await this.executeTask(event.payload);
        }
    }
    async executeTask(payload) {
        console.log("[ExecutionAgent] Executing task:", payload);
        eventBus.emit("task.completed", {
            taskId: payload.taskId,
            result: "success",
            ts: Date.now()
        }, this.id);
    }
}
export const executionAgent = new ExecutionAgent();
