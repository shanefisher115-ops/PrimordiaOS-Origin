// FateWeave — braided threads on a loom. Threads are born, fray, are severed
// and replaced, which exercises dynamic ribbon creation/destruction in Unreal.
import { mulberry32, noise1, clamp01, hsvToRgb, r4, subSeed } from '../prng.js';

const POINTS = 24;
const LOOM_HALF_LENGTH = 20;
const LOOM_CENTER = [0, 18, 10];
const SEVERED_LINGER = 2.5; // seconds a severed thread keeps streaming so Unreal can fade it

export function create(seed) {
  const rng = mulberry32(subSeed(seed, 'fate_weave'));
  let nextId = 0;
  let threads = [];
  let loomSpeed = 0.6;

  const spin = () => ({
    id: `thread-${nextId++}`,
    hue: rng(),
    phase0: rng() * Math.PI * 2,
    radius: 1.2 + rng() * 2.4,
    age: 0,
    life: 20 + rng() * 40,
    severedAt: null,
  });

  return {
    name: 'FateWeave',
    stream: 'fate_weave',
    hz: 30,
    init(ctx) {
      for (let i = 0; i < 6; i++) threads.push(spin());
    },
    step(dt, ctx) {
      const s = ctx.state;
      loomSpeed = 0.3 + 0.9 * s.resonance;
      for (const th of threads) {
        th.age += dt;
        if (th.severedAt === null && th.age > th.life) th.severedAt = th.age;
      }
      threads = threads.filter((th) => th.severedAt === null || th.age - th.severedAt < SEVERED_LINGER);
      const want = 5 + Math.round(s.entropy * 6);
      while (threads.filter((th) => th.severedAt === null).length < want) threads.push(spin());
    },
    sample(ctx) {
      const s = ctx.state;
      const t = ctx.t;
      const count = threads.length;
      const out = threads.map((th, idx) => {
        const fate = th.severedAt !== null ? 'severed' : th.age > th.life * 0.75 ? 'frayed' : 'bound';
        const fray = fate === 'bound' ? 0 : fate === 'frayed' ? 0.6 : 1.5;
        const points = [];
        for (let k = 0; k < POINTS; k++) {
          const u = k / (POINTS - 1);
          const x = (u * 2 - 1) * LOOM_HALF_LENGTH;
          const a = th.phase0 + x * 0.35 + t * loomSpeed + (idx / count) * Math.PI * 2;
          const n = fray * noise1(t * 2 + k * 0.7, seed ^ (idx * 7919));
          points.push([
            r4(LOOM_CENTER[0] + x),
            r4(LOOM_CENTER[1] + (th.radius + n) * Math.cos(a)),
            r4(LOOM_CENTER[2] + (th.radius + n) * Math.sin(a)),
          ]);
        }
        return {
          id: th.id,
          points,
          tension: r4(clamp01(s.coherence - fray * 0.3)),
          color: hsvToRgb(th.hue, 0.7, 2.0),
          width: r4(0.08 + 0.12 * s.coherence),
          fate,
        };
      });
      return [
        {
          type: 'fate_weave',
          id: 'weave',
          payload: { loom_speed: r4(loomSpeed), weave_density: r4(clamp01(count / 12)), threads: out },
        },
      ];
    },
  };
}
