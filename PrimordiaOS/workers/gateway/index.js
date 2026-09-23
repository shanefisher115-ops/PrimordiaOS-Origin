export default {
    async fetch(request, env, ctx) {
        return new Response(JSON.stringify({
            service: "PrimordiaOS Gateway",
            status: "ONLINE",
            timestamp: new Date().toISOString()
        }), { headers: { "Content-Type": "application/json" } });
    }
};
