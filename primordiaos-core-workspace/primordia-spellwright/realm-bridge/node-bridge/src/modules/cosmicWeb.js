// CosmicWeb — the resonance graph. Node positions stream at 30 Hz; edges
// only travel when the topology revision changes (or on a keyframe), so a
// 500-node web costs ~25 KB/s instead of ~200 KB/s.
import { mulberry32, noise1, clamp01, r4, subSeed } from '../prng.js';
import { synthesizeTopology } from '../realm/topology.js';

const KEYFRAME_SECONDS = 2;

export function create(seed) {
  const rng = mulberry32(subSeed(seed, 'cosmic_web.rewire'));
  let graph = { nodes: [], edges: [] };
  let topoKey = '';
  let rev = 0;
  let lastSentRev = -1;
  let sinceKeyframe = KEYFRAME_SECONDS;
  let sinceRewire = 0;
  let center = [0, 0, 22];
  let radius = 18;
  let kinds = [];

  function rebuild(manifest) {
    const topo = manifest.topology;
    graph = synthesizeTopology(topo, subSeed(manifest.seed, 'topology'));
    center = topo.center ?? center;
    radius = topo.radius;
    kinds = graph.nodes.map((_, i) => (i % 11 === 0 ? 'nexus' : i % 4 === 0 ? 'star' : 'mote'));
    rev++;
  }

  return {
    name: 'CosmicWeb',
    stream: 'cosmic_web',
    hz: 30,
    init() {},
    step(dt, ctx) {
      const m = ctx.manifest;
      if (!m) return;
      const key = `${m.realm_id}:${m.seed}:${JSON.stringify(m.topology)}`;
      if (key !== topoKey) {
        topoKey = key;
        rebuild(m);
      }
      sinceKeyframe += dt;
      sinceRewire += dt;
      // Entropy rewires the web: every ~20s at entropy 0.5, faster when higher.
      if (graph.edges.length && sinceRewire > 10 / Math.max(0.1, ctx.state.entropy)) {
        sinceRewire = 0;
        const n = graph.nodes.length;
        const count = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < count; i++) {
          const e = graph.edges[Math.floor(rng() * graph.edges.length)];
          const b = Math.floor(rng() * n);
          if (b !== e[0]) e[1] = b;
        }
        rev++;
      }
    },
    sample(ctx, { full = false } = {}) {
      if (!graph.nodes.length) return [];
      const s = ctx.state;
      const t = ctx.t;
      const breathe = 1 + 0.04 * s.heartPulse;
      const nodes = graph.nodes.map((p, i) => {
        const wob = 0.6 * (1 + s.entropy);
        return {
          id: `n${i}`,
          p: [
            r4(center[0] + p[0] * breathe + wob * noise1(t * 0.3 + i, seed)),
            r4(center[1] + p[1] * breathe + wob * noise1(t * 0.3 + i, seed ^ 0x9e37)),
            r4(center[2] + p[2] * breathe + wob * noise1(t * 0.3 + i, seed ^ 0x79b9)),
          ],
          resonance: r4(clamp01(0.5 + 0.5 * Math.sin(t * (0.5 + (i % 7) * 0.13) + i) * s.resonance)),
          mass: r4(kinds[i] === 'nexus' ? 3 : kinds[i] === 'star' ? 1.6 : 1),
          kind: kinds[i],
        };
      });
      const payload = { rev, radius: r4(radius), nodes };
      if (full || rev !== lastSentRev || sinceKeyframe >= KEYFRAME_SECONDS) {
        payload.edges = graph.edges;
        if (!full) {
          lastSentRev = rev;
          sinceKeyframe = 0;
        }
      }
      return [{ type: 'cosmic_web', id: `web:${ctx.manifest.realm_id}`, payload }];
    },
  };
}
