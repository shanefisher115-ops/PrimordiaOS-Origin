export type ReactorState = "IDLE" | "PULSING" | "ASCENDING" | "OVERLOADED";

export class Reactor {
  private intensity = 0;
  private energy = 0;
  private state: ReactorState = "IDLE";

  pulse(engagementScore: number) {
    const normalized = Math.min(1, engagementScore / 500);
    this.intensity = normalized;
    this.energy = Math.min(1, this.energy + normalized * 0.05);
    this.state = "PULSING";
  }

  ascend() {
    this.state = "ASCENDING";
    this.intensity = 1;
    this.energy = 1;
  }

  overload() {
    this.state = "OVERLOADED";
    this.intensity = 1;
    this.energy = 1;
  }

  coolDown() {
    this.energy = Math.max(0, this.energy - 0.02);
    if (this.energy <= 0.1) {
      this.state = "IDLE";
      this.intensity = 0.1;
    }
  }

  getIntensity() {
    return this.intensity;
  }

  getEnergy() {
    return this.energy;
  }

  getState() {
    return this.state;
  }
}
