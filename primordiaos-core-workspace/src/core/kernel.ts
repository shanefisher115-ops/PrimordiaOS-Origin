import { scheduler } from "../scheduler";
import { worldgen } from "../worldgen";
import { visionCore } from "../vision-core";
import { gatewayRouter } from "../gateway-router";
import { vessels } from "../vessels";
import { unrealBridge } from "../unreal-bridge";
import { ascensionLayer } from "../ascension-layer";
import { metaFlow } from "../meta-flow";
import { selfModificationEngine } from "../self-modification-engine";
import { overascensionPrime } from "../overascension-prime";
import { primeKernel } from "../prime-kernel";

export type SubsystemName =
  | "realm-engine"
  | "memory-engine"
  | "spell"
  | "phom"
  | "agents"
  | "scheduler"
  | "worldgen"
  | "vision-core"
  | "gateway-router"
  | "vessels"
  | "unreal-bridge"
  | "ascension-layer"
  | "meta-flow"
  | "self-modification-engine"
  | "overascension-prime"
  | "prime-kernel"
  | "overascension";

export interface Subsystem {
  name: SubsystemName;
  start(): Promise<void>;
  stop(): Promise<void>;
  health(): Promise<{ status: string }>;
}

export class PrimordiaKernel {
  private subsystems = new Map<SubsystemName, Subsystem>();

  register(subsystem: Subsystem): void {
    if (this.subsystems.has(subsystem.name)) {
      throw new Error("Subsystem already registered: " + subsystem.name);
    }
    this.subsystems.set(subsystem.name, subsystem);
  }

  async startAll(): Promise<void> {
    for (const subsystem of this.subsystems.values()) {
      await subsystem.start();
    }
  }

  async stopAll(): Promise<void> {
    const list = Array.from(this.subsystems.values()).reverse();
    for (const subsystem of list) {
      await subsystem.stop();
    }
  }

  async health(): Promise<Record<string, { status: string }>> {
    const result: Record<string, { status: string }> = {};
    for (const [name, subsystem] of this.subsystems.entries()) {
      result[name] = await subsystem.health();
    }
    return result;
  }
}

export const kernel = new PrimordiaKernel();

// Scheduler
kernel.register({
  name: "scheduler",
  async start() {
    console.log("[Scheduler] started");
  },
  async stop() {
    scheduler.stopAll();
  },
  async health() {
    return { status: "healthy" };
  }
});

// Worldgen
kernel.register({
  name: "worldgen",
  async start() {
    console.log("[Worldgen] started");
  },
  async stop() {},
  async health() {
    return { status: "healthy" };
  }
});

// VisionCore
kernel.register({
  name: "vision-core",
  async start() {
    console.log("[VisionCore] started");
  },
  async stop() {},
  async health() {
    return { status: "healthy" };
  }
});

// GatewayRouter
kernel.register({
  name: "gateway-router",
  async start() {
    console.log("[GatewayRouter] started");
  },
  async stop() {},
  async health() {
    return { status: "healthy" };
  }
});

// Vessels
kernel.register({
  name: "vessels",
  async start() {
    console.log("[Vessels] started");
    vessels.create("vessel-root", "root");
  },
  async stop() {},
  async health() {
    return { status: "healthy" };
  }
});

// UnrealBridge
kernel.register({
  name: "unreal-bridge",
  async start() {
    console.log("[UnrealBridge] starting...");
    await unrealBridge.connect();
  },
  async stop() {},
  async health() {
    return { status: "healthy" };
  }
});

// AscensionLayer
kernel.register({
  name: "ascension-layer",
  async start() {
    console.log("[AscensionLayer] started");
  },
  async stop() {},
  async health() {
    return { status: "healthy" };
  }
});

// MetaFlow
kernel.register({
  name: "meta-flow",
  async start() {
    console.log("[MetaFlow] started");
  },
  async stop() {},
  async health() {
    return { status: "healthy" };
  }
});

// SelfModificationEngine
kernel.register({
  name: "self-modification-engine",
  async start() {
    console.log("[SME] started");
  },
  async stop() {},
  async health() {
    return { status: "healthy" };
  }
});

// OverascensionPrime
kernel.register({
  name: "overascension-prime",
  async start() {
    console.log("[OverascensionPrime] started");
  },
  async stop() {},
  async health() {
    return { status: "healthy" };
  }
});

// PrimeKernel
kernel.register({
  name: "prime-kernel",
  async start() {
    console.log("[PrimeKernel] started");
    primeKernel.setDirective("increase-evolution", 10);
    primeKernel.setDirective("stabilize-system", 5);
  },
  async stop() {},
  async health() {
    return { status: "healthy" };
  }
});
