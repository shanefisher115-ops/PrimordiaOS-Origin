// CosmicWeb (machine): the live process tree. Node 0 is the kernel; around it the
// busiest and largest processes, each joined to its parent (or to the kernel when
// its parent isn't shown) and to its same-named siblings. A process's distance from
// the centre is its hunger: the more CPU it takes, the closer it is drawn in.
// Mass is memory, glow is CPU, nexus nodes are the current top consumers.
import { clamp01, hashString, r4 } from '../../src/prng.js';
import { telemetry } from './telemetry.js';

const MAX_NODES = 48;
const KEYFRAME_SECONDS = 2;

export function create() {
  let version = -1;
  let rev = 0;
  let lastSentRev = -1;
  let sinceKeyframe = KEYFRAME_SECONDS;
  let edgeKey = '';
  let nodes = []; // { pid, name, dir, cur, cpu, memMB, kind }
  let edges = [];
  let center = [0, 0, 22];
  let radius = 18;

  const direction = (pid) => {
    const h1 = hashString(`a${pid}`) / 2 ** 32;
    const h2 = hashString(`b${pid}`) / 2 ** 32;
    const z = h2 * 2 - 1;
    const r = Math.sqrt(1 - z * z);
    return [r * Math.cos(h1 * Math.PI * 2), r * Math.sin(h1 * Math.PI * 2), z];
  };

  function rebuild(m) {
    const ranked = m.procs
      .map((p) => ({ ...p, score: p.cpu * 10 + Math.log10(p.memMB + 1) / 10 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_NODES - 1)
      .sort((a, b) => a.pid - b.pid); // stable order between samples
    const previous = new Map(nodes.map((n) => [n.pid, n.cur]));
    const byCpu = [...ranked].sort((a, b) => b.cpu - a.cpu);
    const hungry = new Set(byCpu.slice(0, 3).filter((p) => p.cpu > 0.02).map((p) => p.pid));
    nodes = [
      { pid: -1, name: 'kernel', dir: [0, 0, 0], cur: previous.get(-1) ?? [...center], cpu: m.load, memMB: 0, kind: 'nexus' },
      ...ranked.map((p) => ({
        pid: p.pid,
        name: p.name,
        dir: direction(p.pid),
        cur: previous.get(p.pid) ?? [...center],
        cpu: p.cpu,
        memMB: p.memMB,
        kind: hungry.has(p.pid) ? 'nexus' : p.cpu > 0.005 ? 'star' : 'mote',
      })),
    ];
    const index = new Map(nodes.map((n, i) => [n.pid, i]));
    edges = [];
    const lastOfName = new Map();
    nodes.forEach((n, i) => {
      if (i === 0) return;
      const parent = index.get(ranked[i - 1].ppid);
      edges.push(parent !== undefined && parent !== i ? [i, parent, 0.6] : [i, 0, 0.25]);
      const sibling = lastOfName.get(n.name);
      if (sibling !== undefined) edges.push([sibling, i, 0.3]);
      lastOfName.set(n.name, i);
    });
    const key = JSON.stringify([nodes.map((n) => n.pid), edges]);
    if (key !== edgeKey) {
      edgeKey = key;
      rev++;
    }
  }

  return {
    name: 'CosmicWeb',
    stream: 'cosmic_web',
    hz: 30,
    init() {},
    step(dt, ctx) {
      const m = telemetry();
      center = ctx.manifest?.topology?.center ?? center;
      radius = ctx.manifest?.topology?.radius ?? radius;
      if (m.procsVersion !== version && m.procs.length) {
        version = m.procsVersion;
        rebuild(m);
      }
      sinceKeyframe += dt;
      const ease = Math.min(1, dt * 1.5);
      nodes.forEach((n, i) => {
        const reach = i === 0 ? 0 : radius * (0.25 + 0.75 * (1 - Math.min(1, n.cpu * 8)));
        for (let k = 0; k < 3; k++) n.cur[k] += (center[k] + n.dir[k] * reach - n.cur[k]) * ease;
      });
      if (nodes[0]) nodes[0].cpu = m.load;
    },
    sample(ctx, { full = false } = {}) {
      if (!nodes.length) return [];
      const breathe = 1 + 0.04 * ctx.state.heartPulse;
      const payload = {
        rev,
        radius: r4(radius),
        nodes: nodes.map((n, i) => ({
          id: i === 0 ? 'kernel' : `p${n.pid}`,
          p: n.cur.map((c, k) => r4(center[k] + (c - center[k]) * breathe)),
          resonance: r4(clamp01(i === 0 ? n.cpu : 0.15 + n.cpu * 8)),
          mass: r4(i === 0 ? 3 : 1 + Math.log2(1 + n.memMB / 32)),
          kind: n.kind,
        })),
      };
      if (full || rev !== lastSentRev || sinceKeyframe >= KEYFRAME_SECONDS) {
        payload.edges = edges;
        if (!full) {
          lastSentRev = rev;
          sinceKeyframe = 0;
        }
      }
      return [{ type: 'cosmic_web', id: `web:${ctx.manifest.realm_id}`, payload }];
    },
  };
}
