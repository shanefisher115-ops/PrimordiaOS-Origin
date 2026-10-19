// Silhouette descriptors for the judge's variety check. Pure CPU, deterministic, no GPU involved.
// Three orthographic masks of the closed solid (front: X-Z, side: Y-Z, top: X-Y; kernel Z up), each scaled
// so the projection's longer side fills the grid (shape, not size), packed as bits -> base64.
export const GRID = 32;
const VIEWS = [[0, 2], [1, 2], [0, 1]]; // (u, v) axes per view

/** @param {{ positions: Float32Array, triangles: Uint32Array }} solid */
export function silhouette(solid, S = GRID) {
  const P = solid.positions, T = solid.triangles;
  const bytesPerView = (S * S) / 8;
  const out = new Uint8Array(bytesPerView * VIEWS.length);
  VIEWS.forEach(([a, b], view) => {
    let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
    for (let i = 0; i < P.length; i += 3) {
      const u = P[i + a], v = P[i + b];
      if (u < minU) minU = u; if (u > maxU) maxU = u;
      if (v < minV) minV = v; if (v > maxV) maxV = v;
    }
    const span = Math.max(maxU - minU, maxV - minV, 1e-9);
    const scale = (S - 1) / span;
    const offU = (S - (maxU - minU) * scale) / 2, offV = (S - (maxV - minV) * scale) / 2;
    const px = (i) => (P[i + a] - minU) * scale + offU;
    const py = (i) => (P[i + b] - minV) * scale + offV;
    const base = view * bytesPerView;
    for (let t = 0; t < T.length; t += 3) {
      const i0 = T[t] * 3, i1 = T[t + 1] * 3, i2 = T[t + 2] * 3;
      const x0 = px(i0), y0 = py(i0), x1 = px(i1), y1 = py(i1), x2 = px(i2), y2 = py(i2);
      const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      if (Math.abs(area) < 1e-12) continue; // edge-on in this view
      const sgn = area > 0 ? 1 : -1;
      const cx0 = Math.max(0, Math.floor(Math.min(x0, x1, x2))), cx1 = Math.min(S - 1, Math.ceil(Math.max(x0, x1, x2)));
      const cy0 = Math.max(0, Math.floor(Math.min(y0, y1, y2))), cy1 = Math.min(S - 1, Math.ceil(Math.max(y0, y1, y2)));
      for (let y = cy0; y <= cy1; y++) {
        const sy = y + 0.5;
        for (let x = cx0; x <= cx1; x++) {
          const sx = x + 0.5;
          const w0 = sgn * ((x1 - sx) * (y2 - sy) - (x2 - sx) * (y1 - sy));
          const w1 = sgn * ((x2 - sx) * (y0 - sy) - (x0 - sx) * (y2 - sy));
          const w2 = sgn * ((x0 - sx) * (y1 - sy) - (x1 - sx) * (y0 - sy));
          if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
            const bit = (S - 1 - y) * S + x; // row 0 at the top
            out[base + (bit >> 3)] |= 1 << (bit & 7);
          }
        }
      }
    }
  });
  return Buffer.from(out).toString('base64');
}

const POP = new Uint8Array(256).map((_, i) => { let c = 0; for (let v = i; v; v >>= 1) c += v & 1; return c; });

/** 1 - mean IoU over the views: 0 = same silhouette, 1 = nothing in common. */
export function distance(a, b) {
  const A = Buffer.from(a, 'base64'), B = Buffer.from(b, 'base64');
  if (A.length !== B.length) return 1;
  const per = A.length / VIEWS.length;
  let sum = 0;
  for (let v = 0; v < VIEWS.length; v++) {
    let inter = 0, union = 0;
    for (let i = v * per; i < (v + 1) * per; i++) { inter += POP[A[i] & B[i]]; union += POP[A[i] | B[i]]; }
    sum += union === 0 ? 1 : inter / union;
  }
  return 1 - sum / VIEWS.length;
}

/** Variety of `sig` against a catalog: the distance to the nearest entry (null when the catalog is empty). */
export function variety(sig, catalog) {
  let best = null, nearest = null;
  for (const entry of catalog) {
    if (!entry.silhouette) continue;
    const d = distance(sig, entry.silhouette);
    if (best === null || d < best) { best = d; nearest = entry.name; }
  }
  return { variety: best === null ? null : +best.toFixed(4), nearest };
}

/** ASCII art of one view, for logs and debugging. */
export function ascii(sig, view = 0, S = GRID) {
  const bytes = Buffer.from(sig, 'base64');
  const base = view * (S * S) / 8;
  const rows = [];
  for (let y = 0; y < S; y++) {
    let row = '';
    for (let x = 0; x < S; x++) { const bit = y * S + x; row += bytes[base + (bit >> 3)] & (1 << (bit & 7)) ? '#' : '.'; }
    rows.push(row);
  }
  return rows.join('\n');
}
