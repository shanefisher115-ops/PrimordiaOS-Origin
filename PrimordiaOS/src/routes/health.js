import { Router } from 'express';
export const healthRouter = Router();
healthRouter.get('/health', (_req, res) => {
    return res.json({
        success: true,
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'PrimordiaOS is running smoothly.',
    });
});
