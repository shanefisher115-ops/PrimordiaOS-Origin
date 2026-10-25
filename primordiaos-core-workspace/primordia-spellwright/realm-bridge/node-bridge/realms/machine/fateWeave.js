// FateWeave (machine): one thread per logical core on the loom. Each spins as
// fast as its core works, widens and heats with load, and frays when the core is
// pinned. While traffic flows, two thin outer threads carry the network: in and out.
import { noise1, clamp01, hsvToRgb, r4 } from '../../src/prng.js';
import { telemetry, heatHue } from './telemetry.js';

const POINTS = 28;
const LOOM_HALF_LENGTH = 20;
const LOOM_CENTER = [0, 18, 10];
const NET_THREAD_MIN_BYTES = 5_000;

export function create(seed) {
  const phases = [];
  const netPhase = [0, Math.PI];

  const helix = (phase, radius, twist, fray, salt, t) => {
    const points = [];
    for (let k = 0; k < POINTS; k++) {
      const x = ((k / (POINTS - 1)) * 2 - 1) * LOOM_HALF_LENGTH;
      const a = phase + x * twist;
      const n = fray * noise1(t * 3 + k * 0.7, seed ^ salt);
      points.push([
        r4(LOOM_CENTER[0] + x),
        r4(LOOM_CENTER[1] + (radius + n) * Math.cos(a)),
        r4(LOOM_CENTER[2] + (radius + n) * Math.sin(a)),
      ]);
    }
    return points;
  };

  return {
    name: 'FateWeave',
    stream: 'fate_weave',
    hz: 30,
    init() {},
    step(dt) {
      const m = telemetry();
      m.cores.forEach((c, i) => {
        phases[i] = (phases[i] ?? (i / m.cores.length) * Math.PI * 2) + dt * (0.3 + 7 * c.load);
      });
      netPhase[0] += dt * (0.5 + Math.log10(1 + m.netRx / 1e4));
      netPhase[1] -= dt * (0.5 + Math.log10(1 + m.netTx / 1e4));
    },
    sample(ctx) {
      const m = telemetry();
      const t = ctx.t;
      const threads = m.cores.map((c, i) => {
        const load = clamp01(c.load);
        const pinned = load > 0.9;
        return {
          id: `core-${i}`,
          points: helix(phases[i] ?? 0, 0.8 + 2.6 * load, 0.25 + 0.35 * load, pinned ? 0.8 : 0.1 * load, i * 7919, t),
          tension: r4(clamp01(0.3 + 0.7 * (1 - load))),
          color: hsvToRgb(heatHue(load), 0.75, 1.2 + 2.8 * load),
          width: r4(0.05 + 0.25 * load),
          fate: pinned ? 'frayed' : 'bound',
        };
      });
      [['net-rx', m.netRx, 0.5], ['net-tx', m.netTx, 0.86]].forEach(([id, bytes, hue], j) => {
        if (bytes < NET_THREAD_MIN_BYTES) return;
        const flow = clamp01(Math.log10(bytes / NET_THREAD_MIN_BYTES) / 3);
        threads.push({
          id,
          points: helix(netPhase[j], 4.2, 0.12, 0.05, 0x51 + j, t),
          tension: 0.9,
          color: hsvToRgb(hue, 0.6, 1 + 2 * flow),
          width: r4(0.03 + 0.08 * flow),
          fate: 'bound',
        });
      });
      return [{
        type: 'fate_weave',
        id: 'weave',
        payload: { loom_speed: r4(0.3 + 1.5 * m.load), weave_density: r4(clamp01(threads.length / 12)), threads },
      }];
    },
  };
}
