import { AgentBus } from "./agentBus.js";

export class TacticianAgent {
  constructor(private bus: AgentBus) {}

  scanCognitivePerimeter(): void {
    this.bus.dispatchMessage("tactician", "Perimeter clear. Anti-collapse defenses nominal.");
  }
}