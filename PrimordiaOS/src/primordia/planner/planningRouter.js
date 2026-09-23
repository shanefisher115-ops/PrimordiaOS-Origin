import { Router } from 'express';
import { GlobalPlanner } from './globalPlanner';
import { PlanningMemory } from './planningMemory';
export const planningRouter = Router();
planningRouter.post('/planner/plan', async (req, res) => {
    const { goal } = req.body;
    const strategy = await GlobalPlanner.plan(goal);
    const saved = PlanningMemory.save(goal, strategy);
    return res.json({ success: true, plan: saved });
});
planningRouter.get('/planner/history', (_req, res) => {
    return res.json({ success: true, history: PlanningMemory.all() });
});
