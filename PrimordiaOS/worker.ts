// worker.ts - Cloudflare Worker Orchestrator
export interface Env {
  MONEYPLUG_WEBHOOK_URL: string;
  PRIMORDIA_WEBHOOK_URL: string;
  CREATOROS_WEBHOOK_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const payload = await request.json();
      const { module, action, source, data } = payload;

      // 1. Audit / Log event structure
      const logEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        module,
        action,
        source,
        status: 'processing'
      };

      // 2. Dynamic Routing Core
      let targetUrl = '';
      if (module === 'moneyplughub') targetUrl = env.MONEYPLUG_WEBHOOK_URL;
      else if (module === 'primordiaos') targetUrl = env.PRIMORDIA_WEBHOOK_URL;
      else if (module === 'creatoros') targetUrl = env.CREATOROS_WEBHOOK_URL;

      if (targetUrl) {
        // Forward event to target service
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        return new Response(
          JSON.stringify({ success: true, log: { ...logEntry, status: 'success' } }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ error: 'Unknown Target Module' }), { status: 400 });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  },
};