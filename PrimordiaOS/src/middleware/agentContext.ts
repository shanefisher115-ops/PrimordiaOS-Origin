import { Request, Response, NextFunction } from 'express';

export function agentContext(req: Request, _res: Response, next: NextFunction) {
  req.agentContext = {
    agentId: req.headers['x-agent-id'] || 'unknown-agent',
    swarmId: req.headers['x-swarm-id'] || 'default-swarm',
  };
  next();
}
