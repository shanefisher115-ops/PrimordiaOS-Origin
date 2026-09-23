import { autopostRouter } from "./autopost.ts";
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        if (request.method === "POST" && path === "/autopost") {
            try {
                const payload = await request.json();
                const caption = await autopostRouter(payload);
                return new Response(JSON.stringify({ caption }), {
                    headers: { "Content-Type": "application/json" },
                });
            }
            catch (err) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                });
            }
        }
        return new Response("PrimordiaOS autopost worker online");
    }
};
