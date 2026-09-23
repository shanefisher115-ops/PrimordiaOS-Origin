import { Router } from 'express';
import { SystemHealth } from './systemHealth';
import { DistributedMemory } from './distributedMemory';
import { RealmCoordinator } from './realmCoordinator';

export const orchestratorRouter = Router();

orchestratorRouter.get('/orchestrator/health', (_req, res) => {
  return res.json({ success: true, health: SystemHealth.check() });
});

orchestratorRouter.get('/orchestrator/memory', (_req, res) => {
  return res.json({ success: true, memory: DistributedMemory.dump() });
});

orchestratorRouter.get('/orchestrator/realms', (_req, res) => {
  return res.json({ success: true, realms: RealmCoordinator.list() });
});
