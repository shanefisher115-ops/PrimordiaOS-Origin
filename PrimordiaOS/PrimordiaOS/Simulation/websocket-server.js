import WebSocket, { WebSocketServer } from "ws";
import { eventBus } from "../kernel/event-bus.js";
import { unrealBridge } from "../realms/simulation/unreal-bridge.js";

/**
 * Port 17800 WebSocket Event Server:
 * Interfaces Unreal Engine 5 client instances, HUD overlays, and Niagara particle triggers.
 */
export class SimulationWebSocketServer {
  constructor(port = 17800) {
    this.port = port;
    this.wss = null;
    this.clients = new Set();
    this.bigBangListener = null;
    this.simTickListener = null;
    this.telemetryListener = null;
  }

  start() {
    if (this.wss) {
      console.log(`[Simulation WS Server] Already active on port ${this.port}`);
      return this;
    }

    try {
      this.wss = new WebSocketServer({ port: this.port });
      console.log(`★ [Simulation WS Server] Running on ws://localhost:${this.port}`);

      this.wss.on("connection", (ws) => {
        this.clients.add(ws);
        console.log("[Simulation WS Server] Client connected (Unreal Engine / HUD)");

        // Send initial telemetry on connect
        const initTelemetry = {
          type: "telemetry",
          data: {
            status: "connected",
            port: this.port,
            timestamp: Date.now(),
            metrics: {
              AuraSpeed: 0.85,
              ChaosLevel: 0.12,
              coherence: 100,
              particle_rate: 60,
              ue5_connected: true
            }
          }
        };
        ws.send(JSON.stringify(initTelemetry));

        ws.on("message", (message) => {
          try {
            const rawStr = message.toString();
            const data = JSON.parse(rawStr);
            console.log(`[Simulation WS Server] Received: ${data.type || data.name || "message"}`);

            eventBus.emitRealmEvent("UNREAL_EVENT", data, "simulation_realm");
            eventBus.emitRealmEvent("UNREAL_MESSAGE_RECEIVED", data, "simulation_realm");

            if (data.type === "UNREAL_PLAY_STARTED" || data.name === "UNREAL_PLAY_STARTED") {
              console.log("★ [UNREAL PLAY DETECTED] Triggering Big Bang broadcast...");
              eventBus.emit("UNREAL_PLAY_STARTED", data);
              unrealBridge.triggerBigBang(data.params || data.payload || {});
            } else if (data.type === "TRIGGER_BIG_BANG" || data.name === "TRIGGER_BIG_BANG") {
              unrealBridge.triggerBigBang(data.params || data.payload || {});
            } else if (data.type === "get_telemetry") {
              ws.send(JSON.stringify({
                type: "telemetry",
                data: {
                  status: "active",
                  clients: this.clients.size,
                  timestamp: Date.now(),
                  metrics: {
                    AuraSpeed: 0.85,
                    ChaosLevel: 0.12,
                    coherence: 100,
                    particle_rate: 60
                  }
                }
              }));
            }
          } catch {
            // Non-JSON message
            eventBus.emitRealmEvent("UNREAL_EVENT", { raw: message.toString() }, "simulation_realm");
          }
        });

        ws.on("close", () => {
          this.clients.delete(ws);
          console.log("[Simulation WS Server] Client disconnected");
        });

        ws.on("error", (err) => {
          console.warn(`[Simulation WS Server] Client socket error:`, err.message);
          this.clients.delete(ws);
        });
      });

      this.wss.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.warn(`[Simulation WS Server] Port ${this.port} is already in use.`);
        } else {
          console.error(`[Simulation WS Server] Server error:`, err);
        }
      });

      // Relay Big Bang Trigger to all connected clients
      this.bigBangListener = (evt) => {
        const bigBangPayload = {
          type: "BIG_BANG_TRIGGER",
          name: "BIG_BANG_TRIGGER",
          timestamp: evt.iso || new Date().toISOString(),
          payload: evt.payload || {
            genesis: true,
            singularity_intensity: 2.5,
            niagara_system: "NS_PrimordiaBigBang",
            cosmic_color: "#33bbff",
            swarm_count: 6
          }
        };
        this.broadcast(bigBangPayload);
      };
      eventBus.on("BIG_BANG_TRIGGER", this.bigBangListener);

      // Relay Simulation Tick to all connected clients
      this.simTickListener = (evt) => {
        const extraMetrics = evt.data || evt.payload?.data || evt.payload?.metrics || evt.payload || {};
        const tickPayload = {
          type: "SIMULATION_TICK",
          name: "SIMULATION_TICK",
          timestamp: evt.iso || new Date().toISOString(),
          data: {
            activeEntities: 100,
            particleDensity: 0.8,
            frameTimeMs: 16.6,
            ...(typeof extraMetrics === "object" ? extraMetrics : {})
          },
          payload: evt.payload || { coherence: 100 }
        };
        this.broadcast(tickPayload);
      };
      eventBus.on("SIMULATION_TICK", this.simTickListener);

      // Relay Telemetry Update
      this.telemetryListener = (evt) => {
        const payloadMetrics = evt.payload?.data?.metrics || evt.data?.metrics || evt.payload?.metrics || evt.metrics;
        const metrics = payloadMetrics || {
          AuraSpeed: 0.85,
          ChaosLevel: 0.12,
          coherence: 100,
          particle_rate: 60
        };
        const telemetryPayload = {
          type: "telemetry_update",
          name: "telemetry_update",
          data: {
            metrics
          },
          timestamp: Date.now()
        };
        this.broadcast(telemetryPayload);
      };
      eventBus.on("TELEMETRY_UPDATE", this.telemetryListener);


    } catch (err) {
      console.warn(`[Simulation WS Server] Port ${this.port} notice: ${err.message}`);
    }

    return this;
  }

  broadcast(data) {
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch {
          this.clients.delete(client);
        }
      }
    }
  }

  stop() {
    if (this.bigBangListener) {
      eventBus.off("BIG_BANG_TRIGGER", this.bigBangListener);
      this.bigBangListener = null;
    }
    if (this.simTickListener) {
      eventBus.off("SIMULATION_TICK", this.simTickListener);
      this.simTickListener = null;
    }
    if (this.telemetryListener) {
      eventBus.off("TELEMETRY_UPDATE", this.telemetryListener);
      this.telemetryListener = null;
    }

    for (const client of this.clients) {
      try { client.terminate(); } catch {}
    }
    this.clients.clear();

    if (this.wss) {
      try { this.wss.close(); } catch {}
      this.wss = null;
    }
    console.log(`[Simulation WS Server] Stopped.`);
  }
}

export const simulationWsServer = new SimulationWebSocketServer();

