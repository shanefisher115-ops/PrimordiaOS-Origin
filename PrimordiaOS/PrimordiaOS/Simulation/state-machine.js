/**
 * Simulation World State Machine.
 */
export class WorldStateMachine {
  constructor() {
    this.phase = "SINGULARITY";
    this.history = [];
  }

  transition(newPhase) {
    this.history.push({ from: this.phase, to: newPhase, timestamp: Date.now() });
    this.phase = newPhase;
    return this.phase;
  }
}

export const worldStateMachine = new WorldStateMachine();
