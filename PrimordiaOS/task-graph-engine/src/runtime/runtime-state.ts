import { Task } from "../graph/task";
import { AgentExecutionResult } from "../agents/agent-types";

export type TaskRuntimeStatus =
  | "pending"
  | "scheduled"
  | "running"
  | "completed"
  | "failed";

export interface TaskRuntimeState {
  task: Task;
  status: TaskRuntimeStatus;
  lastResult?: AgentExecutionResult;
  errorMessage?: string;
}

export interface RuntimeState {
  tasks: Map<string, TaskRuntimeState>;
}

export const createRuntimeState = (): RuntimeState => ({
  tasks: new Map<string, TaskRuntimeState>(),
});

export const initRuntimeStateForTasks = (
  state: RuntimeState,
  tasks: Task[],
): void => {
  tasks.forEach(task => {
    state.tasks.set(task.id, {
      task,
      status: "pending",
    });
  });
};

export const updateTaskRuntimeState = (
  state: RuntimeState,
  taskId: string,
  status: TaskRuntimeStatus,
  result?: AgentExecutionResult,
  errorMessage?: string,
): void => {
  const existing = state.tasks.get(taskId);
  if (!existing) return;

  existing.status = status;
  existing.lastResult = result;
  existing.errorMessage = errorMessage;
};
