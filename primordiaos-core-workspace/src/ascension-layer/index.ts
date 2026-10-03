import { primordiaFlow } from "../primordiaflow";
import { worldgen } from "../worldgen";

export interface AscensionEvent {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

export class AscensionLayer {
  private history: AscensionEvent[] = [];

  record(event: AscensionEvent): void {
    this.history.push(event);
    console.log("[AscensionLayer] Event:", event.type, "Id:", event.id);
  }

  async evolveFlows(): Promise<void> {
    console.log("[AscensionLayer] Evolving PrimordiaFlow graphs...");
    const world = worldgen.getState();
    this.record({
      id: "evolve-flows-" + Date.now(),
      type: "flow-evolution",
      payload: { worldTick: world.tick },
      timestamp: Date.now()
    });
  }

  async pulse(): Promise<void> {
    await this.evolveFlows();
  }

  getHistory(): AscensionEvent[] {
    return this.history;
  }
}

export const ascensionLayer = new AscensionLayer();
