"use strict";
/**
 * Authentication Helpers for PrimordiaOS Workers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthUtils = void 0;
class AuthUtils {
    /**
     * Extract Bearer token from Request headers
     */
    static extractToken(request) {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        return authHeader.substring(7).trim();
    }
    /**
     * Verify token against KV session store
     */
    static async verifySession(env, token) {
        if (!env.PRIMORDIA_SESSIONS)
            return null;
        const sessionRaw = await env.PRIMORDIA_SESSIONS.get(`session:${token}`);
        if (!sessionRaw)
            return null;
        try {
            const session = JSON.parse(sessionRaw);
            if (Date.now() > session.expiresAt) {
                await env.PRIMORDIA_SESSIONS.delete(`session:${token}`);
                return null;
            }
            return session;
        }
        catch {
            return null;
        }
    }
    /**
     * Generate lightweight pseudo-token
     */
    static generateToken() {
        const array = new Uint8Array(24);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
}
exports.AuthUtils = AuthUtils;
