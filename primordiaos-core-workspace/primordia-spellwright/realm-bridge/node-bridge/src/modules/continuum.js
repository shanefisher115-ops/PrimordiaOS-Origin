// Continuum — the clock. Owns simulation time and its dilation; emits no
// packet of its own (every envelope carries `t`, and time_dilation rides in
// realm_manifest.metaphysics).
import { noise1, clamp } from '../prng.js';

export function create(seed) {
  let epoch = 0;
  return {
    name: 'Continuum',
    stream: null,
    hz: 0,
    init(ctx) {
      ctx.t = 0;
    },
    step(dt, ctx) {
      epoch += dt;
      // Dilation breathes slowly and stretches when entropy is high.
      const drift = noise1(epoch * 0.03, seed) * 0.25;
      ctx.state.time_dilation = clamp(1 + drift - (ctx.state.entropy - 0.5) * 0.3, 0.25, 2.5);
      ctx.t += dt * ctx.state.time_dilation;
    },
    sample() {
      return [];
    },
  };
}
