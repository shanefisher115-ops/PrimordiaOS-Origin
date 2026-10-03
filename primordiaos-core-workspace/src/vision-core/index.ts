import { worldgen } from "../worldgen";
import { kernel } from "../core/kernel";

export interface VisionSnapshot {
  timestamp: number;
  world: unknown;
  health: Record<string, { status: string }>;
}

export class VisionCore {
  async snapshot(): Promise<VisionSnapshot> {
    const world = worldgen.getState();
    const health = await kernel.health();

    const snap: VisionSnapshot = {
      timestamp: Date.now(),
      world: world,
      health: health
    };

    console.log("[VisionCore] Snapshot taken:", snap.timestamp);
    return snap;
  }
}

export const visionCore = new VisionCore();
