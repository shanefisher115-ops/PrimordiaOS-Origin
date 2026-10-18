// Continuum (machine): realm time runs at the processor's pace. An idle machine
// drifts at 0.7x; a saturated one races at 2x.
import { clamp, lerp } from '../../src/prng.js';
import { telemetry } from './telemetry.js';

export function create() {
  return {
    name: 'Continuum',
    stream: null,
    hz: 0,
    init(ctx) {
      ctx.t = 0;
      telemetry();
    },
    step(dt, ctx) {
      const target = clamp(0.7 + 1.3 * telemetry().load, 0.25, 2.5);
      ctx.state.time_dilation = lerp(ctx.state.time_dilation, target, Math.min(1, dt));
      ctx.t += dt * ctx.state.time_dilation;
    },
    sample() {
      return [];
    },
  };
}
