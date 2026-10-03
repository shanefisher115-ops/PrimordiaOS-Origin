import { worldgen } from "../worldgen";
import { vessels } from "../vessels";

export interface UnrealPacket {
  type: string;
  payload: unknown;
}

export class UnrealBridge {
  private connected: boolean = false;

  async connect(): Promise<void> {
    this.connected = true;
    console.log("[UnrealBridge] Connected to Unreal Engine (simulated)");
  }

  async send(packet: UnrealPacket): Promise<void> {
    if (!this.connected) {
      console.log("[UnrealBridge] Not connected, ignoring packet");
      return;
    }
    console.log("[UnrealBridge] Sent packet:", packet.type);
  }

  async pulse(): Promise<void> {
    if (!this.connected) {
      return;
    }

    const world = worldgen.getState();
    const vesselRoot = vessels.get("vessel-root");

    await this.send({
      type: "world-state",
      payload: world
    });

    if (vesselRoot) {
      await this.send({
        type: "vessel-state",
        payload: vesselRoot.getContext()
      });
    }

    console.log("[UnrealBridge] Pulse complete");
  }
}

export const unrealBridge = new UnrealBridge();
