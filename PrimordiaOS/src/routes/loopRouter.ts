import { Router } from 'express';
import { loopManager } from '../loops/loopManager';
import { LoopRules } from '../loops/loopRules';
import { LoopLedger } from '../loops/loopLedger';
import { LoopAnalytics } from '../loops/loopAnalytics';
import { LoopDepth } from '../loops/loopDepth';

export const loopRouter = Router();

loopRouter.post('/loop/run', async (req, res) => {
  const context = req.body;
  const result = await loopManager.evaluateAndRun(context);
  LoopDepth.increment();
  return res.json({ success: true, result, depth: LoopDepth.get() });
});

loopRouter.get('/loop/rules', (_req, res) => {
  return res.json({ success: true, rules: LoopRules.list() });
});

loopRouter.get('/loop/ledger', (_req, res) => {
  return res.json({ success: true, ledger: LoopLedger.all() });
});

loopRouter.get('/loop/analytics', (_req, res) => {
  return res.json({ success: true, analytics: LoopAnalytics.summary() });
});

loopRouter.post('/loop/reset-depth', (_req, res) => {
  LoopDepth.reset();
  return res.json({ success: true, depth: LoopDepth.get() });
});
