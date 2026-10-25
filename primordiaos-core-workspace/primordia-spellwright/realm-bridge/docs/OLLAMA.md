# Ollama and PrimordiaOS

## Recommended: the LLM outside Unreal, designing by intent

The LLM runs in the **PrimordiaOS bridge** (Node), not in Unreal. It writes only a realm's *intent*, a flat ~60-token JSON object:

```json
{"name":"Glass Bell Sea","entropy":0.15,"luminosity":0.85,"coherence":0.9,"resonance":0.7,"inversion":0.05,
 "lucidity":0.8,"time":0.6,"hue":0.55,"layers":["ocean","sky","ring"],"web":"toroidal"}
```

Worldforge's `genesis()` then expands it deterministically into the full PRS-1 manifest (palettes, positions, params, glyphs and their intents, topology) in milliseconds, always valid. Generation time is dominated by output tokens, so writing about 60 instead of about 600 tokens is the speed-up. See the [benchmark](#benchmark-intent-vs-full-manifest) below.

```
Unreal ──generate_realm{description}──► bridge ──/api/chat (compact schema)──► Ollama
   ▲                                       │ intent → genesis() → manifest
   └──── realm_manifest (normal stream) ◄──┘ then ack {status:"done", seconds, tokens}
```

- **Unreal:** the **Generate Realm Via PrimordiaOS** node (Description → On Completed(Realm, Status) / On Failed). The bridge must be connected. Or send the raw command: *Send Primordia Command* `generate_realm` with `{"description":"..."}`.
- **Bridge:** `npm start -- --realm-model llama3.2:3b --ollama http://127.0.0.1:11434` (or `PRIMORDIA_REALM_MODEL` / `PRIMORDIA_OLLAMA_URL`). One design runs at a time; a second request is rejected with a clear error; `cancel_generate` aborts it.
- **Protocol:** `{"type":"command","name":"generate_realm","args":{"description":"...","model":"?","seed":0}}`
  - immediate ack: `{status:"started"}`
  - then the new `realm_manifest`, broadcast to every client
  - then the requester gets `{status:"done", realm_id, realm_name, intent, seconds, tokens, tokens_per_second}`, or `{ok:false, status:"failed", error}`
- **Code:** `node-bridge/src/realm/design.js` (schema, prompt, `normalizeIntent`, `intentToManifest`, `designRealm`) and `node-bridge/src/llm/ollama.js` (streaming client with an inactivity timeout, no 300 s header limit).
- **Determinism:** a realm without a design is byte-for-byte what it was before this feature. Designed layers use their own random stream.
- **The description's words are read too** (`node-bridge/src/realm/semantics.js`: `readDescription` → `applySemantics`, between `normalizeIntent` and `intentToManifest`). The intent is coarse: a small model picks layer kinds and metaphysics, but can't say "stone circles", and sometimes ignores "no ocean" or makes a "calm" realm stormy. The reader is deterministic, takes microseconds and costs no extra tokens:
  - **Feature phrases** add a layer kind and set its params (PRS-1 §3.3). Specific phrases claim their words before generic ones: "broken ring" → ring `arc 0.55, gap_count 4`; "stone circles" → ground `monolith_clusters 10`; "black hole" → void `debris 0.95`; "city" → spire_field `spire_clusters 8, falloff 2.5`; "milky way" → sky `band_strength 0.9`.
  - **Negation** removes a kind instead: "no ocean", "without stars".
  - **Quantity words** scale the counts of what they qualify: "countless islands" → 32, "a lonely island" → 2.
  - **Mood words** clamp a metaphysic into a range rather than adding to the model's value, so an agreeing model is left alone: "calm" → entropy ≤ 0.3; "nightmare" → inversion ≥ 0.65, luminosity ≤ 0.4; "dreamy" → lucidity ≥ 0.7.
  - **Colour, tempo and structure words** set hue, time and web: "emerald" → 0.33, "frozen" → time 0.4, "branching" → fractal_tree.
  - Every match is reported in `intent.understood` (in the `done` ack, and in the bridge log as `understood: ...`). Tests: `test/semantics.test.js`.
- **Moving the LLM to a stronger PC** is one setting: `--ollama http://that-pc:11434`. Unreal doesn't change.

### Benchmark: intent vs full manifest

Measured 2026-10-17 on this machine (Ryzen 3 4300U, Radeon integrated GPU via Vulkan) with `llama3.2:3b`, `node examples/realm-design-bench.js`. **Unreal Editor was open during the run** and used ~60% of the same GPU, so this is the realistic "while the game runs" case: generation speed was ~3 tok/s, versus ~7 tok/s with the GPU to itself.

