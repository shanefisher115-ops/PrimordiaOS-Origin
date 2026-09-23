import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spine } from "../kernel/spine.js";
import { eventBus } from "../kernel/event-bus.js";
import { stateBus } from "../kernel/state-bus.js";
import { unrealBridge } from "../realms/simulation/unreal-bridge.js";
import { moneyPlugPipeline } from "../pipelines/moneyplug-pipeline.js";
import { antigravGuardian } from "../agents/antigrav-guardian.js";
import { localRuntime } from "../realms/local/runtime.js";
import { osmiumLedger } from "../realms/identity/osmium-ledger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getConfigFile(filename) {
  const candidates = [
    path.resolve(__dirname, "..", "config", filename),
    path.resolve(process.cwd(), "PrimordiaOS", "config", filename),
    path.resolve(process.cwd(), "primordiaos", "config", filename)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}


/**
 * REST & SSE Server for PrimordiaOS Master Spine (Default port: 3000).
 */
export class RestServer {
  constructor(port = 3000) {
    this.port = port;
    this.server = null;
    this.sseClients = new Set();
    this.pingInterval = null;
    this.busListener = null;
  }

  start() {
    if (this.server) {
      console.log(`[RestServer] Already active on port ${this.port}`);
      return this;
    }

    this.server = http.createServer((req, res) => {
      // Enable CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Primordial-Key, Authorization");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const host = req.headers.host || `localhost:${this.port}`;
      let pathname = "/";
      let parsedUrl = null;
      try {
        const rawUrl = req.url || "/";
        const sanitizedUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
          ? rawUrl
          : "/" + rawUrl.replace(/^\/+/, "");
        parsedUrl = new URL(sanitizedUrl, `http://${host}`);
        pathname = parsedUrl.pathname;
      } catch {
        try {
          pathname = (req.url || "/").split("?")[0].replace(/^\/+/, "/");
          if (!pathname.startsWith("/")) pathname = "/" + pathname;
        } catch {
          pathname = "/";
        }
      }

      // 1. SSE Stream
      if (pathname === "/api/stream") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*"
        });

        const initialPayload = {
          type: "CONNECTED",
          name: "CONNECTED",
          timestamp: Date.now(),
          system: "PrimordiaOS Master Spine",
          spine_booted: Boolean(spine.booted)
        };
        res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);
        this.sseClients.add(res);

