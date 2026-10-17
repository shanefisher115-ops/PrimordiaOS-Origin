// Dreamforge — nebulae. One persistent primary nebula plus transient
// "reverie" nebulae that are spawned and explicitly retired (op: "retire"),
// exercising entity creation/destruction on the Unreal side.
import { mulberry32, noise1, clamp01, hsvToRgb, r4, v3, subSeed } from '../prng.js';

export function create(seed) {
  const rng = mulberry32(subSeed(seed, 'dreamforge'));
  let reveries = [];
  let retired = [];
  let nextReverie = 0;
  let sinceSpawn = 0;

  const nebula = (pos, extent, hueShift, t, s, density) => ({
    density: r4(density),
    turbulence: r4(clamp01(0.2 + 0.7 * s.entropy)),
    noise_scale: r4(0.04 + 0.04 * (1 - s.lucidity)),
    drift: v3(Math.cos(t * 0.05) * 0.6, Math.sin(t * 0.05) * 0.6, 0.15),
    palette: [hsvToRgb(0.72 + hueShift, 0.6, 1.4), hsvToRgb(0.9 + hueShift + 0.1 * s.lucidity, 0.5, 0.6)],
    lucidity: r4(s.lucidity),
    extent: v3(...extent),
    position: v3(...pos),
  });

  return {
    name: 'Dreamforge',
    stream: 'dream_nebula',
    hz: 30,
    init() {},
    step(dt, ctx) {
      sinceSpawn += dt;
      for (const r of reveries) r.age += dt;
      for (const r of reveries) if (r.age > r.life) retired.push(r.id);
      reveries = reveries.filter((r) => r.age <= r.life);
      if (sinceSpawn > 8 && reveries.length < 3 && rng() < ctx.state.lucidity) {
        sinceSpawn = 0;
        const a = rng() * Math.PI * 2;
        reveries.push({
          id: `dream:reverie-${nextReverie++}`,
          pos: [Math.cos(a) * 45, Math.sin(a) * 45, 10 + rng() * 20],
          hue: rng() * 0.3,
          age: 0,
          life: 12 + rng() * 18,
        });
      }
    },
    sample(ctx) {
      const s = ctx.state;
      const t = ctx.t;
      const out = [
        {
          type: 'dream_nebula',
          id: 'dream:primary',
          payload: nebula([0, -38, 20], [30, 30, 16], 0, t, s, clamp01(0.35 + 0.4 * s.lucidity + 0.1 * noise1(t * 0.2, seed))),
        },
      ];
      for (const r of reveries) {
        // Fade in over the first 2s and out over the last 3s.
        const fade = Math.min(1, r.age / 2, (r.life - r.age) / 3);
        out.push({ type: 'dream_nebula', id: r.id, payload: nebula(r.pos, [10, 10, 8], r.hue, t, s, clamp01(0.5 * fade)) });
      }
      for (const id of retired) out.push({ type: 'dream_nebula', id, op: 'retire', payload: {} });
      retired = [];
      return out;
    },
  };
}
