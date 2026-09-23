export async function dispatchTask(agentId: string, task: any) {
  const agent = OrchestratorState.agents[agentId];
  if (!agent) return;

  const realmAPI = globalThis.PRIMORDIA_REALM_API[agent.realm];

  await realmAPI.sendTask(agentId, task);
}
