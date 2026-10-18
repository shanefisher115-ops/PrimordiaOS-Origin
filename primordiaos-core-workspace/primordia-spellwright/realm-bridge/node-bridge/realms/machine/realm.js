// The processing layer: a PRS-1 realm built from the machine the bridge runs on.
//
//   ground       the wafer: smooth silicon, one terrace per cache level, a monolith
//                circle per logical core
//   lattice      the transistor grid of the die, inside the bus ring; it fills with RAM
//   spire_field  the cores as spires, as tall as the clock (MHz / 100 m); density = load
//   ring         the bus that ties it together, one keystone per hardware thread
//   void         the idle loop, a well above everything
//   sky          one star band of processes
//   glyphs       the soul is the host itself; a sigil per core ("ZERO CORE RUNS THE
//                THREADS"); a ward over memory; a gate for the bus. Each core's sigil grows,
//                heats and gains symmetry with that core's load.
//
// Structure comes from the hardware only (same machine, same realm); evolve() moves
// the live parts within PRS-1's bounded deltas.
import { hashString, clamp01, r4, v3 } from '../../src/prng.js';
import { snapshotMetaphysics } from '../../src/state.js';
import { machine, heatHue, hostWord } from './telemetry.js';

const NUMBER_WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN',
  'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN'];
const CORE_RING = 34;
const MAX_CORE_GLYPHS = 16;

const title = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

function layer(kind, order, altitude, radius, density, palette, params) {
  return { id: `${kind}-${order}`, kind, order, altitude, radius, density: r4(density), palette, params };
}

// The die (lattice) sits inside the bus ring and never fills completely, so the
// cores and the process web stay readable even with RAM nearly exhausted.
const latticeDensity = (tel) => r4(clamp01(0.15 + 0.6 * tel.memUsed));
const spireDensity = (tel) => r4(clamp01(0.1 + 0.4 * tel.load));

/** Moves a toward b by at most step (PRS-1 bounded deltas). */
const toward = (a, b, step) => r4(a + Math.max(-step, Math.min(step, b - a)));

function coreGlyph(i, load) {
  const a = Math.PI / 4 + (i / machine.logical) * Math.PI * 2;
  return {
    id: `core-${i}`,
    kind: 'sigil',
    position: v3(Math.cos(a) * CORE_RING, Math.sin(a) * CORE_RING, 9),
    scale: r4(4 + 4 * load),
    symmetry: 3 + Math.round(9 * load),
    complexity: r4(clamp01(0.2 + 0.8 * load)),
    hue: r4(heatHue(load)),
    // The number leads so its letters are written before the shared words use up the
    // consonants: every core (0-15) reduces to a different monogram.
    intent: `${NUMBER_WORDS[i] ?? i} CORE RUNS THE THREADS`,
  };
}

export function machineGenesis(state, tel) {
  const host = hostWord();
  const seed = hashString(`${machine.host}|${machine.cpuModel}|${machine.logical}`);
  const cores = Math.min(machine.logical, MAX_CORE_GLYPHS);
  const layers = [
    layer('ground', 0, 0, 120, 0.5, [[0.09, 0.11, 0.15], [0.02, 0.03, 0.05]],
      { roughness: 0.06, terrace_count: 3, monolith_clusters: cores, cluster_spread: 6, rubble: 0.04 }),
    layer('lattice', 1, 2, 44, latticeDensity(tel), [[0.2, 0.85, 1.0], [0.0, 0.18, 0.4]],
      { cell_size: 10, struts: 0.9 }),
    layer('spire_field', 2, 0, 40, spireDensity(tel), [[1.0, 0.55, 0.15], [0.3, 0.05, 0.0]],
      { max_height: r4(machine.maxMHz / 100), spire_clusters: cores, falloff: 3 }),
    layer('ring', 3, 22, 48, 0.85, [[0.62, 0.32, 1.0], [0.1, 0.0, 0.3]],
      { thickness: 3, tilt_deg: 0, keystones: machine.logical * 2, gap_count: 0, arc: 1 }),
    layer('void', 4, 60, 24, 0.4, [[0.06, 0.0, 0.12], [0.0, 0.0, 0.0]],
      { aperture: 0.35, debris: 0.1 }),
    layer('sky', 5, 80, 180, 0.65, [[0.55, 0.75, 1.0], [0.0, 0.01, 0.05]],
      { star_count: 1800, band_strength: 0.85, band_tilt_deg: 12 }),
  ];

  const glyphs = [
    {
      id: 'soul', kind: 'soul', position: v3(0, 0, 14), scale: 6,
      symmetry: Math.min(64, machine.logical * 2), complexity: 0.5, hue: 0.55, bound_to: 'soul',
      // The machine's own name is the soul's crown.
      intent: host,
    },
    ...Array.from({ length: cores }, (_, i) => coreGlyph(i, tel.cores[i]?.load ?? 0)),
    {
      id: 'memory', kind: 'ward', position: v3(40, 0, 12), scale: 5, symmetry: 9, complexity: 0.6,
      hue: 0.72, intent: `GUARD THE MEMORY OF ${host}`,
    },
    {
      id: 'bus', kind: 'gate', position: v3(-40, 0, 12), scale: 6, symmetry: 6, complexity: 0.5,
      hue: 0.08, intent: `OPEN THE BUS OF ${host}`,
    },
  ];

  return {
    prs: '1.0',
    realm_id: `realm-${seed.toString(16).padStart(8, '0')}`,
    realm_name: `${title(host)} Crucible`,
    seed,
    revision: 0,
    transition_seconds: 2,
    generated_by: { module: 'Worldforge', at: new Date().toISOString(), machine: `${machine.host} / ${machine.cpuModel}` },
    units: { length: 'meter', up: '+Z', handedness: 'left' },
    bounds: { radius: 120 },
    layers,
    metaphysics: snapshotMetaphysics(state),
    // The live process graph (cosmicWeb.js) is authoritative; this spec only seeds it.
    topology: { kind: 'scale_free', node_count: 48, edge_density: 0.5, radius: 18, center: [0, 0, 22] },
    glyphs,
  };
}

export function machineEvolve(prev, state, tel) {
  const next = structuredClone(prev);
  next.revision = prev.revision + 1;
  next.generated_by = { ...prev.generated_by, at: new Date().toISOString() };
  next.metaphysics = snapshotMetaphysics(state);
  for (const l of next.layers) {
    if (l.kind === 'lattice') l.density = toward(l.density, latticeDensity(tel), 0.05);
    if (l.kind === 'spire_field') l.density = toward(l.density, spireDensity(tel), 0.05);
  }
  for (const g of next.glyphs) {
    const m = /^core-(\d+)$/.exec(g.id);
    if (m) Object.assign(g, coreGlyph(+m[1], tel.cores[+m[1]]?.load ?? 0));
    if (g.id === 'memory') g.complexity = r4(clamp01(tel.memUsed));
  }
  const soul = next.glyphs.find((g) => g.kind === 'soul');
  if (soul) soul.complexity = r4(clamp01(0.3 + tel.load));
  return next;
}