| Description | Full manifest (LLM writes everything) | Intent (LLM decides, Worldforge expands) |
|---|---|---|
| calm floating archipelago | 222.8 s · 626 tokens | **47.7 s** · 127 tokens |
| nightmare cathedral of inverted light | 342.1 s · 1075 tokens | **35.4 s** · 129 tokens |
| frozen crystal lattice, violet aurora | 192.5 s · 557 tokens | **40.0 s** · 131 tokens |
| **median** | **222.8 s** | **40.0 s: 5.6× faster** |

- All 6 realms passed PRS-1 validation. The intent path also needs no repair step: genesis can't produce an invalid manifest.
- The full approach's time grows with whatever the model decides to write (one run wrote all 7 layer kinds in 1075 tokens). The intent path is bounded at about 130 tokens.
- The intent system prompt is also shorter (~245 vs ~550 tokens), and Ollama's prompt cache makes repeat calls cheaper still (prompt processing went from 33 to 480 tok/s after the first call).
- Expect roughly **15–20 s** per realm with the editor closed (GPU to itself), and roughly 2× less again with a dual-channel RAM upgrade.
- **Further lever, not done yet:** the model spends many of its ~130 tokens on JSON punctuation and two-decimal numbers. Asking for one decimal place, or a terser encoding, could cut that to roughly 70 tokens.

## Ollama inside Unreal (direct)

Still available for in-game chat, where Unreal talks to Ollama itself. The `PrimordiaOllama` module (part of the PrimordiaOS Realm Bridge plugin) lets Unreal talk to your **local Ollama** models directly. There is no Node process in between:

```
Unreal (editor / PIE / packaged game)
  UPrimordiaOllamaSubsystem ── HTTP, streamed NDJSON ──► Ollama  http://127.0.0.1:11434  ──► llama3.2:3b, qwen2.5:7b, gemma4 …
     ├─ Ask Ollama / conversations      → text, token by token
     └─ Generate Realm With Ollama      → PRS-1 manifest → ARealmRootActor (+ PrimordiaOS adopts it)
```

It does three things:

1. **Chat with streaming tokens:** one-shot questions, or conversations with memory (one per NPC, glyph, oracle…).
2. **Realm from a description:** "a drowned city of glass bells" becomes a model-designed, schema-constrained PRS-1 manifest, spawned in the level. If the PrimordiaOS bridge is connected, Worldforge adopts the realm and keeps evolving it.
3. **Model management:** list installed models, warm a model up, and auto-start `ollama serve` if it isn't running.

## Setup

1. Install Ollama and pull a model: `ollama pull llama3.2:3b`. Check with `ollama list`.
2. Build the plugin (see the [README](../README.md)). The module loads with it.
3. Optional: *Project Settings → Plugins → PrimordiaOS Ollama*.

| Setting | Default | Notes |
|---|---|---|
| Ollama Url | `http://127.0.0.1:11434` | |
| Default Model | `llama3.2:3b` | used whenever a node leaves Model empty |
| Allow Cloud Models | off | `:cloud` models run on ollama.com, so your prompts leave the machine. Refused unless enabled. |
| Auto Start Ollama | on | on connection failure, runs `ollama serve` once and retries for about 25 s |
| Keep Alive | `15m` | how long Ollama keeps the model loaded between requests |
| Warm Up On Startup | off | loads Default Model when the engine starts |
| Request Timeout / Activity Timeout | 900 s / 300 s | the activity timeout covers cold model loads |
| Default Max Tokens | 256 | caps reply length unless a request sets its own |
| Realm Model | *(empty = Default Model)* | model for realm generation |

## Performance on this machine

This PC (Ryzen 3 4300U, integrated Radeon graphics) runs Ollama **100% on the CPU**. Measured:

| Model | Speed | Cold load | Realm design (~600 tokens) |
|---|---|---|---|
| llama3.2:3b | ~5.5 tokens/s | ~58 s | ~2–3 min |
| qwen2.5:7b | ~1.3–2.1 tokens/s | ~85 s | ~6–7 min |

Unreal and Ollama share the same 4 cores, so expect slower numbers while the editor is busy. Practical advice:

- Use `llama3.2:3b` for anything interactive, and keep replies short (Default Max Tokens 256, or lower for NPC barks).
- Turn on **Warm Up On Startup**, or call *Warm Up Ollama Model* while loading a level, so players never wait for the cold load.
- Always show tokens as they stream (On Token) instead of waiting for On Completed.
- A GPU with 6 GB+ VRAM would make this roughly 10–20× faster; Ollama uses it automatically.

## Blueprint nodes (category PrimordiaOS → Ollama)

