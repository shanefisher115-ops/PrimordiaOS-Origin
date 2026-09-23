import { Logger } from '../core/logger';
export function requestLogger(req, _res, next) {
    Logger.info('Incoming request', { method: req.method, path: req.path });
    next();
}
