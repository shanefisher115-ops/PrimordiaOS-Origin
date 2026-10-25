# The voice of PrimordiaOS

The realm speaks. One LLM call decides **what to say and what to do**; the bridge speaks it with **Kokoro-82M** (local, Apache-2.0), applies the actions to the realm, and streams the audio into Unreal, where it plays **spatialized at the soul glyph**.

```
Unreal "Converse With PrimordiaOS" ─converse{input}─► bridge
                                                       │ Ollama (llama3.2:3b): {"say": "...", "actions": [...]}
                                                       │   say streams first → complete sentences → Kokoro → 24 kHz PCM
   APrimordiaVoiceActor ◄── voice packets (0.5 s chunks) ┤   speech starts while the model is still writing actions
   (USoundWaveProcedural, 3D)                          │ actions → perturb / evolve_realm / generate_realm / reseed
   realm changes      ◄── normal PRS-1 streams ────────┘
```

## Measured on this machine

Ryzen 3 4300U (4 cores), Radeon integrated GPU, 16 GB single-channel RAM. Ollama `llama3.2:3b` on the integrated GPU; Kokoro on the CPU. **Unreal Editor was open** throughout (~36–44% CPU), so these are realistic "while the game runs" numbers.

**Kokoro synthesis alone** (`node examples/voice-bench.js [fp32|q8]`). RTF = synthesis time ÷ speech length; below 1 means faster than real time.

| Precision | RTF | Memory (process) | "Antigravity matrix initialized at sector zero." (3.8 s of speech) |
|---|---|---|---|
| **fp32 (default)** | **0.87** | 718 MB | 2.5 s |
| q8 | 3.35 | 449 MB | 14.1 s |

The 8-bit model is **3.9× slower** on this CPU: its int8 kernels are slow here. That's why fp32 is the default; q8 only makes sense if memory is tight.

**End to end** (`node examples/converse-bench.js`), warm models:

| You say | It says | It does | First audio | LLM done |
|---|---|---|---|---|
| "Hello. Who are you?" | "I am PrimordiaOS, guardian of realms." | — | 7.2 s | 7.2 s |
| "Make the realm stormy and chaotic." | "The winds howl through Lumenne Hollow, stirring the air with a frenzy of energy." | luminosity 0.1, coherence 0.15, resonance 0.4 | 15.0 s | 25.4 s |
| "Calm everything down and let the light return." | "I calm the realm of Lumenne Hollow." | luminosity 0.9, coherence 0.9, entropy 0.1 | **7.3 s** | 16.9 s |

What these numbers mean:

- **Speaking `say` first works.** Speech started up to ~10 s before the model finished writing its actions.
- **The 6–15 s to first audio is almost all LLM time** (about 5 tokens/s while Unreal shares the GPU). Kokoro adds roughly 2–3 s for the first sentence. While the LLM runs, Kokoro runs about 2× slower than real time, because they compete for the same cores.
- **Action quality is the 3B model's limit.** "Calm … light returns" was exactly right. "Stormy and chaotic" lowered coherence but forgot to raise entropy. The prompt maps words to qualities explicitly; a 7B model would follow it better, at about 3× the time.
- **The claims in the original plan didn't hold here.** Synthesis is not "milliseconds", and memory is 718 MB, not under 500 MB. On a desktop CPU or GPU both improve a lot.

To hear it: [`examples/voice-sample-stormy.wav`](../examples/voice-sample-stormy.wav) is the "stormy" reply above, exactly as Unreal receives it.

## Bridge

```bash
npm install
npm start -- --voice-preload
```

`kokoro-js` is an optional dependency, and the bridge runs without it. The first use downloads the model into `node-bridge/.cache/models/` (~310 MB for fp32, ~88 MB for q8). Use `--voice-preload` to load Kokoro at startup rather than on the first utterance.

| Flag / env | Default | |
|---|---|---|
| `--voice-model` / `PRIMORDIA_VOICE_MODEL` | `llama3.2:3b` | LLM for converse |
| `--voice` / `PRIMORDIA_VOICE` | `af_heart` | Kokoro voice, e.g. `am_michael`, `bf_emma` (see kokoro-js) |
| `--voice-dtype` / `PRIMORDIA_VOICE_DTYPE` | `fp32` | `fp32` or `q8` |
| `--voice-preload` / `PRIMORDIA_VOICE_PRELOAD=1` | off | |

