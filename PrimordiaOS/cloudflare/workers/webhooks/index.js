"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrimordiaSessionManager = void 0;
class PrimordiaSessionManager {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }
    async fetch(request) {
        return new Response(JSON.stringify({ session: "active" }), {
            headers: { "Content-Type": "application/json" }
        });
    }
}
exports.PrimordiaSessionManager = PrimordiaSessionManager;
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
function handleWebSocket(request) {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    server.addEventListener("message", (event) => {
        server.send("PrimordiaOS received: " + event.data);
    });
    server.addEventListener("close", () => {
        console.log("WebSocket closed");
    });
    return new Response(null, {
        status: 101,
        webSocket: client
    });
}
exports.default = {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        if (path === "/ws") {
            return handleWebSocket(request);
        }
        if (path === "/") {
            return json({ primordia: "online", worker: "active" });
        }
        if (path === "/session/create") {
            const id = env.PRIMORDIA_SESSION.idFromName("main");
            const obj = env.PRIMORDIA_SESSION.get(id);
            return obj.fetch(request);
        }
        if (path === "/auth/login") {
            return json({ login: "ok" });
        }
        if (path === "/automation/run") {
            return json({ automation: "executed" });
        }
        if (path.startsWith("/webhooks/")) {
            return json({ webhook: "received", path });
        }
        if (path === "/ipc/kernel") {
            return json({ ipc: "kernel-ok" });
        }
        if (path === "/logs/write") {
            return json({ logs: "written" });
        }
        return json({ error: "route not found", path }, 404);
    }
};
