export function agentContext(req, _res, next) {
    req.agentContext = {
        agentId: req.headers['x-agent-id'] || 'unknown-agent',
        swarmId: req.headers['x-swarm-id'] || 'default-swarm',
    };
    next();
}
