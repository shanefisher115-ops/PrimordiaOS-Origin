import { TaskGraph } from "./graph";
import { Task } from "./task";

export interface ResolvedGraph {
  graph: TaskGraph;
  orderedTasks: Task[];
}

export const resolveTaskDependencies = (graph: TaskGraph): ResolvedGraph => {
  const tasksById = new Map<string, Task>();
  graph.tasks.forEach(t => tasksById.set(t.id, t));

  const visited = new Set<string>();
  const temp = new Set<string>();
  const ordered: Task[] = [];

  const visit = (taskId: string) => {
    if (visited.has(taskId)) return;
    if (temp.has(taskId)) {
      throw new Error(`Cycle detected in task graph at task: ${taskId}`);
    }

    temp.add(taskId);
    const task = tasksById.get(taskId);
    if (!task) {
      throw new Error(`Task not found in graph: ${taskId}`);
    }

    (task.dependencies ?? []).forEach(depId => visit(depId));

    temp.delete(taskId);
    visited.add(taskId);
    ordered.push(task);
  };

  graph.tasks.forEach(task => visit(task.id));

  return {
    graph,
    orderedTasks: ordered,
  };
};
