# PRIMORDIA REALM STANDARD — PRS-1

**Status:** 1.0 · **Normative implementations:** `node-bridge/` (producer), `unreal/PrimordiaOSRealmBridge/` (consumer)

The keywords MUST, MUST NOT, SHOULD, and MAY are used as in RFC 2119.

PRS-1 defines four things:

1. **The wire protocol:** how PrimordiaOS streams its metaphysical state to a renderer.
2. **The realm manifest:** a self-contained, seeded description of a procedural realm.
3. **Generation rules:** how a consumer deterministically turns a manifest into geometry.
4. **The realm lifecycle:** how PrimordiaOS authors realms autonomously and evolves them over time.

---

## 1. Conventions

| Quantity | Convention |
|---|---|
| Length | meters (consumers scale; Unreal multiplies by `UnitsPerMeter`, default 100) |
| Axes | +X forward, +Y right, +Z up, left-handed (Unreal's frame, so no axis swizzle) |
| Vector | `[x, y, z]` JSON array |
| Color | `[r, g, b]` or `[r, g, b, a]`, **linear**. Values above 1 are HDR emissive. |
| Normalized scalar | `0..1` ("unit") unless stated otherwise |
| Angle | radians on the wire; manifest params ending in `_deg` are degrees |
| Time | `t` is simulation seconds (Continuum clock, dilated); `ts` is Unix epoch ms (wall clock) |
| Positions | **realm-local**: relative to the realm root, so moving the root moves the whole realm |

Producers SHOULD round floats to 4 decimals (0.1 mm), which keeps a full 60 Hz stream at roughly 40–80 KB/s.

---

## 2. Wire protocol

### 2.1 Transport

- WebSocket, text frames, one JSON object per frame. Default endpoint `ws://127.0.0.1:7777`. Clients should dial the IPv4 loopback address rather than `localhost`, which may resolve to `::1` first (common on Windows), where the default server is not listening.
- The server binds to `127.0.0.1` by default. Binding beyond loopback MUST be an explicit operator choice. PRS-1 has no authentication, so put a TLS-terminating proxy with authentication in front of it for anything non-local.
- `permessage-deflate` is disabled: at 60 Hz the CPU cost outweighs the saving on loopback.

### 2.2 Envelope (server → client)

```json
{
  "prs": 1,
  "type": "heart_beat",
  "op": "upsert",
  "id": "heart",
  "realm": "realm-5eed1e55",
  "seq": 18234,
  "t": 812.337,
  "ts": 1760611200123,
  "payload": { }
}
```

| Field | Rule |
|---|---|
| `prs` | MUST be `1`. Consumers MUST drop other versions. |
| `type` | one of §2.4. Unknown types MUST be ignored, not treated as errors. |
| `op` | `upsert` creates the entity if needed, then updates it. `retire` destroys it, and its `payload` MAY be `{}`. |
| `id` | entity id, unique **per type**. The consumer registry key is `"<type>/<id>"`. |
| `seq` | monotonically increasing per connection. Consumers MUST ignore an upsert whose `seq` ≤ the last applied `seq` for that entity, unless the gap exceeds 100 000 (server restart). |
| `t`, `ts` | see §1 |

### 2.3 Client → server messages

| Message | Effect |
|---|---|
| `{"type":"hello","client":"UnrealEngine","version":"1.0.0","hz":60,"streams":["heart_beat",…]}` | Identifies the client and sets its optional rate cap and stream filter. |
| `{"type":"subscribe","streams":[…]}` | Replaces the stream filter. An empty list means all streams. |
| `{"type":"set_rate","hz":30}` | Per-client cap, 1–60 Hz, applied per entity. |
| `{"type":"request_manifest"}` | Resends the full state: manifest plus keyframes of every stream. |
| `{"type":"ping","nonce":7}` | Server replies with a `pong` envelope that echoes the nonce. |
| `{"type":"command","name":…,"args":{…}}` | Server replies with an `ack` envelope `{command, ok, error?}`. |
| `{"type":"telemetry","source":"unreal",…}` | An Onyx GPU telemetry frame (payload as `gpu_telemetry` below). Feeds the bridge's GPU tuner; rebroadcast as `gpu_telemetry`. Only an invalid frame is answered (`ack` with `ok: false`). See [GPU_PIPELINE.md](GPU_PIPELINE.md). |

Commands: `evolve_realm` · `reseed {seed}` · `perturb {key, value}` (any metaphysical scalar) · `load_manifest {manifest}` · `generate_realm {description, model?, seed?}` (LLM-designed realm; acks `started`, then broadcasts the manifest, then acks `done` or `failed` to the requester; see [OLLAMA.md](OLLAMA.md)) · `cancel_generate` · `converse {input, model?}` / `speak {text}` / `cancel_speech` (spoken replies as `voice` packets; see [VOICE.md](VOICE.md)) · `set_quality {scale}` (pins the GPU quality, `scale: null` hands it back to the tuner) · `set_gpu_budget {ms}` (the Vulkan sidecar's frame budget; see [GPU_PIPELINE.md](GPU_PIPELINE.md)) · `sovereign {op: start|stop|cycle|status}` (the world-mind's cycles; acks with its status; see [SOVEREIGN.md](SOVEREIGN.md)).

### 2.4 Stream catalogue

| Type | Module | Max rate | Entity ids |
|---|---|---|---|
| `hello` | bridge | on connect | `bridge` |
| `heart_beat` | Heart | 60 Hz | `heart` |
| `cosmic_web` | CosmicWeb | 30 Hz | `web:<realm_id>` |
| `fate_weave` | FateWeave | 30 Hz | `weave` |
| `soul_unification` | Soul (+Omniscience) | 30 Hz | `soul` |
| `dream_nebula` | Dreamforge | 30 Hz | `dream:primary`, `dream:reverie-<n>` (transient) |
| `shadow_inversion` | Shadowforge | 30 Hz | `shadow` |
| `realm_manifest` | Worldforge | on revision change | `<realm_id>` |
| `voice` | Voice (Kokoro TTS) | while speaking, ~0.5 s chunks | `voice:<speaker>` (default `voice:soul`; the Sovereign speaks as `voice:sovereign` with `spatial: false`) |
| `sovereign_cycle` | Primordia Sovereign | once per cycle, **opt-in** like `gpu_telemetry` | `sovereign` |
| `species` | Primordia Sovereign | 1 Hz while it is awake; `retire` when a species dies out | `species:<slug>` (e.g. `species:echo-swarm`) |
| `gpu_telemetry` | Onyx (relayed by the bridge) | 4 Hz per source, **opt-in**: only to clients whose stream filter names it | `onyx:<source>` (`onyx:unreal`, `onyx:vulkan-sidecar`) |

The server's master loop runs at 30–60 Hz. Every module **steps** every tick, and each stream **samples** at `min(stream rate, master rate)`. Continuum and Omniscience emit no packets: their output reaches the renderer through `t` and the manifest's `metaphysics`.

### 2.5 Delivery guarantees

- **Continuous upserts** (all visual streams) are *latest-wins*. A server MAY drop them under backpressure (the reference server drops when a socket has more than 1 MiB buffered), and a consumer MAY coalesce several per frame.
- **Critical packets** (`realm_manifest`, `hello`, `ack`, `pong`, and any `op: "retire"`) MUST NOT be dropped or coalesced.
- When coalescing `cosmic_web`, a consumer MUST carry a superseded packet's `edges` forward if the newer packet lacks them.
- On connect, the server MUST send `hello`, then the current manifest, then one *keyframe* sample of every stream. For `cosmic_web`, a keyframe includes `edges`.

### 2.6 Payload schemas

The machine-readable schemas live in `node-bridge/src/schemas.js` (`payloadSchemas`). In summary:

**`heart_beat`**: `bpm` (1–400), `phase` (unit), `amplitude`, `coherence` (unit), `essence` (rgb), `position`, `scale` (diameter in meters).
Consumers SHOULD dead-reckon `phase` locally from `bpm` and pull toward each received phase. The pulse envelope is two Gaussians ("lub" at 0.08, "dub" at 0.30). Both implementations share it: `heart.js`, `AHeartActor::PulseEnvelope`.

**`cosmic_web`**: `rev` (int), `radius`, `nodes[] {id, p, resonance, mass, kind: nexus|star|mote}`, optional `edges[] [a, b, weight]`. Edge endpoints index `nodes[]` of the same `rev`. `edges` is present when `rev` changed, on a keyframe (at most every 2 s), or on connect. Consumers rebuild edge geometry only when `rev` changes.

**`fate_weave`**: `loom_speed`, `weave_density`, `threads[] {id, points[], tension, color, width (m), fate: bound|frayed|severed}`. A `severed` thread keeps streaming for about 2.5 s so it can fade, then disappears. A thread missing from a packet MUST be faded out.

**`soul_unification`**: `unity`, `position`, `fragments[] {id, angle (rad), radius (m), essence}`, `glyph {symmetry (int), complexity, rotation_speed (rad/s), hue}`.

**`dream_nebula`**: `density`, `turbulence`, `noise_scale` (1/m), `drift` (m/s), `palette` (2–4 rgb), `lucidity`, `extent` (full size, m), `position`.

**`shadow_inversion`**: `inversion`, `depth`, `threshold`, `pulse` (unit; the reference sends `1 − heart pulse`), `extent`, `position`, `mirror_of` (entity id).

**`realm_manifest`**: a complete PRS-1 manifest (§3). When the bridge's GPU tuner has lowered the realm quality below 1, every layer `density` is the authored density times that quality and the manifest carries `gpu_quality` (informational; consumers that ignore it still render correctly). Evolution always continues from the authored manifest.

**`sovereign_cycle`**: `cycle, realm, title, narration, metaphysics[{key, value}], evolve, changes[], evolution[{name, archetype, population, change, trait, status}], species[], ecology {total_population, species_count, diversity, stability, predator_share}, realm_events[{name, kind, description}], lore[{title, text}], fab_assets[], model, llm_seconds, tokens`. See [SOVEREIGN.md](SOVEREIGN.md).

**`species`**: `name, archetype, manifestation (rooted|individual|swarm|floating|abyssal), population, bodies (0-400), position (home, realm-local m), range (m), color, glow, size (m), speed (m/s), seed, traits[], look, born_cycle, cycle`. Unreal draws it with `ASpeciesActor`. See [SOVEREIGN.md](SOVEREIGN.md#species-in-the-realm).

**`gpu_telemetry`**: `source`, `tick`, `gpu {frame_ms, budget_ms, realm_tick_ms?, render_ms?, headroom?, memory_pressure?, queues?, scopes?}`, plus optional `device`, `realm_id`, `fps`, `cpu_ms`, `quality`, `pipelines {<id>: {ms, budget_ms, saturation, invocations, dispatches}}`, `actors {count, gpu_us_total, gpu_us_mean, hottest[], actions{}}`, `sigils [{index, gpu_us, voxels}]`, `structures`, `tuner {quality, load, pinned}` (added by the bridge) and `mcp` (the sidecar's latest MCP results summary). Latest-wins; MAY be dropped under backpressure.

---

## 3. Realm manifest

### 3.1 Example

A complete generated example is at [`examples/genesis-5eed1e55.prs1.json`](../examples/genesis-5eed1e55.prs1.json). Abridged:

```json
{
  "prs": "1.0",
  "realm_id": "realm-5eed1e55",
  "realm_name": "Lumenne Hollow",
  "seed": 1592598101,
  "revision": 0,
  "transition_seconds": 4,
  "generated_by": { "module": "Worldforge", "at": "2026-10-16T12:00:00.000Z" },
  "units": { "length": "meter", "up": "+Z", "handedness": "left" },
  "bounds": { "radius": 120 },
  "layers": [
    { "id": "ground-0", "kind": "ground", "order": 0, "altitude": 0, "radius": 120, "density": 0.7832,
      "palette": [[0.5045, 0.3291, 0.5686], [0.0282, 0.259, 0.4971]], "params": { "roughness": 0.2185, "terrace_count": 5,
                  "monolith_clusters": 6, "cluster_spread": 9.7142, "rubble": 0.5226 } }
  ],
  "metaphysics": { "entropy": 0.35, "luminosity": 0.7, "coherence": 0.6, "resonance": 0.5,
                   "inversion": 0.2, "lucidity": 0.55, "time_dilation": 1.0, "essence": [1, 0.42, 0.28] },
  "topology": { "kind": "small_world", "node_count": 36, "edge_density": 0.344, "radius": 18, "center": [0, 0, 22] },
  "glyphs": [
    { "id": "soul", "kind": "soul", "position": [0, 0, 14], "scale": 6, "symmetry": 6,
      "complexity": 0.5, "hue": 0.62, "bound_to": "soul" }
  ]
}
```

### 3.2 Fields

| Field | Req. | Type | Meaning |
|---|---|---|---|
| `prs` | **yes** | `"1.0"` | Version. Consumers accept `1.x` and reject other versions. |
| `realm_name` | **yes** | string | Human name. |
| `seed` | **yes** | uint32 | Root of all procedural randomness (§4.1). |
| `layers` | **yes** | array ≥ 1 | Stratified geometry (§3.3). |
| `metaphysics` | **yes** | object | Global state (§3.4). |
| `topology` | **yes** | object | Cosmic web spec (§3.5). |
| `glyphs` | **yes** | array | Symbolic anchors (§3.6). |
| `realm_id` | no | string | Stable identity. Default: `realm-<seed as 8 hex digits>`. Equal ids mean *the same realm*, so updates are diffs. |
| `revision` | no | uint | Increments on every evolution. Default 0. |
| `transition_seconds` | no | ≥ 0 | Easing time for metaphysics changes. Default 4. |
| `bounds.radius` | no | m | Extent of the realm. Default 120. |
| `generated_by`, `units` | no | object | Informational. |

Consumers MUST reject (not partially apply) a manifest missing any required field. Unknown fields MUST be ignored, which leaves room for forward-compatible extensions.

### 3.3 Layers

`{ id, kind, order, altitude (m), radius (m), density (unit), palette?: rgb[], params?: {string: number} }`

Layers are generated in ascending `order`. The `id` is the diff key. Kinds and their params:

| `kind` | Params (lengths in m) | Visual contract |
|---|---|---|
| `ground` | `roughness` (unit), `terrace_count` (1–12) | Collidable disc of `radius`, solid stepped terraces, monolith circles and lone stones standing on them, rubble |
| `ocean` | `wave_height` (m), `wave_speed` | Disc surface, sea stacks breaking it, floating motes |
| `sky` | `star_count` | Stars on a hemisphere of `radius`, raised by `altitude`, with a galactic band and a few beacons |
| `ring` | `thickness` (m), `tilt_deg` | Shards orbiting at `radius`, tilted about +X, with gaps and keystones |
| `lattice` | `cell_size` (m) | Crystal nodes on a cubic grid clipped to a sphere, joined by struts |
| `void` | `aperture` (unit) | Inward-facing hollow sphere of diameter `2·radius·aperture`, a core and an accretion disc of debris |
| `spire_field` | `max_height` (m) | Clusters of cones up to `max_height`, tallest at each cluster's centre, with shard skirts |

`palette[0]` is the primary color and `palette[1]` the secondary. Every numeric param MUST also be exposed to the layer material by its exact name.

**Composition params** are optional; consumers that predate them ignore them (§3.2). They tune how a layer is dressed (§4.3). A consumer MUST apply the default when one is absent, so a manifest without them still gets the full composition. Genesis emits all of them (§5.1).

| `kind` | Param | Range | Default | Meaning |
|---|---|---|---|---|
| `ground` | `monolith_clusters` | 0–24 (int) | `3 + round(4·roughness)` | Stone circles: a tall centre stone ringed by 4–8 slabs that face it |
| | `cluster_spread` | 1–40 m | `0.07·radius` | Radius of a stone circle |
| | `rubble` | unit | 0.5 | Rubble amount, at terrace feet and around stone bases |
| `ocean` | `islet_count` | 0–32 (int) | 6 | Sea stacks, each with 0–2 smaller companions |
| `sky` | `band_strength` | unit | 0.5 | Share of stars in the galactic band |
| | `band_tilt_deg` | −90–90 | 25 | Band plane tilt: 0 passes through the zenith, 90 lies on the horizon |
| `ring` | `keystones` | 0–24 (int) | 6 | Large slabs evenly spaced along the ring |
| | `gap_count` | 0–6 (int) | 2 | Empty bands across the ring's width |
| | `arc` | 0.05–1 | 1 | Fraction of the full circle that is filled |
| `lattice` | `struts` | unit | 0.6 | Chance that two neighbouring nodes are joined |
| `spire_field` | `spire_clusters` | 1–16 (int) | 4 | Spire clusters |
| | `falloff` | 0.25–4 | 1.5 | Height falloff exponent from a cluster's centre (higher means a sharper crown) |
| `void` | `debris` | unit | 0.5 | Accretion-disc debris amount |

### 3.4 Metaphysics

| Scalar | Range | Source module | Visual meaning (normative intent) |
|---|---|---|---|
| `entropy` | unit | Omniscience | disorder: turbulence, jitter, heart rate, rewiring |
| `luminosity` | unit | Omniscience | global light and emissive gain |
| `coherence` | unit | Heart | order: symmetry, ribbon tension, glyph clarity |
| `resonance` | unit | Heart | vibration: node pulsing, loom speed |
| `inversion` | unit | Shadowforge | negative-space strength, color inversion |
| `lucidity` | unit | Omniscience | dream clarity: nebula definition, glyph complexity |
| `time_dilation` | 0.05–8 | Continuum | local time scale of every realm entity |
| `essence` | rgb | Heart | the realm's signature hue |

### 3.5 Topology

`{ kind: lattice|small_world|scale_free|toroidal|fractal_tree, node_count: 1–4096, edge_density: unit, radius: m, center?: [x,y,z] = [0,0,22] }`

### 3.6 Glyphs

`{ id, kind: soul|sigil|ward|gate, position, scale (diameter m), symmetry: 1–64, complexity, hue, bound_to?, intent? }`

`bound_to` names a live entity id of the matching stream (for `kind: soul`, that is `soul_unification`). A consumer MUST render a bound glyph and its live entity as **one** object: the static spec seeds it, and the live stream drives it afterwards.

`intent` is what the glyph is *for*, as a short statement in capitals (`"GUARD THE DREAM OF LUMENNE"`). Consumers SHOULD inscribe it into the glyph's form, so that different intents look different and the same intent looks the same everywhere. The reference consumer reduces it to its distinct consonants and writes them on a letter wheel (see MATERIALS_AND_NIAGARA.md §6). A glyph without an intent is inscribed from its `id`. A `soul_unification` packet MAY carry `glyph.intent` to re-inscribe its glyph live.

---

## 4. Procedural generation rules

### 4.1 Determinism

All randomness MUST derive from `seed` through **mulberry32** seeded with `subSeed(seed, label) = seed XOR FNV-1a-32(label)` (FNV-1a over UTF-16 code units). The labels are:

| Purpose | Label |
|---|---|
| Worldforge genesis | `realm` |
| Worldforge evolution | `worldforge.evolve` |
| Topology synthesis | `topology` |
| Layer scatter, primary tier (§4.3) | `layer:<layer id>` |
| Layer scatter, other tiers | `layer:<layer id>:fixed`, `layer:<layer id>:hero`, `layer:<layer id>:detail` |
| Worldforge composition params (§5.1) | `detail:<layer id>` |
| Glyph intent | `glyph:<glyph id>` |

Reference implementations: `node-bridge/src/prng.js` and `FPrimordiaRandom` (`PrimordiaTopology.cpp`). They are bit-identical, so the same manifest produces the same realm on every machine and in every engine.

### 4.2 Units and placement

Each layer gets a root at `(0, 0, altitude)`. Scatter positions are relative to that root. Glyph positions and the topology center are relative to the realm root.

### 4.3 Layer scatter

Each layer is composed into up to three **tiers**. Each tier has an ordered **candidate list** drawn from its own stream (§4.1):

| Tier | Shown | Per kind (reference consumer) |
|---|---|---|
| **fixed** | always, whatever the density | ground terraces · void core |
| **hero** | `round(density × n)`, as a prefix | ground monoliths · ocean sea stacks · sky beacons · ring keystones · lattice nodes · spires |
| **detail** | `round(density × n)` as a prefix, or **gated** (below) | ground rubble · ocean motes · sky stars · ring shards · lattice struts · spire skirts · void debris |

The tier that held a layer's single scatter list before tiers existed is its **primary tier** and keeps the `layer:<id>` stream: hero for ground, lattice and spire_field; detail for ocean, sky and ring (void has none). Every other tier uses `layer:<id>:<tier>`. Adding or retuning one tier never changes another.

**Prefix rule.** A tier shows its candidates **as a prefix** of its list. Density changes therefore add or remove elements at the tail, and the rest of the realm never reshuffles. Lists are ordered so that a prefix is a fair sample:
- Lattice nodes are Fisher-Yates-shuffled with the layer stream before truncation.
- Ring shards use random angles, not sequential ones.
- Clustered pieces (stone circles, spire clusters) interleave ranks across clusters, so a prefix keeps every cluster's centre piece first.

**Gating.** A detail candidate MAY name a hero candidate it belongs to, for example the rubble around a monolith, a spire's skirt, or a strut, which names the later of its two nodes. A gated candidate is shown exactly while its hero candidate is shown, and gated lists are sorted by that index, so they are prefixes too. Candidates that belong to no hero piece (rubble at terrace feet) come first and are always shown. Consumers MAY additionally scale the detail tier down for performance (the reference consumer's `DetailDensityScale`), but only as a prefix.

**Standing on the ground.** A `ground` layer defines a height field: the top of the highest terrace containing a point. Layers that stand on the ground use it as their floor: in 1.0 that is a `spire_field` whose altitude is within 2 m of the ground layer's. The ground's own monoliths and rubble also stand on it.

A layer's **structural signature** covers `kind`, `altitude`, `radius`, `palette` and `params`, but not `density`. For a layer that stands on a ground, it also covers that ground's signature. If the signature changes the layer MUST be rebuilt; a density-only change MUST be applied in place.

**Placement never depends on metaphysics.** Metaphysics change every revision and are not in the signature. Reacting to them in placement would either rebuild layers every revision or let two consumers that joined at different revisions show different realms. Metaphysics act through materials (§6.3), and on the producer side through the composition params chosen at genesis (§5.1).

The exact shapes (sizes, spacing, lean, distributions) belong to the reference consumer and are not normative across engines. Normative are the tiers, the stream labels, the prefix and gating rules, and the signature rule above.

### 4.4 Topology synthesis

The `cosmic_web` stream is **authoritative**. When no `cosmic_web` packet for `web:<realm_id>` has arrived in the last 3 s, the consumer synthesizes the graph offline with `synthesizeTopology(topology, subSeed(seed, "topology"))`:

| Kind | Nodes | Edges |
|---|---|---|
| `lattice` | cubic grid, side `⌈∛n⌉`, spanning `±radius` | +x, +y, +z neighbours |
| `toroidal` | torus: major `radius`, minor `radius/3`, ring size `round(√n)` | ring successor + next ring |
| `fractal_tree` | ternary tree rising from `−radius` | parent → child, weight `1/(depth+1)` |
| `scale_free` | Fibonacci sphere, jittered radius | Barabási–Albert, `m = 1 + round(3·edge_density)` |
| `small_world` | Fibonacci sphere | ring lattice k=2, each edge rewired with p = `0.3·edge_density` |

Node kinds are assigned by index: `i % 11 == 0` → nexus (mass 3), `i % 4 == 0` → star (mass 1.6), otherwise mote (mass 1).

### 4.5 Glyphs

Glyphs are spawned or updated by `id`, and those absent from a new revision are retired with a fade. A glyph is never re-created merely because its parameters changed.

---

## 5. Autonomous realm authoring (PrimordiaOS side)

Worldforge owns the manifest. Every other module writes to the shared **metaphysical state bus** (`state.js`), and Worldforge folds that state into each revision.

### 5.1 Genesis (`prs1.js: genesis(seed, state)`)

1. `rng = mulberry32(subSeed(seed, "realm"))`.
2. Name: prefix + suffix + epithet, drawn from fixed syllable tables.
3. Layers: a `ground` (70%) or an `ocean` first, then a `sky`, then 1–3 extra kinds drawn **without replacement** from {ring, lattice, void, spire_field}, each with kind-specific params. Then every layer gets its composition params (§3.3) from its own `detail:<layer id>` stream, so they never shift the realm stream. The metaphysics at birth bias them:
   - entropy raises `rubble`, `debris` and `gap_count`,
   - coherence raises `monolith_clusters`, `keystones`, `struts` and the spire `falloff`,
   - lucidity raises `band_strength`.

   Designed realms get them the same way.
4. Glyphs: the bound `soul` glyph at `[0, 0, 14]`, plus 2–4 sigils/wards/gates on a 32 m circle. The soul's intent is the realm name. Every other glyph's intent is `<VERB> <OBJECT> OF <PLACE>`. The verb is drawn from the glyph's kind (sigil: CALL, KINDLE, REMEMBER, WEAVE, NAME, AWAKEN; ward: GUARD, SHIELD, HOLD, KEEP, BIND, STILL; gate: OPEN, CROSS, UNSEAL, RETURN, ASCEND, PASS) using its own `glyph:<id>` stream. The object names the metaphysic that dominated when the glyph was born (entropy THE STORM, coherence THE PATTERN, resonance THE CHORUS, inversion THE SHADOW, lucidity THE DREAM, luminosity THE DAWN). The place is the first word of the realm name. Glyphs born during evolution use the same rule.
5. Topology: random kind, 32–95 nodes, `edge_density` 0.2–0.8, radius 18 m.
6. Metaphysics: a snapshot of the state bus.
7. The result MUST pass `validateManifest` before it is published. A producer MUST NOT emit an invalid manifest.

### 5.2 Evolution (`evolve(prev, state, rng)`)

Every `evolveSeconds` (default 15), or on the `evolve_realm` command:

| Change | Bound per revision |
|---|---|
| `revision` | `+1` |
| `metaphysics` | replaced by a new snapshot; consumers ease it over `transition_seconds` |
| each layer `density` | at most ±0.05 |
| glyphs | with probability `0.4·entropy`, one sigil is born or dissolved. The soul glyph is never removed; at most 8 sigils. |
| soul glyph | `symmetry = 3 + ⌊9·coherence⌋`, `complexity = lucidity` |
| topology | with probability 0.08, a new `kind` and `node_count ±12` (clamped to 16–128) |

Bounded deltas are a requirement, not a style choice: they let consumers diff in place and keep realms visually continuous. Wholesale changes require a new `realm_id` (`reseed`).

### 5.3 Module → state-bus contract

| Module | Writes | Emits |
|---|---|---|
| Continuum | `time_dilation`, `ctx.t` | — |
| Omniscience | `entropy`, `luminosity`, `lucidity`, `awareness` | — |
| Heart | `heartPulse`, `resonance`, `coherence`, `essence` | `heart_beat` |
| Soul | (reads `coherence`, `awareness`) | `soul_unification` |
| CosmicWeb | (reads `resonance`, `entropy`, `heartPulse`, manifest topology) | `cosmic_web` |
| FateWeave | (reads `resonance`, `coherence`, `entropy`) | `fate_weave` |
| Dreamforge | (reads `lucidity`, `entropy`) | `dream_nebula` |
| Shadowforge | `inversion` | `shadow_inversion` |
| Worldforge | `ctx.manifest` | `realm_manifest` |

Real PrimordiaOS modules replace the reference ones by exporting `create(seed, options)` that returns `{ name, stream, hz, init, step, sample }` (see `node-bridge/src/modules/index.js`).

---

## 6. Consumer interpretation (Unreal Engine)

### 6.1 Object model

```
ARealmRootActor  (one per realm_id; transform = realm placement)
├── Layer_<id>  USceneComponent @ altitude
│   ├── Base_<id>          UStaticMeshComponent  (ground/ocean disc, void sphere)
│   └── <Tier>_<id>_<v>    one (H)ISM per tier and mesh variant v (candidate prefix), e.g.
│                          Terraces_ground-0_0, Monoliths_ground-0_0, Rubble_ground-0_0
├── ACosmicWebActor        adopted as cosmic_web/web:<realm_id>
├── ASoulGlyphActor × N    manifest glyphs; bound ones adopted as soul_unification/<bound_to>
└── stream entities        AHeartActor, AFateWeaveActor, ADreamNebulaActor ×n, AShadowInversionActor
```

### 6.2 Manifest application

| Situation | Action |
|---|---|
| New `realm_id` | Destroy the previous realm and all stream entities, then generate from scratch and snap metaphysics. |
| Same `realm_id`, new revision | Diff layers (§4.3), glyphs (§4.5) and topology (§4.4), then ease metaphysics over `transition_seconds`. |
| Invalid manifest | Log and ignore it. The current realm stays as it is. |

### 6.3 Visualizing metaphysics

Consumers MUST expose metaphysics through three channels:

1. A **global parameter collection** (`MPC_PrimordiaMetaphysics`) with scalars `Entropy`, `Luminosity`, `Coherence`, `Resonance`, `Inversion`, `Lucidity`, `TimeDilation` and the vector `Essence`, so any material in the project can react.
2. **Per-layer material parameters** with the same names (this works even without an MPC).
3. **Time:** every realm entity's local time scale (`CustomTimeDilation`) equals `time_dilation`.

Consumers SHOULD also show what the state *means* through a fourth channel:

4. **Atmosphere:** the realm's haze and colour grade, as a pure function of metaphysics, eased with them. The same state always looks the same. The reference mapping (`PrimordiaRealmAtmosphere.cpp`):

| Scalar | Reads as | Haze | Grade |
|---|---|---|---|
| `entropy` | disorder | thicker | film grain (above 0.3), chromatic fringe (above 0.4), a little contrast |
| `luminosity` | light | brighter | exposure bias `1.5·(l − 0.5)` stops, bloom `0.3 + 1.5·l` |
| `coherence` | order | kept low and layered (higher height falloff), paler (clear air) | saturation `0.55 + 0.6·c` |
| `inversion` | shadow | darkened toward black-violet, more opaque (max opacity `0.55 + 0.4·i`) | vignette `0.25 + 0.6·i`, contrast, shadows tinted toward the complement of `essence` |
| `lucidity` | clarity | thinner | less grain, a stronger `essence` tint |
| `essence` | signature hue | haze colour | highlight tint |

Haze stops at five times the realm's `bounds.radius`, so the sky stays visible. A level's own fog and post-process take precedence: the reference consumer's realm fog stays off when the level already has a height fog, and its grade is an unbound volume at priority −10.

### 6.4 Entity lifecycle

- **Spawn:** on the first upsert for an unknown `<type>/<id>`, through the actor factory.
- **Update:** each later upsert, with smoothing at frame rate.
- **Retire:** on `op: "retire"`, or when a visual entity has had no update for `EntityTimeoutSeconds` (default 5) **while connected**. Entities fade out (`RetireAlpha` 1 → 0) and are then destroyed.
- **Disconnect:** the realm freezes in place, and nothing times out until the link returns.

---

## 7. Versioning

- Additive fields, new layer kinds and new stream types are **minor** changes (`1.x`). Consumers ignore what they don't know.
- Renamed or removed fields, and changed units or semantics, are **major** changes (`prs: 2`).
- The determinism contract (§4.1) is part of the major version. Changing the PRNG or the labels changes every realm, so it requires PRS-2.
