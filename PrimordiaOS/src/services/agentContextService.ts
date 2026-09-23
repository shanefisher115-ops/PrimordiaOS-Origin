export const AgentContextService = {
  extract(req: any) {
    return {
      agentId: req.agentContext?.agentId || 'unknown-agent',
      swarmId: req.agentContext?.swarmId || 'default-swarm',
    };
  },
};
