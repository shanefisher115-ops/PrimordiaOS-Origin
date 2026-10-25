// Shadowforge (machine): memory pressure as negative space. Below ~55% RAM in use
// there is no shadow; past that the inversion beneath the heart deepens as RAM runs
// out, and the realm's light starts turning to its complement.
import { clamp01, r4, v3 } from '../../src/prng.js';
import { telemetry } from './telemetry.js';

export function create() {
  return {
    name: 'Shadowforge',
    stream: 'shadow_inversion',
    hz: 30,
    init() {},
    step(dt, ctx) {
      // Capped short of 1: a fully inverted realm turns every light to its complement.
      ctx.state.inversion = Math.min(0.85, clamp01((telemetry().memUsed - 0.55) / 0.4));
    },
    sample(ctx) {
      const s = ctx.state;
      const m = telemetry();
      const size = 4 + 10 * s.inversion;
      return [{
        type: 'shadow_inversion',
        id: 'shadow',
        payload: {
          inversion: r4(s.inversion),
          depth: r4(clamp01(m.memUsed)),
          threshold: r4(clamp01(0.5 - 0.3 * s.coherence)),
          pulse: r4(1 - s.heartPulse),
          extent: v3(size, size, size),
          position: v3(0, 0, -10),
          mirror_of: 'heart',
        },
      }];
    },
  };
}
