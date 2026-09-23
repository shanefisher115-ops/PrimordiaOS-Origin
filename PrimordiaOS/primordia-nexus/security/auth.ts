// security/auth.ts
// PrimordiaOS Authentication System — full implementation
// Token-based identity system for agents, pipelines, and external services

export interface Identity {
    id: string;
    roles: string[];
    issuedAt: number;
}

export class Auth {
    private tokens: Map<string, Identity>;

    constructor() {
        this.tokens = new Map();
    }

    issueToken(id: string, roles: string[]): string {
        const token = `tok-${id}-${Date.now()}`;
        this.tokens.set(token, {
            id,
            roles,
            issuedAt: Date.now()
        });
        return token;
    }

    validateToken(token: string): Identity | null {
        return this.tokens.get(token) || null;
    }

    revokeToken(token: string) {
        this.tokens.delete(token);
    }
}

export const auth = new Auth();
