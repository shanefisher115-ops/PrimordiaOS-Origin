// Turns a model's realm design into a strict PRS-1 manifest. Mirror of
// PrimordiaOllamaRealm.cpp (RepairManifest); keep the two in step.
// Rules: unknown kinds are dropped, every number is clamped to its range,
// missing values take defaults, ids/order are assigned, exactly one soul glyph.

const LAYER_KINDS = ['ground', 'ocean', 'sky', 'ring', 'lattice', 'void', 'spire_field'];
const TOPOLOGY_KINDS = ['lattice', 'small_world', 'scale_free', 'toroidal', 'fractal_tree'];
const GLYPH_KINDS = ['soul', 'sigil', 'ward', 'gate'];
// [min, max, integer?]
const PARAM_RANGES = {
  roughness: [0, 1], terrace_count: [1, 12, true], wave_height: [0, 10], wave_speed: [0, 5],
  star_count: [0, 5000, true], thickness: [0.1, 50], tilt_deg: [-90, 90], cell_size: [1, 50],
  aperture: [0, 1], max_height: [1, 200],
  // Composition params (PRS-1 §3.3), all optional.
  monolith_clusters: [0, 24, true], cluster_spread: [1, 40], rubble: [0, 1],
  islet_count: [0, 32, true], band_strength: [0, 1], band_tilt_deg: [-90, 90],
  keystones: [0, 24, true], gap_count: [0, 6, true], arc: [0.05, 1],
  struts: [0, 1], spire_clusters: [1, 16, true], falloff: [0.25, 4], debris: [0, 1],
};
const KIND_PARAMS = {
  ground: ['roughness', 'terrace_count', 'monolith_clusters', 'cluster_spread', 'rubble'],
  ocean: ['wave_height', 'wave_speed', 'islet_count'],
  sky: ['star_count', 'band_strength', 'band_tilt_deg'],
  ring: ['thickness', 'tilt_deg', 'keystones', 'gap_count', 'arc'],
  lattice: ['cell_size', 'struts'],
  void: ['aperture', 'debris'],
  spire_field: ['max_height', 'spire_clusters', 'falloff'],
};
const META = { entropy: 0.35, luminosity: 0.7, coherence: 0.6, resonance: 0.5, inversion: 0.2, lucidity: 0.55 };

