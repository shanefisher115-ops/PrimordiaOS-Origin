import { Logger } from '../core/logger';
export function errorHandler(err, _req, res, _next) {
    Logger.error('Unhandled error', { error: err.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
}
