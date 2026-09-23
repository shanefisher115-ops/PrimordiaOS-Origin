import { Router } from 'express';
import { PipelineEngine } from './pipelineEngine';
import { PipelineRegistry } from './pipelineRegistry';
export const pipelineRouter = Router();
pipelineRouter.post('/pipeline/run', async (req, res) => {
    const { pipelineId, input } = req.body;
    const result = await PipelineEngine.run(pipelineId, input);
    return res.json({ success: true, result });
});
pipelineRouter.get('/pipeline/list', (_req, res) => {
    return res.json({ success: true, pipelines: PipelineRegistry.all() });
});
