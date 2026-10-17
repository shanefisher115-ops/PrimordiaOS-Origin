// Deterministic randomness and small math helpers shared by every module.
// Everything that shapes a realm must come from a seeded stream so that the
// same seed reproduces the same realm on every machine (PRS-1 §4.1).

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a, 32-bit. Used to derive sub-seeds: seed ^ hashString("layer:sky").
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function subSeed(seed, label) {
  return (seed ^ hashString(label)) >>> 0;
}

// Smooth 1D value noise in [-1, 1]; cheap and deterministic per seed.
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const a = lattice(i, seed);
  const b = lattice(i + 1, seed);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

function lattice(i, seed) {
  let h = Math.imul(i ^ seed, 0x27d4eb2d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v) => clamp(v, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;

// Packets are rounded to keep them small; 4 decimals of a meter is 0.1 mm.
export const r4 = (v) => Math.round(v * 10000) / 10000;
export const v3 = (x, y, z) => [r4(x), r4(y), r4(z)];

export function hsvToRgb(h, s, v) {
  h = ((h % 1) + 1) % 1;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const [r, g, b] = [
    [v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q],
  ][i % 6];
  return [r4(r), r4(g), r4(b)];
}
