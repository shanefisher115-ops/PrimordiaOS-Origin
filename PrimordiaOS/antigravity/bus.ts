// primordia/antigravity/bus.ts
import { REALM_AGENTS } from "../core/registry.js";

export async function dispatchTask(task: {
  realm: string;
  agentId: string;
  payload: any;
}) {
  const agent = REALM_AGENTS.find(
    a => a.id === task.agentId && a.realm === task.realm
  );

  if (!agent) {
    throw new Error(`Agent not found: ${task.realm}/${task.agentId}`);
  }

  return agent.run(task.payload);
}
