// autonomy/agent-executor.ts

import { updateGlobalState, RealmState } from "./global-state";

export type AgentTask = {
  id: string;
  agentId: string;
  kind: string;
  payload: any;
};

export type AgentResult = {
  taskId: string;
  agentId: string;
  success: boolean;
  error?: string;
};

export function executeAgentTask(task: AgentTask): AgentResult {
  // Placeholder execution; you’ll wire real modules here.
  let success = true;
  let error: string | undefined;

  try {
    // TODO: route to real worker / swarm / service.
    console.log("[AGENT EXEC]", task);
  } catch (e: any) {
    success = false;
    error = e?.message || "Unknown error";
  }

  updateGlobalState({
    agents: {
      active: success ? 1 : 0,
      lastTask: task.id,
    },
  });

  return {
    taskId: task.id,
    agentId: task.agentId,
    success,
    error,
  };
}
