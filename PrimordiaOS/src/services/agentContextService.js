export const AgentContextService = {
    extract(req) {
        return {
            agentId: req.agentContext?.agentId || 'unknown-agent',
            swarmId: req.agentContext?.swarmId || 'default-swarm',
        };
    },
};
