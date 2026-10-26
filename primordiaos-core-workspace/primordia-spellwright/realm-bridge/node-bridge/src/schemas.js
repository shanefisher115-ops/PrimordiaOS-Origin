// PRS-1 wire schemas. These are JSON-Schema-shaped objects checked by the tiny
// validator below (no external dependency). The Unreal parser in
// PrimordiaPacket.cpp reads exactly these field names; change both together.

const num = (minimum, maximum) => ({ type: 'number', ...(minimum !== undefined && { minimum }), ...(maximum !== undefined && { maximum }) });
const unit = num(0, 1);
const vec3 = { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 };
const rgb = { type: 'array', items: num(0, 64), minItems: 3, maxItems: 3 }; // linear HDR

export const PACKET_TYPES = [
  'hello',
  'heart_beat',
  'cosmic_web',
  'fate_weave',
  'soul_unification',
  'dream_nebula',
  'shadow_inversion',
  'realm_manifest',
  'ack',
  'pong',
  'voice',
  'gpu_telemetry',
  'sovereign_cycle',
  'species',
];

export const envelopeSchema = {
  type: 'object',
  required: ['prs', 'type', 'op', 'id', 'seq', 't', 'ts', 'payload'],
  properties: {
    prs: { type: 'integer', enum: [1] },
    type: { type: 'string', enum: PACKET_TYPES },
    op: { type: 'string', enum: ['upsert', 'retire'] },
    id: { type: 'string' },
    realm: { type: 'string' },
    seq: { type: 'integer', minimum: 0 },
    t: { type: 'number' },
    ts: { type: 'integer' },
    payload: { type: 'object' },
  },
};

// Onyx GPU telemetry (docs/GPU_PIPELINE.md). Clients send it as {"type":"telemetry",...};
// the bridge rebroadcasts it as gpu_telemetry with id "onyx:<source>" and the tuner state.
const gpuTelemetry = {
  type: 'object',
  required: ['source', 'tick', 'gpu'],
  properties: {
    source: { type: 'string' },
    tick: { type: 'integer', minimum: 0 },
    device: { type: 'string' },
    realm_id: { type: 'string' },
    fps: num(0),
    cpu_ms: num(0),
    quality: num(0, 1),
    gpu: {
      type: 'object',
      required: ['frame_ms', 'budget_ms'],
      properties: {
        frame_ms: num(0),
        budget_ms: num(0.1),
        realm_tick_ms: num(0),
        render_ms: num(0),
        headroom: num(-1000, 1),
        memory_pressure: num(0, 8),
        queues: { type: 'object' },
        scopes: { type: 'object' },
      },
    },
    pipelines: { type: 'object' },
    actors: {
      type: 'object',
      properties: { count: { type: 'integer', minimum: 0 }, gpu_us_total: num(0), gpu_us_mean: num(0), hottest: { type: 'array' }, actions: { type: 'object' } },
    },
    sigils: { type: 'array' },
    structures: { type: 'integer', minimum: 0 },
    tuner: { type: 'object', properties: { quality: num(0, 1), pinned: { type: 'boolean' } } },
    mcp: { type: 'object' },
  },
};

