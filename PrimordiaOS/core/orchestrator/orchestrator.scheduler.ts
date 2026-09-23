import { OrchestratorState } from "./orchestrator.state";
import config from "./orchestrator.config.json";

export function scheduleTasks() {
  const pending = OrchestratorState.tasks.filter(t => t.status === "pending");

  for (const task of pending) {
    const idleAgent = Object.values(OrchestratorState.agents)
      .find(a => a.status === "idle");

    if (!idleAgent) continue;

    task.assignedTo = idleAgent.id;
    task.status = "running";

    globalThis.PRIMORDIA_TASK_BUS.push({
      type: "TASK_ASSIGNED",
      taskId: task.id,
      agentId: idleAgent.id,
      timestamp: Date.now()
    });
  }
}
