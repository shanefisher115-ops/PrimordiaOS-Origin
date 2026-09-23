// services/http-server.ts
// PrimordiaOS HTTP Server — full implementation
// Exposes REST endpoints for status, emit, and snapshots
import http from "http";
import { eventBus } from "../primordia-core/shared/event-bus";
import { snapshotManager } from "../primordia-core/osmium/snapshots";
import { primordiaOS } from "../primordia-core/bootstrap";
export class HttpServer {
    server = null;
    port;
    constructor(port = 8080) {
        this.port = port;
    }
    start() {
        this.server = http.createServer(async (req, res) => {
            if (!req.url)
                return;
            if (req.url === "/status") {
                const latestSnapshot = snapshotManager.getLatestSnapshot();
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    started: primordiaOS.started,
                    latestSnapshot: latestSnapshot ? latestSnapshot.id : null
                }));
                return;
            }
            if (req.url.startsWith("/emit")) {
                const [, , topic, ...rest] = req.url.split("/");
                const payloadStr = decodeURIComponent(rest.join("/"));
                let payload = {};
                try {
                    payload = JSON.parse(payloadStr);
                }
                catch { }
                eventBus.emit(topic, payload, "http");
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true, topic, payload }));
                return;
            }
            res.writeHead(404);
            res.end("Not Found");
        });
        this.server.listen(this.port, () => {
            console.log(`[HttpServer] Listening on port ${this.port}`);
        });
    }
    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
            console.log("[HttpServer] Stopped.");
        }
    }
}
export const httpServer = new HttpServer(8080);
