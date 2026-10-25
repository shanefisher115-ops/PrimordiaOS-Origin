# Primordia Sovereign: the realm's world-mind

The Sovereign is an autonomous narrator that runs the world in **cycles**. Each cycle, one local LLM call writes the next turn of the world. The bridge applies it to the live realm and **speaks the narration with Kokoro**, and Unreal plays that voice everywhere in the scene, like a narrator.

```
every cycle (60-90 s after the last one ends)
  bridge ──cycle prompt (realm state + species + last event)──► Ollama (llama3.2:3b)
     ◄── {"narration": ..., "title", "metaphysics", "evolve", "species", "event", "lore", "fab_assets"}
         narration streams first → sentences → Kokoro → voice:sovereign packets (spatial:false) → Unreal
         metaphysics → perturb (held 60 s, then fades back)     evolve → Worldforge evolves the realm
         species/event/lore → the chronicle (.cache/sovereign/)  whole cycle → sovereign_cycle packet (opt-in)
```

## Run it

```bash
cd realm-bridge/node-bridge
node src/server.js --sovereign                  # wakes 15 s after start, then cycles 90 s apart
node src/server.js --sovereign --sovereign-every 60 --sovereign-voice af_heart
```

Ollama must be running with the model pulled (`ollama pull llama3.2:3b`), and `kokoro-js` must be installed (`npm install`). The Kokoro model downloads on first use (see [VOICE.md](VOICE.md)). Then open Unreal on the realm (`PlayRealm-iGPU.bat`, pointed at the bridge's port) and listen.

| Flag / env | Default | |
|---|---|---|
| `--sovereign` / `PRIMORDIA_SOVEREIGN=1` | off | start cycling when the bridge starts |
| `--sovereign-every` / `PRIMORDIA_SOVEREIGN_EVERY` | `90` | seconds between the end of one cycle and the start of the next |
| `--sovereign-model` / `PRIMORDIA_SOVEREIGN_MODEL` | the voice model (`llama3.2:3b`) | any Ollama chat model; `gemma4` or `qwen2.5:7b` write richer cycles at about half the speed |
| `--sovereign-voice` / `PRIMORDIA_SOVEREIGN_VOICE` | `bf_emma` | Kokoro voice; try `af_heart`, `bm_george`, `bm_fable`, `am_michael` |
| `--sovereign-play-local` / `PRIMORDIA_SOVEREIGN_PLAY_LOCAL=1` | off | also play each cycle's WAV on this PC once it has been synthesized, for listening without Unreal |

### Commands

`{"type":"command","name":"sovereign","args":{"op":"..."}}`:

| op | Does |
|---|---|
| `start` | wake (first cycle after `first_seconds`, default 1) |
| `stop` | rest after the current cycle |
| `cycle` | run one cycle now, even while resting |
| `status` | `{enabled, running, cycle, species, voice, model, last}` |

Every op acks with the status. While the realm is already speaking (a `converse` or `speak`) or designing a realm, a due cycle waits 10 s and tries again.

## What a cycle contains

The system prompt is in `src/sovereign/sovereign.js` (`SOVEREIGN_SYSTEM`). The model writes about 300 tokens of JSON, constrained by `SOVEREIGN_SCHEMA`. **`narration` comes first** in the schema, so the voice starts after its first sentence instead of after the whole reply.

| Field | Becomes |
|---|---|
| `narration` | spoken through Kokoro as `voice:sovereign` |
| `title` | the cycle's name |
| `metaphysics` (0–2 of entropy, luminosity, coherence, resonance, inversion, lucidity, time_dilation) | `perturb`, clamped, held 60 s, then faded back over 10 s |
| `evolve` | Worldforge evolves the realm's layers |
| `species` (1–3: name, archetype, population, trait, look) | merged into the chronicle by name; population 0 = extinct; the 8 largest survive |
| `event` (name, kind, description) | `realm_events`; the last one is fed into the next cycle's prompt |
| `lore` (title, text) | the chronicle's lore |
| `fab_assets` (1–3 short ideas) | conceptual asset references for the renderer (not fetched from Fab) |

The bridge derives the **ecology** itself, so it costs no model tokens: total population, species count, diversity (Shannon evenness of the populations), stability (coherence, diversity and calm) and predator share.

Everything the model writes is validated (`normalizeCycle`). Unknown qualities, archetypes and event kinds are dropped or replaced, numbers are clamped, and text is capped. Nothing the model writes can break the realm.

**Why so compact?** The local models run at about 3–7 tokens/s here. A full species, evolution, ecology, biomes, lore and Fab-assets document per cycle would take minutes and delay the voice. The chronicle carries populations and history between cycles instead.

## Species in the realm

While the Sovereign is awake, every living species of its chronicle **appears in Unreal** as one streamed entity, `species:<slug>` (`src/sovereign/incarnation.js` → `ASpeciesActor`). The bridge decides what each species is; Unreal only animates it. The same species in the same realm always looks and lives the same way: its home, hue and seed come from its name.

| Archetype | Manifestation | In the realm | Bodies drawn (cap) |
|---|---|---|---|
| Photosynthetic, Fungal | rooted | clusters of glowing bulbs on stalks that breathe, on the real ground | 60 |
| Predatory | individual | long, low bodies with a glowing eye that roam the terraces fast (3.5 m/s) | 24 |
| Synthetic | individual | the same, slower (1.4 m/s), steel-blue | 32 |
| Collective | swarm | a flock of glowing motes orbiting a centre that wanders across the terraces, with waves through it | 400 |
| Elemental, Spectral | floating | turning shards, point down, hovering 6–14 m up with a light at their heart | 24 / 30 |
| Abyssal | abyssal | great flat ray-like shapes circling in the cloud sea 48 m under the realm | 10 |

- **Bodies follow the population, logarithmically.** A population of 13 draws a few, 1800 draws most of the cap and 5000 or more draws the full cap. A species never draws more bodies than its population.
- **A shrinking species loses its last-born bodies first.** A species that dies out (population 0, or dropped from the chronicle) gets one `retire` packet and fades over 3 s. When the Sovereign rests (`sovereign stop`), all its species fade with it.
- The stream runs at 1 Hz, and right after each cycle. Unreal retires an entity that isn't refreshed for 5 s, so a stopped bridge clears its creatures.

`species` payload: `name, archetype, manifestation (rooted|individual|swarm|floating|abyssal), population, bodies, position (home centre, realm-local m), range (m), color (linear RGB), glow, size (m), speed (m/s), seed, traits, look, born_cycle, cycle`.

## The chronicle

`node-bridge/.cache/sovereign/` (gitignored):
- `chronicle.json`: the current cycle number, species with their traits, and the last 12 events and lore entries. A restarted bridge continues from here.
- `cycles.jsonl`: every cycle, one JSON line each (narration, changes, evolution, ecology, lore, timings).
- `cycle-NNNN.wav`: each cycle's narration, exactly as Unreal received it.

Delete the folder to begin a new world.

## `sovereign_cycle` packet (opt-in)

Renderers don't receive it. A client gets it only after naming it in `hello`/`subscribe` streams (like `gpu_telemetry`). The payload is the cycle as applied: `cycle, realm, title, narration, metaphysics, evolve, changes, evolution, species, ecology, realm_events, lore, fab_assets, model, llm_seconds, tokens` (schema in `src/schemas.js`).

## Unreal

The Sovereign speaks through the same `APrimordiaVoiceActor` as the soul (spawned for `voice:sovereign`). Its packets carry `"spatial": false`, so the actor turns attenuation and spatialization off: full volume wherever the camera is. A spatial voice fades out by 60 m, and the bench camera is about 200 m from the soul glyph. Subtitles: bind the actor's **On Sentence**.

## Measured on this machine

Ryzen 3 4300U, integrated Radeon, with Unreal running the realm; `llama3.2:3b`, Kokoro fp32, voice `bf_emma` (`node examples/sovereign-bench.js [model] [voice] [out.wav]`):

| | Cold model | Warm model |
|---|---|---|
| first narration sentence written | 50 s | 20 s |
| first audio | 58 s | 26 s |
| cycle JSON complete | 80 s (286 tokens, 6.5 tok/s) | 67 s (336 tokens, 5.7 tok/s) |
| speech | — | 13 s (three sentences) |

The cycles were valid JSON both times: a new species, a weather event, lore, and two metaphysics pushes that matched the narration ("first light kindles" → luminosity 0.8).
