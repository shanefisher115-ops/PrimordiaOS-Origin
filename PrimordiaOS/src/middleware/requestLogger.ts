import { Request, Response, NextFunction } from 'express';
import { Logger } from '../core/logger';

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  Logger.info('Incoming request', { method: req.method, path: req.path });
  next();
}
