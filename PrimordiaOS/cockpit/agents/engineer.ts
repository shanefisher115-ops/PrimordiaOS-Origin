import { AgentBus } from "./agentBus.js";

export class EngineerAgent {
  constructor(private bus: AgentBus) {}

  balancePlasmaReactors(): void {
    this.bus.dispatchMessage("engineer", "Reactors balanced at 100% equilibrium.");
  }
}