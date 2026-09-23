// security/auth.ts
// PrimordiaOS Authentication System — full implementation
// Token-based identity system for agents, pipelines, and external services
export class Auth {
    tokens;
    constructor() {
        this.tokens = new Map();
    }
    issueToken(id, roles) {
        const token = `tok-${id}-${Date.now()}`;
        this.tokens.set(token, {
            id,
            roles,
            issuedAt: Date.now()
        });
        return token;
    }
    validateToken(token) {
        return this.tokens.get(token) || null;
    }
    revokeToken(token) {
        this.tokens.delete(token);
    }
}
export const auth = new Auth();
