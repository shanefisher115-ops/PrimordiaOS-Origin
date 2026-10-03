import { kernel } from "../core/kernel";

export class Overascension {
  async pulse() {
    const health = await kernel.health();
    console.log("[Overascension] health snapshot:", health);
  }
}

export const overascension = new Overascension();
