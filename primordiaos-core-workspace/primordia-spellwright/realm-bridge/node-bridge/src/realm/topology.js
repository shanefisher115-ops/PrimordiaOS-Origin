// PRS-1 §4.4 topology synthesis. Ported 1:1 to C++ in
// PrimordiaTopology.cpp so that a realm rendered offline (no live
// cosmic_web stream) has the same graph as one rendered live.
// Positions are meters, relative to topology.center.
import { mulberry32 } from '../prng.js';

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function fibonacciSphere(i, n, radius) {
  const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN * i;
  return [Math.cos(theta) * r * radius, Math.sin(theta) * r * radius, y * radius];
}

export function synthesizeTopology(topology, seed) {
  const n = Math.max(1, topology.node_count | 0);
  const R = topology.radius;
  const density = topology.edge_density;
  const rng = mulberry32(seed);
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const addEdge = (a, b, w) => {
    if (a === b || a < 0 || b < 0 || a >= n || b >= n) return;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push([Math.min(a, b), Math.max(a, b), Math.round(w * 10000) / 10000]);
  };

  switch (topology.kind) {
    case 'lattice': {
      const side = Math.ceil(Math.cbrt(n));
      const step = side > 1 ? (2 * R) / (side - 1) : 0;
      for (let i = 0; i < n; i++) {
        const x = i % side, y = Math.floor(i / side) % side, z = Math.floor(i / (side * side));
        nodes.push([x * step - R, y * step - R, z * step - R]);
      }
      for (let i = 0; i < n; i++) {
        const x = i % side, y = Math.floor(i / side) % side;
        if (x + 1 < side) addEdge(i, i + 1, 1);
        if (y + 1 < side) addEdge(i, i + side, 1);
        addEdge(i, i + side * side, 1);
      }
      break;
    }
    case 'toroidal': {
      const ring = Math.max(3, Math.round(Math.sqrt(n)));
      const minor = R / 3;
      for (let i = 0; i < n; i++) {
        const u = ((i % ring) / ring) * Math.PI * 2;
        const v = (Math.floor(i / ring) / Math.ceil(n / ring)) * Math.PI * 2;
        nodes.push([(R + minor * Math.cos(u)) * Math.cos(v), (R + minor * Math.cos(u)) * Math.sin(v), minor * Math.sin(u)]);
      }
      for (let i = 0; i < n; i++) {
        addEdge(i, Math.floor(i / ring) * ring + ((i + 1) % ring), 1);
        addEdge(i, (i + ring) % n, 1);
      }
      break;
    }
    case 'fractal_tree': {
      for (let i = 0; i < n; i++) {
        if (i === 0) { nodes.push([0, 0, -R]); continue; }
        const parent = Math.floor((i - 1) / 3);
        const depth = Math.floor(Math.log(2 * i + 1) / Math.log(3));
        const branch = (i - 1) % 3;
        const spread = R / (depth + 1);
        const angle = (branch / 3) * Math.PI * 2 + depth * 0.7 + rng() * 0.4;
        const p = nodes[parent];
        nodes.push([p[0] + Math.cos(angle) * spread, p[1] + Math.sin(angle) * spread, p[2] + (2 * R) / 6]);
        addEdge(parent, i, 1 / (depth + 1));
      }
      break;
    }
    case 'scale_free': {
      for (let i = 0; i < n; i++) nodes.push(fibonacciSphere(i, n, R * (0.8 + 0.4 * rng())));
      const degree = new Array(n).fill(0);
      const m = 1 + Math.round(density * 3);
      for (let i = 1; i < n; i++) {
        const total = degree.slice(0, i).reduce((a, b) => a + b, 0) + i;
        for (let k = 0; k < Math.min(m, i); k++) {
          let pick = rng() * total;
          let j = 0;
          for (; j < i - 1; j++) { pick -= degree[j] + 1; if (pick <= 0) break; }
          const before = edges.length;
          addEdge(i, j, 0.5 + 0.5 * rng());
          if (edges.length > before) { degree[i]++; degree[j]++; }
        }
      }
      break;
    }
    case 'small_world':
    default: {
      for (let i = 0; i < n; i++) nodes.push(fibonacciSphere(i, n, R));
      const k = 2;
      const rewire = density * 0.3;
      for (let i = 0; i < n; i++) {
        for (let d = 1; d <= k; d++) {
          const target = rng() < rewire ? Math.floor(rng() * n) : (i + d) % n;
          addEdge(i, target, 0.4 + 0.6 * rng());
        }
      }
      break;
    }
  }
  return { nodes, edges };
}
