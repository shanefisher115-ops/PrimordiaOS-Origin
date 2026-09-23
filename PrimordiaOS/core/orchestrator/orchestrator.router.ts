export function routeMessage(fromAgent: string, toAgent: string, payload: any) {
  const target = OrchestratorState.agents[toAgent];
  if (!target) return;

  const realmAPI = globalThis.PRIMORDIA_REALM_API[target.realm];

  realmAPI.sendMessage(toAgent, {
    from: fromAgent,
    payload
  });
}
