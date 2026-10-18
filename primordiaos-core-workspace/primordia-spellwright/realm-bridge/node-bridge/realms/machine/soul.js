// Soul (machine): the machine's self. The six hungriest processes orbit it, closer
// and faster the more CPU they take. Its unity is how evenly the cores share the
// work. Its crown is inscribed with whatever program has dominated the CPU for the
// last few seconds, and falls back to the host's own name when nothing does.
import { clamp01, hashString, hsvToRgb, lerp, r4, v3 } from '../../src/prng.js';
import { telemetry, heatHue, hostWord, machine } from './telemetry.js';

const ORBITERS = 6;
const DOMINANT_MIN_CPU = 0.02;
const DOMINANT_HOLD_S = 6;
const NOT_WORK = new Set(['System', 'Registry', 'Idle', 'Memory Compression', 'Secure System']);

export function create() {
  let unity = 0.5;
  let intent = hostWord();
  let candidate = '';
  let candidateFor = 0;
  let top = [];
  const angles = new Map();

  return {
    name: 'Soul',
    stream: 'soul_unification',
    hz: 30,
    init() {},
    step(dt) {
      const m = telemetry();
      unity = lerp(unity, clamp01(1 - 1.5 * m.imbalance - Math.max(0, m.load - 0.8)), Math.min(1, dt));
      top = m.procs.filter((p) => !NOT_WORK.has(p.name)).sort((a, b) => b.cpu - a.cpu).slice(0, ORBITERS);
      for (const p of top) {
        const a = angles.get(p.pid) ?? (hashString(String(p.pid)) / 2 ** 32) * Math.PI * 2;
        angles.set(p.pid, a + dt * (0.15 + 4 * p.cpu));
      }
      for (const pid of angles.keys()) if (!top.some((p) => p.pid === pid)) angles.delete(pid);

      // Re-inscribe only when a program has held the top spot for a while.
      const lead = top[0] && top[0].cpu >= DOMINANT_MIN_CPU ? top[0].name.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').trim() : hostWord();
      if (lead === candidate) candidateFor += dt;
      else { candidate = lead; candidateFor = 0; }
      if (candidateFor >= DOMINANT_HOLD_S && candidate) intent = candidate;
    },
    sample() {
      const m = telemetry();
      return [{
        type: 'soul_unification',
        id: 'soul',
        payload: {
          unity: r4(unity),
          position: v3(0, 0, 14),
          fragments: top.map((p) => ({
            id: `proc-${p.pid}`,
            angle: r4(angles.get(p.pid) ?? 0),
            radius: r4(2 + 7 * (1 - Math.min(1, p.cpu * 5))),
            essence: hsvToRgb(hashString(p.name) / 2 ** 32, 0.6, 1 + 2 * Math.min(1, p.cpu * 5)),
          })),
          glyph: {
            symmetry: Math.min(64, machine.logical * 2),
            complexity: r4(clamp01(0.3 + m.load)),
            rotation_speed: r4(0.1 + 1.4 * m.load),
            hue: r4(heatHue(m.load)),
            intent,
          },
        },
      }];
    },
  };
}