export const payloadSchemas = {
  gpu_telemetry: gpuTelemetry,

  // A living species of the Sovereign's chronicle, incarnated in the realm (id "species:<slug>";
  // src/sovereign/incarnation.js). 1 Hz while the Sovereign is awake; retired when it dies out.
  species: {
    type: 'object',
    required: ['name', 'archetype', 'manifestation', 'population', 'bodies', 'position', 'range', 'color', 'glow', 'size', 'speed', 'seed'],
    properties: {
      name: { type: 'string' },
      archetype: { type: 'string' },
      manifestation: { type: 'string', enum: ['rooted', 'individual', 'swarm', 'floating', 'abyssal'] },
      population: { type: 'integer', minimum: 0 },
      bodies: { type: 'integer', minimum: 0, maximum: 400 },
      position: vec3, // home centre, realm-local metres
      range: num(0), // how far it roams from home, metres
      color: rgb,
      glow: num(0, 16),
      size: num(0), // body height, metres
      speed: num(0), // m/s
      seed: { type: 'integer', minimum: 0 },
      traits: { type: 'array', items: { type: 'string' } },
      look: { type: 'string' },
      mesh: { type: 'string' }, // a creature asset path; absent = engine shapes
      born_cycle: { type: 'integer', minimum: 0 },
      cycle: { type: 'integer', minimum: 0 },
    },
  },

  // One cycle of the Primordia Sovereign, the realm's world-mind (docs/SOVEREIGN.md). Opt-in.
  sovereign_cycle: {
    type: 'object',
    required: ['cycle', 'title', 'narration', 'species', 'ecology', 'realm_events', 'lore', 'fab_assets'],
    properties: {
      cycle: { type: 'integer', minimum: 1 },
      realm: { type: 'string' },
      title: { type: 'string' },
      narration: { type: 'string' },
      metaphysics: { type: 'array', items: { type: 'object', required: ['key', 'value'] } },
      evolve: { type: 'boolean' },
      changes: { type: 'array', items: { type: 'string' } },
      evolution: { type: 'array', items: { type: 'object', required: ['name', 'population', 'change', 'status'] } },
      species: { type: 'array', items: { type: 'object', required: ['name', 'archetype', 'population'] } },
      ecology: { type: 'object', required: ['total_population', 'diversity', 'stability'] },
      realm_events: { type: 'array', items: { type: 'object', required: ['name', 'kind', 'description'] } },
      lore: { type: 'array', items: { type: 'object', required: ['title', 'text'] } },
      fab_assets: { type: 'array', items: { type: 'string' } },
    },
  },

  hello: {
    type: 'object',
    required: ['server', 'version', 'streams', 'units'],
    properties: {
      server: { type: 'string' },
      version: { type: 'string' },
      streams: { type: 'object' },
      units: { type: 'object' },
    },
  },

  heart_beat: {
    type: 'object',
    required: ['bpm', 'phase', 'amplitude', 'coherence', 'essence', 'position', 'scale'],
    properties: {
      bpm: num(1, 400),
      phase: unit,
      amplitude: unit,
      coherence: unit,
      essence: rgb,
      position: vec3,
      scale: num(0),
    },
  },

  cosmic_web: {
    type: 'object',
    required: ['rev', 'nodes'],
    properties: {
      rev: { type: 'integer', minimum: 0 },
      radius: num(0),
      nodes: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'p', 'resonance', 'mass'],
          properties: {
            id: { type: 'string' },
            p: vec3,
            resonance: unit,
            mass: num(0),
            kind: { type: 'string' },
          },
        },
      },
      // [a, b, weight] with a/b indexing into nodes[] of the same rev.
      edges: {
        type: 'array',
        items: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      },
    },
  },

  fate_weave: {
    type: 'object',
    required: ['threads', 'loom_speed', 'weave_density'],
    properties: {
      loom_speed: num(0),
      weave_density: unit,
      threads: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'points', 'tension', 'color', 'fate'],
          properties: {
            id: { type: 'string' },
            points: { type: 'array', items: vec3, minItems: 2 },
            tension: unit,
            color: rgb,
            width: num(0),
            fate: { type: 'string', enum: ['bound', 'frayed', 'severed'] },
          },
        },
      },
    },
  },

  soul_unification: {
    type: 'object',
    required: ['unity', 'fragments', 'glyph', 'position'],
    properties: {
      unity: unit,
      position: vec3,
      fragments: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'angle', 'radius', 'essence'],
          properties: { id: { type: 'string' }, angle: { type: 'number' }, radius: num(0), essence: rgb },
        },
      },
      glyph: {
        type: 'object',
        required: ['symmetry', 'complexity', 'rotation_speed', 'hue'],
        properties: {
          symmetry: { type: 'integer', minimum: 1, maximum: 64 },
          complexity: unit,
          rotation_speed: { type: 'number' },
          hue: unit,
        },
      },
    },
  },

  dream_nebula: {
    type: 'object',
    required: ['density', 'turbulence', 'noise_scale', 'drift', 'palette', 'lucidity', 'extent', 'position'],
    properties: {
      density: unit,
      turbulence: unit,
      noise_scale: num(0),
      drift: vec3,
      palette: { type: 'array', items: rgb, minItems: 2, maxItems: 4 },
      lucidity: unit,
      extent: vec3,
      position: vec3,
    },
  },

  shadow_inversion: {
    type: 'object',
    required: ['inversion', 'depth', 'threshold', 'pulse', 'extent', 'position'],
    properties: {
      inversion: unit,
      depth: unit,
      threshold: unit,
      pulse: unit,
      extent: vec3,
      position: vec3,
      mirror_of: { type: 'string' },
    },
  },

  // Spoken audio for a speaker entity (id "voice:<speaker>"). Chunks of one utterance
  // arrive in order; `text` is set on the first chunk of each sentence (subtitles);
  // a final chunk with empty pcm and final:true ends the utterance.
  voice: {
    type: 'object',
    required: ['utterance', 'chunk', 'sample_rate', 'channels', 'format', 'pcm', 'final', 'position'],
    properties: {
      utterance: { type: 'integer', minimum: 1 },
      chunk: { type: 'integer', minimum: 0 },
      text: { type: 'string' },
      sample_rate: { type: 'integer', minimum: 8000, maximum: 48000 },
      channels: { type: 'integer', enum: [1] },
      format: { type: 'string', enum: ['s16le'] },
      pcm: { type: 'string' }, // base64
      final: { type: 'boolean' },
      position: vec3,
      spatial: { type: 'boolean' }, // false: a narrator heard everywhere (default true)
    },
  },

  // Full PRS-1 manifest; see docs/PRS-1.md §3.
  realm_manifest: {
    type: 'object',
    required: ['prs', 'realm_id', 'realm_name', 'seed', 'revision', 'layers', 'metaphysics', 'topology', 'glyphs'],
    properties: {
      prs: { type: 'string', enum: ['1.0'] },
      realm_id: { type: 'string' },
      realm_name: { type: 'string' },
      seed: { type: 'integer', minimum: 0, maximum: 4294967295 },
      revision: { type: 'integer', minimum: 0 },
      transition_seconds: num(0),
      bounds: { type: 'object', required: ['radius'], properties: { radius: num(1) } },
      layers: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'kind', 'order', 'altitude', 'radius', 'density'],
          properties: {
            id: { type: 'string' },
            kind: { type: 'string', enum: ['ground', 'ocean', 'sky', 'ring', 'lattice', 'void', 'spire_field'] },
            order: { type: 'integer' },
            altitude: { type: 'number' },
            radius: num(0),
            density: unit,
            palette: { type: 'array', items: rgb },
            params: { type: 'object' },
          },
        },
      },
      metaphysics: {
        type: 'object',
        required: ['entropy', 'luminosity', 'coherence', 'resonance', 'inversion', 'lucidity', 'time_dilation', 'essence'],
        properties: {
          entropy: unit,
          luminosity: unit,
          coherence: unit,
          resonance: unit,
          inversion: unit,
          lucidity: unit,
          time_dilation: num(0.05, 8),
          essence: rgb,
        },
      },
      topology: {
        type: 'object',
        required: ['kind', 'node_count', 'edge_density', 'radius'],
        properties: {
          kind: { type: 'string', enum: ['lattice', 'small_world', 'scale_free', 'toroidal', 'fractal_tree'] },
          node_count: { type: 'integer', minimum: 1, maximum: 4096 },
          edge_density: unit,
          radius: num(0),
          center: vec3,
        },
      },
      glyphs: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'kind', 'position', 'scale', 'symmetry', 'complexity', 'hue'],
          properties: {
            id: { type: 'string' },
            kind: { type: 'string', enum: ['soul', 'sigil', 'ward', 'gate'] },
            position: vec3,
            scale: num(0),
            symmetry: { type: 'integer', minimum: 1, maximum: 64 },
            complexity: unit,
            hue: unit,
            bound_to: { type: 'string' },
            intent: { type: 'string' },
          },
        },
      },
    },
  },
};

