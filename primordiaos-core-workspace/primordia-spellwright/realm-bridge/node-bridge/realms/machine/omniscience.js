// Omniscience (machine): the realm's metaphysics read straight off the hardware.
//
//   resonance   total CPU load                      coherence  how evenly the cores share it
//   entropy     imbalance + process churn + load    luminosity activity
//   lucidity    free memory                          awareness  the slow blend of the above
//   essence     cool cyan when idle -> amber -> red under load (written by Heart)
import { clamp01, lerp } from '../../src/prng.js';
import { telemetry } from './telemetry.js';

export function create() {
  return {
    name: 'Omniscience',
    stream: null,
    hz: 0,
    init() {},
    step(dt, ctx) {
      const s = ctx.state;
      const m = telemetry();
      const fast = Math.min(1, dt * 2);
      const slow = Math.min(1, dt * 0.5);
      s.resonance = lerp(s.resonance, clamp01(m.load), fast);
      s.coherence = lerp(s.coherence, clamp01(1 - m.imbalance), fast);
      s.entropy = lerp(s.entropy, clamp01(0.1 + 0.45 * m.imbalance + 0.6 * m.churn + 0.35 * m.load), slow);
      s.luminosity = lerp(s.luminosity, clamp01(0.35 + 0.65 * m.load), fast);
      s.lucidity = lerp(s.lucidity, clamp01(1 - m.memUsed), slow);
      s.awareness = lerp(s.awareness, (s.coherence + s.lucidity + (1 - s.entropy)) / 3, slow);
    },
    sample() {
      return [];
    },
  };
}
