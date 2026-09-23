import { Request, Response, NextFunction } from 'express';
import { Logger } from '../core/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  Logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ success: false, error: 'Internal server error' });
}
