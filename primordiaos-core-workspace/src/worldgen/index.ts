export interface WorldState {
  id: string;
  tick: number;
  data: Record<string, unknown>;
}

export class Worldgen {
  private world: WorldState = {
    id: "primordia-world",
    tick: 0,
    data: {}
  };

  async pulse(): Promise<void> {
    this.world.tick += 1;
    this.world.data["lastPulse"] = Date.now();
    this.world.data["entropy"] = Math.random();
    console.log("[Worldgen] Pulse tick:", this.world.tick);
  }

  getState(): WorldState {
    return this.world;
  }
}

export const worldgen = new Worldgen();
