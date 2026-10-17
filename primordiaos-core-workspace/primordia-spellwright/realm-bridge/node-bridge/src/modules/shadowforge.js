// Shadowforge — the inversion. A negative-space mirror of the Heart, below
// the ground plane, whose strength tracks entropy against luminosity.
import { clamp01, r4, v3 } from '../prng.js';

export function create() {
  return {
    name: 'Shadowforge',
    stream: 'shadow_inversion',
    hz: 30,
    init() {},
    step(dt, ctx) {
      const s = ctx.state;
      s.inversion = clamp01(0.6 * s.entropy + 0.4 * (1 - s.luminosity));
    },
    sample(ctx) {
      const s = ctx.state;
      return [
        {
          type: 'shadow_inversion',
          id: 'shadow',
          payload: {
            inversion: r4(s.inversion),
            depth: r4(clamp01(0.3 + 0.6 * s.entropy)),
            threshold: r4(clamp01(0.5 - 0.3 * s.coherence)),
            pulse: r4(1 - s.heartPulse),
            extent: v3(8, 8, 8),
            position: v3(0, 0, -10),
            mirror_of: 'heart',
          },
        },
      ];
    },
  };
}
