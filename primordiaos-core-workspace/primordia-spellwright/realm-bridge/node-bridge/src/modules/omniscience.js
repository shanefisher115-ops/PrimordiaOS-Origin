// Omniscience — the panorama. Watches every other scalar and moves the
// slow, global quantities (entropy, luminosity, lucidity, awareness).
// Emits no packet; its output is the metaphysics block of the manifest.
import { noise1, clamp01, lerp } from '../prng.js';

export function create(seed) {
  return {
    name: 'Omniscience',
    stream: null,
    hz: 0,
    init() {},
    step(dt, ctx) {
      const s = ctx.state;
      const t = ctx.t;
      s.entropy = clamp01(0.4 + 0.35 * noise1(t * 0.021, seed ^ 0x1));
      s.luminosity = clamp01(0.65 + 0.3 * noise1(t * 0.017, seed ^ 0x2) - 0.2 * s.inversion);
      s.lucidity = clamp01(0.5 + 0.4 * noise1(t * 0.013, seed ^ 0x3));
      const target = (s.coherence + s.lucidity + (1 - s.entropy)) / 3;
      s.awareness = lerp(s.awareness, target, Math.min(1, dt * 0.5));
    },
    sample() {
      return [];
    },
  };
}
