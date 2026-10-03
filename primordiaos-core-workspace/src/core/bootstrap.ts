import { kernel } from "./kernel";
import { realmEngine } from "../realm-engine";
import { memoryEngine } from "../memory-engine";
import { swarm } from "../agents";
import { phom } from "../phom";
import { overascension } from "../overascension";

export async function bootstrap() {
  // Register subsystems EXCEPT scheduler (scheduler is now registered in kernel.ts)
  kernel.register({
    name: "realm-engine",
    async start() {
      console.log("[RealmEngine] started");
    },
    async stop() {},
    async health() {
      return { status: "healthy" };
    }
  });

  kernel.register({
    name: "memory-engine",
    async start() {
      console.log("[MemoryEngine] started");
    },
    async stop() {},
    async health() {
      return { status: "healthy" };
    }
  });

  kernel.register({
    name: "agents",
    async start() {
      console.log("[Agents] started");
    },
    async stop() {},
    async health() {
      return { status: "healthy" };
    }
  });

  kernel.register({
    name: "phom",
    async start() {
      console.log("[PHOM] started");
    },
    async stop() {},
    async health() {
      return { status: "healthy" };
    }
  });

  kernel.register({
    name: "overascension",
    async start() {
      console.log("[Overascension] started");
      overascension.begin();
    },
    async stop() {},
    async health() {
      return { status: "healthy" };
    }
  });
}