// Minimal JSON-Schema subset: type, required, properties, items, enum,
// minimum, maximum, minItems, maxItems. Returns an array of error strings.
export function validate(value, schema, path = '$', errors = []) {
  if (!schema) return errors;
  const t = schema.type;
  if (t) {
    const ok =
      (t === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) ||
      (t === 'array' && Array.isArray(value)) ||
      (t === 'string' && typeof value === 'string') ||
      (t === 'boolean' && typeof value === 'boolean') ||
      (t === 'number' && typeof value === 'number' && Number.isFinite(value)) ||
      (t === 'integer' && Number.isInteger(value));
    if (!ok) {
      errors.push(`${path}: expected ${t}`);
      return errors;
    }
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: not one of ${schema.enum.join('|')}`);
  if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: < ${schema.minimum}`);
  if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: > ${schema.maximum}`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: more than ${schema.maxItems} items`);
    if (schema.items) value.forEach((v, i) => validate(v, schema.items, `${path}[${i}]`, errors));
  } else if (t === 'object') {
    for (const key of schema.required ?? []) if (!(key in value)) errors.push(`${path}.${key}: required`);
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (key in value) validate(value[key], sub, `${path}.${key}`, errors);
    }
  }
  return errors;
}

export function validatePacket(packet) {
  const errors = validate(packet, envelopeSchema);
  if (errors.length || packet.op === 'retire') return errors;
  return validate(packet.payload, payloadSchemas[packet.type], '$.payload', errors);
}