        req.on("close", () => {
          this.sseClients.delete(res);
        });
        return;
      }

      // 2. Health Endpoints
      if (pathname === "/health" || pathname === "/api/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "healthy",
          timestamp: Date.now(),
          spine_booted: Boolean(spine.booted)
        }));
        return;
      }

      // 3. Status Endpoint
      if (pathname === "/api/status") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(spine.getStatus(), null, 2));
        return;
      }

      // 4. Realms Status Endpoint
      if (pathname === "/api/realms") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(stateBus.getSnapshot().realms, null, 2));
        return;
      }

      // 5. Trigger Big Bang Simulation
      if (pathname === "/api/trigger-bigbang" && (req.method === "POST" || req.method === "GET")) {
        const handleBigBang = (body = {}) => {
          const payload = unrealBridge.triggerBigBang(body);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "triggered", success: true, payload }));
        };

        if (req.method === "POST") {
          readJsonBody(req).then(handleBigBang).catch(() => handleBigBang({}));
        } else {
          const params = {};
          if (parsedUrl && parsedUrl.searchParams) {
            for (const [k, v] of parsedUrl.searchParams.entries()) {
              params[k] = v;
            }
          }
          handleBigBang(params);
        }
        return;
      }

      // 6. Trigger Autonomous Pulse
      if (pathname === "/api/trigger-pulse" && (req.method === "POST" || req.method === "GET")) {
        moneyPlugPipeline.runAutonomousCycle().then(result => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "pulsed", success: true, result }));
        }).catch(err => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "error", success: false, error: err.message }));
        });
        return;
      }

      // 7. ANTIGRAV Audit Endpoint
      if (pathname === "/api/antigrav/audit" && (req.method === "POST" || req.method === "GET")) {
        const handleAudit = (body = {}) => {
          const report = antigravGuardian.audit(body);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(report, null, 2));
        };

        if (req.method === "POST") {
          readJsonBody(req).then(handleAudit).catch(() => handleAudit({}));
        } else {
          handleAudit({});
        }
        return;
      }

      // 8. Recent Events
      if (pathname === "/api/events") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(eventBus.getRecentEvents(), null, 2));
        return;
      }

      // 9. Mobile Node Telemetry Ingestion Endpoint
      if (pathname === "/api/telemetry/mobile" && (req.method === "POST" || req.method === "PUT")) {
        readJsonBody(req).then((body) => {
          const result = localRuntime.ingestMobileTelemetry(body);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            status: "received",
            success: true,
            timestamp: Date.now(),
            vessel: body.vesselId || body.vessel_id || body.vessel || "vessel-termux-android",
            telemetry: result.packet
          }));
        }).catch((err) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        });
        return;
      }

      // 10. Remote Sovereign CLI Execution Endpoint
      if (pathname === "/api/cli/execute" && req.method === "POST") {
        readJsonBody(req).then(async (body) => {
          const command = body.command || "status";
          const args = body.args || {};
          const result = await localRuntime.executeRemoteCli(command, args, body);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        }).catch((err) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        });
        return;
      }

      // 11. Metadata Registries: Registry (7,504 modules)
      if (pathname === "/api/registry" || pathname === "/api/modules") {
        const filePath = getConfigFile("registry.json");
        if (filePath) {
          res.writeHead(200, { "Content-Type": "application/json" });
          fs.createReadStream(filePath).pipe(res);
          return;
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "registry.json not found" }));
          return;
        }
      }

      // 12. Metadata Registries: Realm Map
      if (pathname === "/api/realm-map" || pathname === "/api/realms/map") {
        const filePath = getConfigFile("realm-map.json");
        if (filePath) {
          res.writeHead(200, { "Content-Type": "application/json" });
          fs.createReadStream(filePath).pipe(res);
          return;
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "realm-map.json not found" }));
          return;
        }
      }

      // 13. Metadata Registries: Dependency Graph
      if (pathname === "/api/dependency-graph" || pathname === "/api/dep-graph") {
        const filePath = getConfigFile("dependency-graph.json");
        if (filePath) {
          res.writeHead(200, { "Content-Type": "application/json" });
          fs.createReadStream(filePath).pipe(res);
          return;
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "dependency-graph.json not found" }));
          return;
        }
      }

      // 14. Metadata Registries: Ontology
      if (pathname === "/api/ontology") {
        const filePath = getConfigFile("ontology.json");
        if (filePath) {
          res.writeHead(200, { "Content-Type": "application/json" });
          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }

      // 15. Metadata Registries: Config
      if (pathname === "/api/config" || pathname === "/api/primordia-config") {
        const filePath = getConfigFile("primordia.config.json");
        if (filePath) {
          res.writeHead(200, { "Content-Type": "application/json" });
          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }

      // 16. Syndicate Yield & Roster Endpoint
      if (pathname === "/api/syndicates") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          syndicates: [
            { tag: "VRTX", name: "[VORTEX] Cyber Syndicate", sigil: "CYBER-DRAGON", weekly_score: 142500 },
            { tag: "APEX", name: "[APEX] Sovereign Capital Guild", sigil: "SOVEREIGN-EMP", weekly_score: 118200 },
            { tag: "PLSE", name: "[PULSE] TikTok Viral Growth Army", sigil: "VIRAL-PULSE", weekly_score: 95400 },
            { tag: "QNTM", name: "[QUANT] Matrix Alchemists", sigil: "QUANT-MATRIX", weekly_score: 88900 }
          ],
          xpBonusMultiplier: 1.15
        }, null, 2));
        return;
      }

      // 17. Osmium Ledger Status Endpoint
      if (pathname === "/api/ledger" || pathname === "/api/osmium/ledger") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          height: osmiumLedger.chain.length,
          latestBlock: osmiumLedger.getLatestBlock(),
          valid: osmiumLedger.verifyChain(),
          history: osmiumLedger.getHistory()
        }, null, 2));
        return;
      }

      // 18. Serve Dashboard / Cockpit HUD
      if (pathname === "/" || pathname === "/dashboard" || pathname === "/dashboard.html" || pathname === "/preview.html" || pathname === "/cockpit") {
        const candidates = [
          path.join(__dirname, "dashboard.html"),
          path.resolve(process.cwd(), "PrimordiaOS", "interfaces", "dashboard.html"),
          path.resolve(process.cwd(), "primordiaos", "interfaces", "dashboard.html"),
          path.resolve(process.cwd(), "preview.html")
        ];

        for (const dashPath of candidates) {
          if (fs.existsSync(dashPath)) {
            res.writeHead(200, { "Content-Type": "text/html; charset=UTF-8" });
            fs.createReadStream(dashPath).pipe(res);
            return;
          }
        }
      }

      // 404 Not Found
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Endpoint not found", path: pathname }));
    });

    // Forward bus events to SSE clients
    this.busListener = (evt) => {
      const msg = `data: ${JSON.stringify(evt)}\n\n`;
      for (const client of this.sseClients) {
        try {
          client.write(msg);
        } catch {
          this.sseClients.delete(client);
        }
      }
    };
    eventBus.on("*", this.busListener);

    // Periodic heartbeat ping to maintain SSE connection
    this.pingInterval = setInterval(() => {
      if (this.sseClients.size > 0) {
        const pingMsg = `data: ${JSON.stringify({ type: "HEARTBEAT", name: "HEARTBEAT", timestamp: Date.now() })}\n\n`;
        for (const client of this.sseClients) {
          try {
            client.write(pingMsg);
          } catch {
            this.sseClients.delete(client);
          }
        }
      }
    }, 10000);

    this.server.listen(this.port, () => {
      console.log(`🌌 [PrimordiaOS REST & HUD Server] Active at http://localhost:${this.port}`);
    }).on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[RestServer] Port ${this.port} is already in use.`);
      } else {
        console.error(`[RestServer] Server error:`, err);
      }
    });

    return this;
  }

  stop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.busListener) {
      eventBus.off("*", this.busListener);
      this.busListener = null;
    }
    for (const client of this.sseClients) {
      try { client.end(); } catch {}
    }
    this.sseClients.clear();

    if (this.server) {
      this.server.close();
      this.server = null;
    }
    console.log(`[RestServer] Stopped.`);
  }
}

export const restServer = new RestServer();

