// Soul — unification. Fragments orbit the central glyph and merge as unity
// rises; the glyph's symmetry grows with unity.
import { clamp01, hsvToRgb, lerp, r4, v3 } from '../prng.js';

export function create() {
  let unity = 0.3;
  return {
    name: 'Soul',
    stream: 'soul_unification',
    hz: 30,
    init() {},
    step(dt, ctx) {
      const s = ctx.state;
      unity = clamp01(lerp(unity, (s.coherence + s.awareness) / 2, Math.min(1, dt * 0.2)));
    },
    sample(ctx) {
      const s = ctx.state;
      const count = Math.round(3 + (1 - unity) * 9);
      const fragments = [];
      for (let i = 0; i < count; i++) {
        const base = (i / count) * Math.PI * 2;
        fragments.push({
          id: `frag-${i}`,
          angle: r4(base + ctx.t * (0.2 + 0.05 * i)),
          radius: r4(2 + (1 - unity) * 6),
          essence: hsvToRgb(0.55 + i / (count * 4), 0.6, 1.2),
        });
      }
      return [
        {
          type: 'soul_unification',
          id: 'soul',
          payload: {
            unity: r4(unity),
            position: v3(0, 0, 14),
            fragments,
            glyph: {
              symmetry: 3 + Math.floor(unity * 9),
              complexity: r4(0.3 + 0.7 * s.lucidity),
              rotation_speed: r4(0.1 + 0.4 * s.resonance),
              hue: r4((0.6 + 0.15 * unity) % 1),
            },
          },
        },
      ];
    },
  };
}
