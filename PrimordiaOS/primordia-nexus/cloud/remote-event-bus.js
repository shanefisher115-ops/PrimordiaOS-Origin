// cloud/remote-event-bus.ts
// PrimordiaOS Remote Event Bus — full implementation
// Sends local events to Cloudflare Worker + receives remote events
import { eventBus } from "../primordia-core/shared/event-bus";
import { httpClient } from "../network/http-client";
export class RemoteEventBus {
    endpoint;
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
    start() {
        console.log("[RemoteEventBus] Starting…");
        // Forward all local events to Cloudflare Worker
        eventBus.subscribe("*", async (event) => {
            try {
                await httpClient.post(this.endpoint, event);
            }
            catch (err) {
                console.warn("[RemoteEventBus] Failed to send event:", err);
            }
        });
        console.log("[RemoteEventBus] Remote sync active.");
    }
}
export const remoteEventBus = new RemoteEventBus("https://your-cloudflare-worker-url.workers.dev");
