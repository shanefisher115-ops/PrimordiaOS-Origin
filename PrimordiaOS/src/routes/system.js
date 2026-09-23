import { Router } from 'express';
import { kernel } from '../core/kernel';
import { SystemMonitor } from '../core/systemMonitor';
export const systemRouter = Router();
systemRouter.get('/system/status', (_req, res) => {
    return res.json({
        success: true,
        kernel: kernel.status(),
        system: SystemMonitor.snapshot(),
    });
});
