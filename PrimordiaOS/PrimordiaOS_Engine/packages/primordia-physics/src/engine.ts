const MAX_DELTA_TIME = 0.1; // Cap at 100ms to prevent tunneling during lag spikes
const FIXED_TIMESTEP = 1 / 60;

export function processPhysicsLoop(rawDelta: number, state: EngineState): EngineState {
  // Clamp delta time as recommended by Jules PR feedback
  const dt = Math.min(rawDelta, MAX_DELTA_TIME);
  
  let accumulator = state.accumulator + dt;
  let updatedState = { ...state };

  while (accumulator >= FIXED_TIMESTEP) {
    updatedState = stepSimulation(updatedState, FIXED_TIMESTEP);
    accumulator -= FIXED_TIMESTEP;
  }

  updatedState.accumulator = accumulator;
  return updatedState;
}
