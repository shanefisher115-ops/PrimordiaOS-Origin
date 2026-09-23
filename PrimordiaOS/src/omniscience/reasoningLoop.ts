// src/omniscience/reasoningLoop.ts

export class ReasoningLoop {
  isRunning: boolean = false;

  start() {
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
  }

  getStats() {
    return {
      running: this.isRunning,
      status: "active",
      cycles: 1
    };
  }
}

export const reasoningLoop = new ReasoningLoop();