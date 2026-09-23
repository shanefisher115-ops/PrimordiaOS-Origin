import { Router } from 'express';
import { AgentCore } from './agentCore';

export const agentRouter = Router();

agentRouter.get('/agents', (_req, res) => {
  return res.json({ success: true, agents: AgentCore.all() });
});

agentRouter.post('/agents/run', async (req, res) => {
  const { id, input } = req.body;
  const agent = AgentCore.get(id);

  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }

  const result = await agent.run(input);
  return res.json({ success: true, result });
});
