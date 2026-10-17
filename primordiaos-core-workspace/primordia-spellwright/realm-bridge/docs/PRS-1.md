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

Commands: `evolve_realm` · `reseed {seed}` · `perturb {key, value}` (any metaphysical scalar) · `load_manifest {manifest}`.

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

**`realm_manifest`**: a complete PRS-1 manifest (§3).

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
      "palette": [[0.5045, 0.3291, 0.5686], [0.0282, 0.259, 0.4971]], "params": { "roughness": 0.2185, "terrace_count": 5 } }
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
| `ground` | `roughness` (unit), `terrace_count` (1–12) | Collidable disc of `radius`, stepped terraces, monoliths scattered on it |
| `ocean` | `wave_height` (m), `wave_speed` | Disc surface with floating motes |
| `sky` | `star_count` | Stars on a hemisphere of `radius`, raised by `altitude` |
| `ring` | `thickness` (m), `tilt_deg` | Shards orbiting at `radius`, tilted about +X |
| `lattice` | `cell_size` (m) | Crystal nodes on a cubic grid clipped to a sphere |
| `void` | `aperture` (unit) | Inward-facing hollow sphere of diameter `2·radius·aperture` |
| `spire_field` | `max_height` (m) | Cones up to `max_height` |

`palette[0]` is the primary color and `palette[1]` the secondary. Every numeric param MUST also be exposed to the layer material by its exact name.

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

`{ id, kind: soul|sigil|ward|gate, position, scale (diameter m), symmetry: 1–64, complexity, hue, bound_to? }`

`bound_to` names a live entity id of the matching stream (for `kind: soul`, that is `soul_unification`). A consumer MUST render a bound glyph and its live entity as **one** object: the static spec seeds it, and the live stream drives it afterwards.

---

## 4. Procedural generation rules

### 4.1 Determinism

All randomness MUST derive from `seed` through **mulberry32** seeded with `subSeed(seed, label) = seed XOR FNV-1a-32(label)` (FNV-1a over UTF-16 code units). The labels are:

| Purpose | Label |
|---|---|
| Worldforge genesis | `realm` |
| Worldforge evolution | `worldforge.evolve` |
| Topology synthesis | `topology` |
| Layer scatter | `layer:<layer id>` |

Reference implementations: `node-bridge/src/prng.js` and `FPrimordiaRandom` (`PrimordiaTopology.cpp`). They are bit-identical, so the same manifest produces the same realm on every machine and in every engine.

### 4.2 Units and placement

Each layer gets a root at `(0, 0, altitude)`. Scatter positions are relative to that root. Glyph positions and the topology center are relative to the realm root.

### 4.3 Layer scatter

For each layer the consumer generates an ordered **candidate list** from its layer stream: first the *fixed* elements (for example, ground terraces), then up to `MaxScatter` scatter elements. It shows `fixed + round(density × scatter)` candidates **as a prefix** of that list. Density changes therefore add or remove elements at the tail, and the rest of the realm never reshuffles. Lattice candidates are Fisher-Yates-shuffled with the layer stream before truncation, so a prefix samples the whole lattice evenly.

A layer's **structural signature** covers `kind`, `altitude`, `radius`, `palette` and `params`, but not `density`. If the signature changes the layer MUST be rebuilt; a density-only change MUST be applied in place.

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
3. Layers: a `ground` (70%) or an `ocean` first, then a `sky`, then 1–3 extra kinds drawn **without replacement** from {ring, lattice, void, spire_field}, each with kind-specific params.
4. Glyphs: the bound `soul` glyph at `[0, 0, 14]`, plus 2–4 sigils/wards/gates on a 32 m circle.
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
│   ├── Base_<id>     UStaticMeshComponent  (ground/ocean disc, void sphere)
│   └── Scatter_<id>  UInstancedStaticMeshComponent (candidate prefix)
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
