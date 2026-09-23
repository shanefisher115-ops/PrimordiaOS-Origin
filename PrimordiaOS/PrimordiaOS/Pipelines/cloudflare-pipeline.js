import { eventBus } from "../kernel/event-bus.js";
import { cloudflareGateway } from "../realms/cloud/cloudflare-gateway.js";

/**
 * Cloudflare Pipeline: Routes edge inference, worker health, and public webhooks.
 */
export class CloudflarePipeline {
  constructor() {
    this.name = "Cloudflare Edge Pipeline";
    this.running = false;
  }

  async start() {
    this.running = true;
    console.log(`[Pipeline] ${this.name} started.`);

    // Subscribe to edge requests
    eventBus.on("EDGE_REQUEST", async (evt) => {
      const { prompt, model } = evt.payload;
      const res = await cloudflareGateway.dispatchInference(prompt, model);
      eventBus.emitRealmEvent("EDGE_RESPONSE", res, "cloud_realm");
    });
  }
}

export const cloudflarePipeline = new CloudflarePipeline();
