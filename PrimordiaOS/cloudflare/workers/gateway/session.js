"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrimordiaSession = void 0;
class PrimordiaSession {
    state;
    env;
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }
    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === "/get") {
            const data = await this.state.storage.get("session") || {};
            return json(data);
        }
        if (url.pathname === "/set") {
            const body = await request.json().catch(() => ({}));
            await this.state.storage.put("session", body);
            return json({ ok: true });
        }
        if (url.pathname === "/user") {
            const user = await this.state.storage.get("user") || null;
            return json({ user });
        }
        if (url.pathname === "/user/set") {
            const body = await request.json().catch(() => ({}));
            await this.state.storage.put("user", body);
            return json({ ok: true });
        }
        return json({ error: "Unknown session route" }, 404);
    }
}
exports.PrimordiaSession = PrimordiaSession;
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