const r4 = (v) => Math.round(v * 10000) / 10000;

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export function repairManifest(raw, seedOverride = 0) {
  const repairs = [];
  const num = (v, def, lo, hi, what, int = false) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      if (what) repairs.push(`${what} defaulted`);
      return def;
    }
    let out = Math.min(hi, Math.max(lo, int ? Math.round(v) : v));
    if (what && out !== (int ? Math.round(v) : v)) repairs.push(`${what} clamped ${v}->${out}`);
    return int ? out : r4(out);
  };
  const color = (v, def, what) => {
    if (!Array.isArray(v) || v.length < 3 || !v.slice(0, 3).every((c) => typeof c === 'number' && Number.isFinite(c))) {
      if (what) repairs.push(`${what} defaulted`);
      return def;
    }
    return v.slice(0, 3).map((c) => r4(Math.min(2, Math.max(0, c))));
  };
  const vec = (v, def, what) => {
    if (!Array.isArray(v) || v.length < 3 || !v.slice(0, 3).every((c) => typeof c === 'number' && Number.isFinite(c))) {
      if (what) repairs.push(`${what} defaulted`);
      return def;
    }
    return [num(v[0], 0, -60, 60), num(v[1], 0, -60, 60), num(v[2], 0, -10, 60)];
  };
  raw = raw && typeof raw === 'object' ? raw : {};

  let realm_name = typeof raw.realm_name === 'string' ? raw.realm_name.trim().slice(0, 64) : '';
  if (!realm_name) { realm_name = 'Unnamed Realm'; repairs.push('realm_name defaulted'); }
  const seed = seedOverride > 0 ? seedOverride >>> 0 : fnv1a(realm_name);

  const m = raw.metaphysics && typeof raw.metaphysics === 'object' ? raw.metaphysics : {};
  const metaphysics = {};
  for (const [k, def] of Object.entries(META)) metaphysics[k] = num(m[k], def, 0, 1, `metaphysics.${k}`);
  metaphysics.time_dilation = num(m.time_dilation, 1, 0.25, 4, 'metaphysics.time_dilation');
  metaphysics.essence = color(m.essence, [1, 0.42, 0.28], 'metaphysics.essence');

  const rawLayers = Array.isArray(raw.layers) ? raw.layers : [];
  const kept = rawLayers.filter((l) => l && LAYER_KINDS.includes(l.kind)).slice(0, 8);
  if (kept.length !== rawLayers.length) repairs.push(`dropped ${rawLayers.length - kept.length} layer(s)`);
  const layers = kept.map((l, i) => {
    const sky = l.kind === 'sky';
    const palette = (Array.isArray(l.palette) ? l.palette : []).map((c) => color(c, null)).filter(Boolean).slice(0, 4);
    if (palette.length < 2) repairs.push(`layers[${i}].palette padded`);
    while (palette.length < 2) palette.push(palette.length ? [0.1, 0.1, 0.12] : [0.5, 0.5, 0.55]);
    const params = {};
    const p = l.params && typeof l.params === 'object' ? l.params : {};
    for (const key of KIND_PARAMS[l.kind]) {
      if (typeof p[key] === 'number' && Number.isFinite(p[key])) {
        const [lo, hi, int] = PARAM_RANGES[key];
        params[key] = num(p[key], lo, lo, hi, `layers[${i}].params.${key}`, int);
      }
    }
    return {
      id: `${l.kind}-${i}`,
      kind: l.kind,
      order: i,
      altitude: num(l.altitude, sky ? 80 : 0, -50, 300, `layers[${i}].altitude`),
      radius: num(l.radius, sky ? 180 : 120, 5, 400, `layers[${i}].radius`),
      density: num(l.density, 0.5, 0, 1, `layers[${i}].density`),
      palette,
      params,
    };
  });
  if (!layers.length) {
    repairs.push('added ground layer');
    layers.push({ id: 'ground-0', kind: 'ground', order: 0, altitude: 0, radius: 120, density: 0.5, palette: [[0.5, 0.5, 0.55], [0.1, 0.1, 0.12]], params: {} });
  }

  const t = raw.topology && typeof raw.topology === 'object' ? raw.topology : {};
  if (!TOPOLOGY_KINDS.includes(t.kind)) repairs.push('topology.kind defaulted');
  const topology = {
    kind: TOPOLOGY_KINDS.includes(t.kind) ? t.kind : 'small_world',
    node_count: num(t.node_count, 48, 16, 128, 'topology.node_count', true),
    edge_density: num(t.edge_density, 0.5, 0, 1, 'topology.edge_density'),
    radius: 18,
    center: [0, 0, 22],
  };

  const rawGlyphs = Array.isArray(raw.glyphs) ? raw.glyphs : [];
  const glyphs = [];
  let hasSoul = false;
  rawGlyphs.filter((g) => g && GLYPH_KINDS.includes(g.kind)).slice(0, 8).forEach((g, i) => {
    let kind = g.kind;
    if (kind === 'soul' && hasSoul) { kind = 'sigil'; repairs.push(`glyphs[${i}] second soul -> sigil`); }
    const glyph = {
      id: kind === 'soul' ? 'soul' : `${kind}-${i}`,
      kind,
      position: vec(g.position, kind === 'soul' ? [0, 0, 14] : [0, 30, 8], `glyphs[${i}].position`),
      scale: num(g.scale, kind === 'soul' ? 6 : 4, 1, 10, `glyphs[${i}].scale`),
      symmetry: num(g.symmetry, 6, 1, 64, `glyphs[${i}].symmetry`, true),
      complexity: num(g.complexity, 0.5, 0, 1, `glyphs[${i}].complexity`),
      hue: num(g.hue, 0.6, 0, 1, `glyphs[${i}].hue`),
    };
    if (kind === 'soul') { glyph.bound_to = 'soul'; hasSoul = true; }
    glyphs.push(glyph);
  });
  if (!hasSoul) {
    repairs.push('added soul glyph');
    glyphs.unshift({ id: 'soul', kind: 'soul', position: [0, 0, 14], scale: 6, symmetry: 6, complexity: metaphysics.lucidity, hue: 0.62, bound_to: 'soul' });
  }

  return {
    manifest: {
      prs: '1.0',
      realm_id: `realm-llm-${seed.toString(16).padStart(8, '0')}`,
      realm_name,
      seed,
      revision: 0,
      transition_seconds: 4,
      bounds: { radius: 120 },
      layers,
      metaphysics,
      topology,
      glyphs,
    },
    repairs,
  };
}
