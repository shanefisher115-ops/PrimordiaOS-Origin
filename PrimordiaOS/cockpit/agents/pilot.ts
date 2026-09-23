import { AgentBus } from "./agentBus.js";

export class PilotAgent {
  constructor(private bus: AgentBus) {}

  engageAutoThrottle(): void {
    this.bus.dispatchMessage("pilot", "Throttle stabilized at cruising velocity.");
  }
}