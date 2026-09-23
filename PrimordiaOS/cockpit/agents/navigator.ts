import { AgentBus } from "./agentBus.js";

export class NavigatorAgent {
  constructor(private bus: AgentBus) {}

  plotCourseToOrigin(): void {
    this.bus.dispatchMessage("navigator", "Course plotted to Chamber of Origin. Coordinates locked.");
  }
}