import { Router } from 'express';
import { visionCore } from '../vision/visionCore';
import { SemanticMemory } from '../vision/semanticMemory';
import { AiScenePlanner } from '../vision/aiScenePlanner';

export const visionRouter = Router();

visionRouter.post('/vision/process', async (req, res) => {
  const { input } = req.body || {};
  if (!input) {
    return res.status(400).json({ success: false, error: 'input is required' });
  }

  const result = await visionCore.processText(input);
  return res.json({ success: true, result });
});

visionRouter.get('/vision/memory', (_req, res) => {
  return res.json({ success: true, memory: SemanticMemory.all() });
});

visionRouter.post('/vision/scene', async (req, res) => {
  const { input } = req.body || {};
  if (!input) {
    return res.status(400).json({ success: false, error: 'input is required' });
  }

  const plan = await AiScenePlanner.plan(input);
  return res.json({ success: true, plan });
});