| Node | Pins / returns |
|---|---|
| **Ask Ollama** (async) | Prompt, System Prompt, *(advanced: Model, Temperature, Max Tokens)* → **On Token** (Text so far, Delta), **On Completed** (Text, Stats), **On Failed** (Error) |
| **Create Ollama Conversation** | System Prompt, *(Model, Temperature)* → conversation object. Store it in a variable. |
| **Send To Ollama Conversation** (async) | Conversation, Message → same pins as Ask Ollama; history is kept |
| Conversation → **Add Message** | inject context ("The realm's entropy just spiked to 0.9.") |
| Conversation → Clear History / Cancel / Is Busy | |
| **Generate Realm With Ollama** (async) | Description, Transform, *(Model, Send To PrimordiaOS, Seed)* → **On Progress** (Status), **On Completed** (Realm, Manifest Json), **On Failed** (Error) |
| **List Ollama Models** (async) | → Models (name, size, parameter size, family, quantization, is cloud) |
| Warm Up Ollama Model · Cancel All Ollama Requests · Get Default Ollama Model | |

Stats reports model, prompt tokens, generated tokens, tokens per second, load seconds, total seconds and done reason.

### Example: a talking soul glyph

```
Event BeginPlay
 └─ Create Ollama Conversation [System Prompt: "You are the Soul of this realm. Speak in one or two
      cryptic sentences. You feel the realm's metaphysics."] → set SoulChat

PrimordiaBridge.OnRealmManifest (Manifest)
 └─ SoulChat → Add Message [System, "Entropy is now {Manifest.Metaphysics.Entropy}, coherence {…Coherence}."]

Player interacts with glyph (Text)
 └─ Send To Ollama Conversation [SoulChat, Text]
     ├─ On Token     → SubtitleWidget.SetText(Text)       (streams in as it's generated)
     └─ On Completed → Play voice / fade subtitle
```

### Example: "speak a realm into being"

```
UI text box committed (Description)
 └─ Generate Realm With Ollama [Description, Transform = (0,0,0)]
     ├─ On Progress  → Loading text "Worldforge is dreaming… {Status}"
     ├─ On Completed → Print "Entered {Realm.Manifest.RealmName}"
     └─ On Failed    → Print Error
```

## Console commands

```
Primordia.Ollama.Models                         list installed models
Primordia.Ollama.Ask what lies beneath the void?
Primordia.Ollama.WarmUp [model]
Primordia.Ollama.Realm a nightmare cathedral of inverted light
Primordia.Ollama.Cancel
```

## How realm generation works

1. The system prompt and JSON schema come from `Resources/Ollama/realm_prompt.json`. Ollama's **structured outputs** constrain decoding to that schema, so even a 3B model returns parseable JSON with the right field names.
2. `PrimordiaOllamaRealm::RepairManifest` makes the design strict PRS-1:
   - unknown layer kinds are dropped and every number is clamped to its range
   - missing values get defaults
   - ids, order and the seed (FNV-1a of the realm name) are assigned
   - there is exactly one `soul` glyph, bound to the live Soul stream
   - realm ids are `realm-llm-<seed hex>`
3. The result is validated with the same parser as streamed manifests, spawned through the normal realm generator, and, when the bridge is connected, sent as `load_manifest` so PrimordiaOS evolves it from then on.

### What was verified, and what wasn't

- **Prompt and schema, against the live Ollama 0.40.4 server on this machine:** every completed run produced a valid PRS-1 manifest after repair, and values tracked the description (a "nightmare" prompt gave inversion 0.8–0.9 and luminosity 0.2). qwen2.5:7b needed at most a few clamps. llama3.2:3b sometimes omits the soul glyph or gives a zero radius, which the repair fixes. One llama3.2:3b run failed when Node's fetch gave up waiting for response headers; the Unreal client uses a 300 s activity timeout instead.
- **Repair rules:** `npm test` exercises the JS mirror (`node-bridge/examples/ollama-realm-repair.js`). Re-run the live check with `node examples/ollama-realm-check.js [model…]`.
- **Hand-off to PrimordiaOS:** a repaired manifest sent as `load_manifest` is accepted by the bridge and re-broadcast under the same realm id.
- **Not verified:** the C++ module has not been compiled yet, because the UE 5.4 install needs repairing first. The C++ repair is a line-by-line port of the tested JS; keep the two in step.

## Packaged builds

Chat works anywhere Ollama is reachable. Realm generation reads `Resources/Ollama/realm_prompt.json` from the plugin folder. For a packaged game, add the plugin's `Resources/Ollama` directory to *Project Settings → Packaging → Additional Non-Asset Directories to Copy*, or copy it next to the packaged plugin.

Players also need Ollama installed with the model pulled. The game cannot ship the model itself. You could bundle an installer, or point **Ollama Url** at a server you control.
