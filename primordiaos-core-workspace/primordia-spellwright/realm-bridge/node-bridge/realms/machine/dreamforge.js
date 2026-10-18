// Dreamforge (machine): memory and traffic as weather.
//   dream:memory     one standing nebula; it thickens and spreads as RAM fills
//   dream:packet-<n> a transient cloud for each burst of network traffic, as dense
//                    as the burst is heavy, retired when it passes
import { mulberry32, clamp01, hsvToRgb, r4, v3, subSeed } from '../../src/prng.js';
import { telemetry } from './telemetry.js';

const BURST_BYTES_PER_S = 150_000;

export function create(seed) {
  const rng = mulberry32(subSeed(seed, 'machine.packets'));
  let clouds = [];
  let retired = [];
  let next = 0;
  let sinceSpawn = 0;

  const nebula = (pos, extent, hues, t, s, density, turbulence) => ({
    density: r4(clamp01(density)),
    turbulence: r4(clamp01(turbulence)),
    noise_scale: r4(0.04 + 0.04 * (1 - s.lucidity)),
    drift: v3(Math.cos(t * 0.07) * 0.8, Math.sin(t * 0.07) * 0.8, 0.2),
    palette: [hsvToRgb(hues[0], 0.65, 1.4), hsvToRgb(hues[1], 0.55, 0.6)],
    lucidity: r4(s.lucidity),
    extent: v3(...extent),
    position: v3(...pos),
  });

  return {
    name: 'Dreamforge',
    stream: 'dream_nebula',
    hz: 30,
    init() {},
    step(dt) {
      const m = telemetry();
      sinceSpawn += dt;
      for (const c of clouds) c.age += dt;
      for (const c of clouds) if (c.age > c.life) retired.push(c.id);
      clouds = clouds.filter((c) => c.age <= c.life);
      const traffic = m.netRx + m.netTx;
      if (traffic > BURST_BYTES_PER_S && sinceSpawn > 2.5 && clouds.length < 4) {
        sinceSpawn = 0;
        const a = rng() * Math.PI * 2;
        clouds.push({
          id: `dream:packet-${next++}`,
          pos: [Math.cos(a) * 50, Math.sin(a) * 50, 14 + rng() * 18],
          rx: m.netRx >= m.netTx, // inbound clouds run cyan, outbound magenta
          weight: clamp01(Math.log10(traffic / BURST_BYTES_PER_S + 1)),
          age: 0,
          life: 6 + rng() * 6,
        });
      }
    },
    sample(ctx) {
      const s = ctx.state;
      const t = ctx.t;
      const m = telemetry();
      const spread = 18 + 22 * m.memUsed;
      const out = [{
        type: 'dream_nebula',
        id: 'dream:memory',
        payload: nebula([0, -42, 18], [spread, spread, 10 + 8 * m.memUsed], [0.62, 0.78], t, s, 0.15 + 0.7 * m.memUsed, 0.2 + 0.6 * m.churn),
      }];
      for (const c of clouds) {
        const fade = Math.min(1, c.age / 1.5, (c.life - c.age) / 2.5);
        const hues = c.rx ? [0.5, 0.58] : [0.86, 0.92];
        out.push({ type: 'dream_nebula', id: c.id, payload: nebula(c.pos, [9, 9, 7], hues, t, s, (0.25 + 0.5 * c.weight) * fade, 0.7) });
      }
      for (const id of retired) out.push({ type: 'dream_nebula', id, op: 'retire', payload: {} });
      retired = [];
      return out;
    },
  };
}
