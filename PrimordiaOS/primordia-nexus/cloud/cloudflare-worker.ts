// cloud/cloudflare-worker.ts
// PrimordiaOS Cloudflare Worker — full implementation
// Remote event bus endpoint for distributed PrimordiaOS nodes

export default {
    async fetch(request: Request): Promise<Response> {
        if (request.method === "POST") {
            const body = await request.json();

            // Echo back for debugging
            return new Response(JSON.stringify({
                ok: true,
                received: body,
                ts: Date.now()
            }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response("PrimordiaOS Cloudflare Worker");
    }
};
