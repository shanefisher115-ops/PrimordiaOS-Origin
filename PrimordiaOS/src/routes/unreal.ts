import { Router } from 'express';
import { simulationBridge } from '../unreal/simulationBridge';
import { simulationPlanner } from '../unreal/simulationPlanner';

export const unrealRouter = Router();

unrealRouter.post('/unreal/execute', async (req, res) => {
  const { command, payload } = req.body || {};
  if (!command) {
    return res.status(400).json({ success: false, error: 'command is required' });
  }

  const result = await simulationBridge.execute(command, payload);
  return res.json({ success: true, result });
});

unrealRouter.get('/unreal/state', (_req, res) => {
  return res.json({ success: true, state: simulationBridge.state() });
});

unrealRouter.get('/unreal/history', (_req, res) => {
  return res.json({ success: true, history: simulationBridge.history() });
});

unrealRouter.post('/unreal/plan', async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ success: false, error: 'prompt is required' });
  }

  const plan = await simulationPlanner.planFromPrompt(prompt);
  return res.json({ success: true, plan });
});
