import { TaskGraph } from "../graph/graph";
import { AgentRuntime } from "./agent-runtime";
import { TaskScheduler, ScheduledTask } from "./task-scheduler";
import { AgentExecutionResult } from "../agents/agent-types";

export interface RuntimeOrchestratorContext {
  graph: TaskGraph;
  runtime: AgentRuntime;
  scheduler: TaskScheduler;
}

export interface RuntimeOrchestrator {
  context: RuntimeOrchestratorContext;
  start(): Promise<AgentExecutionResult[]>;
}

export const createRuntimeOrchestrator = (
  context: RuntimeOrchestratorContext,
): RuntimeOrchestrator => ({
  context,

  async start(): Promise<AgentExecutionResult[]> {
    const { graph, runtime, scheduler } = this.context;

    // Enqueue all tasks initially (later you’ll respect dependencies)
    graph.tasks.forEach(task => scheduler.enqueue(task));

    const results: AgentExecutionResult[] = [];
    let scheduled: ScheduledTask | undefined;

    while ((scheduled = scheduler.dequeue())) {
      const execResult = await runtime.runTask(scheduled.task);
      results.push(execResult);
    }

    return results;
  },
});
