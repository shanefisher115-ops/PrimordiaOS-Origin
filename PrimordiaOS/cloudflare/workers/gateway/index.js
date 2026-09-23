"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        if (url.pathname === "/ipc/kernel") {
            let body;
            try {
                body = await request.json();
            }
            catch {
                const raw = await request.text();
                body = { text: raw };
            }
            const userInput = body.text ||
                body.command ||
                JSON.stringify(body);
            const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
                input: `Antigravity Kernel v7.0\n\nUser: ${userInput}`
            });
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" }
            });
        }
        return new Response("Route not found", { status: 404 });
    }
};
