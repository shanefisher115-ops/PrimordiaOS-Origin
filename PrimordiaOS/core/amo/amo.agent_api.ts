export function registerAgent(agentId: string, realm: string) {
  return {
    id: agentId,
    realm,
    status: "idle",
    lastHeartbeat: Date.now()
  };
}
