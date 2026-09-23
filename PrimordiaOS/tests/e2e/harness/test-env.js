import { RestServer } from "../../../PrimordiaOS/interfaces/rest-server.js";
import { SimulationWebSocketServer } from "../../../PrimordiaOS/simulation/websocket-server.js";
import { spine } from "../../../PrimordiaOS/kernel/spine.js";
import { eventBus } from "../../../PrimordiaOS/kernel/event-bus.js";
import { stateBus } from "../../../PrimordiaOS/kernel/state-bus.js";
import { osmiumLedger } from "../../../PrimordiaOS/realms/identity/osmium-ledger.js";
import { antigravGuardian } from "../../../PrimordiaOS/agents/antigrav-guardian.js";
import { cloudflareGateway } from "../../../PrimordiaOS/realms/cloud/cloudflare-gateway.js";
import { TermuxVessel } from "../../../PrimordiaOS/vessels/termux-vessel.js";
import http from "node:http";

export class TestEnvironment {
  constructor(options = {}) {
    this.restPort = options.restPort || 3300;
    this.wsPort = options.wsPort || 17890;
    this.restServer = null;
    this.wsServer = null;
    this.running = false;
  }

  async start() {
    if (this.running) return;

    // Reset / ensure spine state
    spine.booted = true;
    spine.startTime = Date.now();

    // Start isolated test servers
    this.restServer = new RestServer(this.restPort);
    this.restServer.start();

    this.wsServer = new SimulationWebSocketServer(this.wsPort);
    this.wsServer.start();

    // Small delay to ensure port binding
    await new Promise((r) => setTimeout(r, 100));
    this.running = true;
  }

  async stop() {
    if (!this.running) return;

    if (this.restServer) {
      this.restServer.stop();
      this.restServer = null;
    }
    if (this.wsServer) {
      this.wsServer.stop();
      this.wsServer = null;
    }
    await new Promise((r) => setTimeout(r, 50));
    this.running = false;
  }

  getRestUrl(path = "") {
    return `http://localhost:${this.restPort}${path.startsWith("/") ? path : "/" + path}`;
  }

  getWsUrl() {
    return `ws://localhost:${this.wsPort}`;
  }
}

export const defaultTestEnv = new TestEnvironment({ restPort: 3300, wsPort: 17890 });
export {
  spine,
  eventBus,
  stateBus,
  osmiumLedger,
  antigravGuardian,
  cloudflareGateway,
  TermuxVessel
};