### Commands

| Command | Does |
|---|---|
| `converse {input, model?}` | LLM → `{say, actions}`; speaks while generating; runs up to 3 actions |
| `speak {text, speaker?, voice?}` | speaks text verbatim (no LLM) |
| `cancel_speech` | aborts the current utterance |

Each one acks `started`, streams `voice` packets, then acks `done`. The `done` ack carries `say`, `actions`, `action_results`, `firstAudioSeconds`, `llm_seconds`, `audioSeconds`, `synthSeconds` and `seconds`. On failure it carries `{ok:false, status:"failed", error}`. One utterance plays at a time; a second request is rejected with "already speaking".

Allowed actions (whitelisted and clamped; anything else is ignored):
- `perturb {key, value}`: entropy, luminosity, coherence, resonance, inversion, lucidity (0–1), or time_dilation (0.25–4)
- `evolve_realm`
- `generate_realm {description}`: the compact-intent realm design
- `reseed {seed}`

A perturbation now **holds for 20 s and then fades back over 10 s**. Previously the modules recomputed the value every tick, so `perturb` had no visible effect at all.

### `voice` packet (PRS-1 §2)

```json
{"type":"voice","id":"voice:soul","payload":{"utterance":3,"chunk":0,"text":"The storm rises.",
 "sample_rate":24000,"channels":1,"format":"s16le","pcm":"<base64>","final":false,"position":[0,0,14]}}
```

- Chunks are about 0.5 s of audio (~32 KB as base64), sent in order.
- `text` is set on the first chunk of each sentence, for subtitles.
- A last chunk with empty `pcm` and `final:true` ends the utterance.
- `position` is realm-local: the soul glyph.
- `spatial` (optional, default `true`): `false` marks a narrator heard at full volume everywhere. The [Sovereign](SOVEREIGN.md) speaks this way.
- Voice packets are never dropped, coalesced or rate-limited.

## The Sovereign

The [Primordia Sovereign](SOVEREIGN.md) uses this pipeline for its cycles: Ollama writes the cycle, its narration streams sentence by sentence into Kokoro, and the audio reaches Unreal as `voice:sovereign` with `spatial: false`.

## Unreal

- **APrimordiaVoiceActor** is spawned automatically by the actor factory for `voice:<speaker>` and attached to the realm at the speaker's position. It queues PCM into a `USoundWaveProcedural` played by a spatialized `UAudioComponent`: full volume within 4 m, fading to silence at 60 m. You can override this with an attenuation asset.
  - Events: **On Sentence** (text, for subtitles) and **On Finished Speaking**.
  - **Stop Speaking**, **Is Speaking**; a new utterance interrupts the old one (`bInterruptOnNewUtterance`).
  - It counts as busy while audio is queued, so the entity timeout never cuts off a reply that is still playing.
- **Converse With PrimordiaOS** (async): Input → On Completed(Text = what was said, Delta = action results, Stats) / On Failed.
- **Speak Via PrimordiaOS** (async): Text → same pins.

Example: a talking soul.

```
Player presses "Talk" → text box committed (Input)
 └─ Converse With PrimordiaOS [Input]
     ├─ On Completed → (optional) Print "{Delta}"         realm changes are already streaming in
     └─ On Failed    → Print Error
Find Primordia Entity [Type = voice, Id = "voice:soul"] → cast to PrimordiaVoiceActor
 └─ bind On Sentence → SubtitleWidget.SetText(Sentence)
```

## Not verified

- **The Unreal C++ has not been compiled:** `APrimordiaVoiceActor` and the two nodes are waiting on the UE install repair, like the rest of the plugin. The procedural-audio and attenuation APIs used were checked against the installed 5.4 headers.
- **The bridge side is tested** (`npm test`: sentence streaming, action whitelisting, PCM encoding, packet order and schema, speak/converse flows with a fake Ollama and a fake TTS) and was measured live, as shown above. Playback inside Unreal hasn't been heard yet.
