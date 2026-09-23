// src/middleware/rateLimit.ts
const requests = {};
export function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const LIMIT = 100;
    const WINDOW = 60 * 1000;
    if (!requests[ip]) {
        requests[ip] = { count: 1, timestamp: now };
    }
    else {
        const elapsed = now - requests[ip].timestamp;
        if (elapsed > WINDOW) {
            requests[ip] = { count: 1, timestamp: now };
        }
        else {
            requests[ip].count++;
            if (requests[ip].count > LIMIT) {
                return res.status(429).json({ error: 'Too many requests, slow down.' });
            }
        }
    }
    next();
}
