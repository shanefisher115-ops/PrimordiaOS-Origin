# The PrimordiaOS GPU pipeline: Onyx + Vulkan + MCP

Continuous realm building on the GPU. PrimordiaOS authors a realm over PRS-1; **MCP** (the
message, cognition and world-simulation pipeline) mutates its topology, evaluates its glyphs
and runs its actors' minds in compute kernels; a renderer draws the result; **Onyx** measures
what that cost the GPU and hands the numbers back to PrimordiaOS, whose tuner adjusts the realm.

```
   PrimordiaOS realm bridge (node-bridge)                              GPU host (either one)
  ┌───────────────────────────────────────┐   realm_manifest,     ┌──────────────────────────────────────────┐
  │ Worldforge authors + evolves the realm│   metaphysics,        │ 2  MCP  (compute / async compute queue)   │
  │ 1  next realm tick ───────────────────┼──▶ quality ──────────▶│    topology → structures → sigil field   │
  │                                       │                       │    → cognition → memory compress/recall  │
  │ 5  GPU tuner (src/gpu/tuner.js)       │                       │ 3  render (graphics queue)                │
  │    thins density / population ◀──────┼── gpu_telemetry ◀─────│ 4  Onyx: timestamps, pipeline stats,     │
  │    when Onyx says the GPU is loaded   │   (PRS-1, 4 Hz)       │    memory budget, per-actor/sigil cost    │
  └───────────────────────────────────────┘                       └──────────────────────────────────────────┘
        hosts:  realm-bridge/gpu (standalone Vulkan, run as a sidecar)  ·  unreal/PrimordiaGPU (inside UE 5.4)
```

| Piece | Where |
|---|---|
| GPU data contract, kernel bodies, behavior-tree compiler, host math (shared by both hosts) | [`unreal/PrimordiaGPU/Shaders/Shared/`](../unreal/PrimordiaGPU/Shaders/Shared/) |
| Standalone Vulkan engine: device + 3 queues, MCP, renderer, Onyx, swapchain, sidecar | [`gpu/`](../gpu/) |
| Unreal plugin: `OnyxRuntime`, `MCPComputeBridge`, `VulkanRealmRenderer`, `PrimordiaRealmGPU`, `OnyxInspector` | [`unreal/PrimordiaGPU/`](../unreal/PrimordiaGPU/) |
| Realm-bridge side: Onyx hub, GPU tuner, sidecar driver | [`node-bridge/src/gpu/`](../node-bridge/src/gpu/) |

## 1. Design decisions

**One source of truth for the kernels.** `Shaders/Shared/MCPTypes.ush` defines every GPU
record with `float4`/`uint4` members only, so the layout is identical under std430, D3D
structured-buffer packing and C++ (`static_assert`ed). Each kernel body (`MCPTopology.ush`,
`MCPCognition.ush`, …) names the buffers it uses; each host declares those names in its own
binding syntax (`[[vk::binding]]` for Vulkan, shader parameter structs for Unreal) and includes
the body. The same text compiles with DXC to SPIR-V and with Unreal's shader compiler. The
behavior-tree compiler (`MCPBehaviorTree.h`) and the CPU-side record builders (`MCPHost.h`) are
header-only C++ in the same folder, so a realm produces the same tick, sigils and population in
both hosts.

**Unreal keeps its own device.** Inside the editor, Unreal's RHI owns the GPU. A second
`VkDevice` in the same process could not draw into Unreal's scene without external-memory
interop, would double memory use (this machine's integrated GPU has a ~1 GB budget), and does not
exist at all when Unreal runs on D3D12, its Windows default. So inside Unreal, MCP runs as
global compute shaders on the render graph, on the graphics pipe or the async compute pipe
(project setting), and the realm renderer is a scene view extension. When Unreal does run on
Vulkan (`-vulkan`), `VulkanRealmRenderer` reads the native device through `IVulkanDynamicRHI`:
queue families and `VK_EXT_memory_budget` for Onyx. Raw Vulkan (instance, device, queues,
timeline semaphores, swapchain) lives in the standalone engine, which is what PrimordiaOS runs
headless next to the bridge.

**Three queue roles** (standalone). Graphics renders, async compute runs MCP, and a transfer
(DMA) queue uploads what PrimordiaOS sends. The engine maps the roles onto whatever the GPU has
(a compute family without graphics if one exists, else a second graphics-family queue, else
shared). Shared buffers use `VK_SHARING_MODE_CONCURRENT`, so there are no queue-family ownership
transfers; ordering and visibility across queues come only from timeline semaphores.

## 2. One tick, end to end (standalone engine)

```
transfer  ── upload tick record, sigils, trees (+ population) ── signal transfer(k)
               waits graphics(k-2), or graphics(k-1) for a new population; and compute(k-1)
compute       waits transfer(k) ── tick_reset │ topology │ structures │ sigil_field │ cognition
                                   │ memory_compress │ memory_retrieve │ readback ── signal compute(k)
graphics      waits compute(k) ── opaque (terrain, spires via vkCmdDrawIndirect, actors)
                                   │ overlay (glyph discs, memory strip) │ tonemap ── signal graphics(k)
host          before tick k: waits compute(k-2), graphics(k-2)  →  two frames in flight
```

Every buffer that tick *k* writes and frame *k* reads exists twice (tick parity), so compute for
*k + 1* overlaps rendering of *k*. Terrain, actors and recall are ping-pong pairs (a tick reads
the previous tick's output). The indirect draw's instance count is written by the structure
kernel, so the CPU never learns how many spires grew. Results come back through a readback
copy at the end of the compute submit and are read without waiting (`MCP::GetGPUResults`,
latest-wins).

## 3. MCP kernels

| Kernel | Threads | Does |
|---|---|---|
| `tick_reset` | 1 × 64 | zero the per-sigil cost counters, re-arm the spire draw's indirect args |
| `topology` | N² (8×8 groups) | relax the height field toward its target shape (seeded fBm, PRS-1 terraces by `coherence`, drifting turbulence by `entropy`), mass-conserving thermal erosion, moisture diffusion, temperature, biome (abyss/shore/meadow/forest/highland/crystal by `lucidity`/ashland by `inversion`) |
| `structures` | (N/4)² | spires on the local summits of high biomes, appended with an atomic on the indirect args |
| `sigil_field` | M³ (4×4×4 groups) | each PRS-1 glyph radiates aura light (`symmetry` lobes, `complexity`, a phase hashed from its `intent`) and a signed potential (souls/sigils/gates attract, wards repel harder as `inversion` rises) into a voxel volume; per-group shared-memory counters measure each glyph's cost |
| `cognition` | actors | perceive (terrain, potential and its gradient, last tick's recalled memory), update drives (energy, curiosity, fear, devotion), walk the actor's behavior tree, commit with hysteresis, steer and stand on the terrain, emit an episode |
| `memory_compress` | actors | salient episodes (a change of mind, a fright, a staggered periodic sample) quantized fp32 → int8 + scale into the actor's 64-slot ring |
| `memory_retrieve` | actors × 64 | each thread scores one memory against the current episode (cosine); a shared-memory reduction picks the best; next tick's cognition treats a remembered fright as a fright |

Behavior trees are compiled on the CPU into a threaded array (each node knows where to go on
success and failure), so the GPU walk is a bounded loop without a stack.

## 4. Onyx

API (both hosts): `BeginFrame(realm)`, `ReportPipelinePressure(id, {gpu_ms, budget_ms,
invocations, dispatches})`, `ReportActorLoad(actor, metrics)`, `EndFrame(realm, gpuStats)` →
sinks / `OnFrame`.

- **Pass timing.** Standalone: timestamp queries per scope; a scope's start is written at
  top-of-pipe after its barrier, and a scope that is followed by a barrier ends no later than the
  next scope begins. Without that clamp, an end-of-pipe stamp the AMD driver wrote late moved the
  cognition kernel's time into the sigil field. Render passes, not draws, are timed (draws in one
  pass overlap). Queue busy time is the union of a queue's scopes. Unreal: `FOnyxGPUTimer`
  writes boundary stamps (`RQT_AbsoluteTime`) between render-graph passes. Timestamps exist only
  on the graphics command list there, so with MCP on async compute Onyx keeps the whole-frame
  GPU time but not per-kernel times.
- **Memory.** `VK_EXT_memory_budget` (standalone through VMA; Unreal-on-Vulkan through
  `IVulkanDynamicRHI`), else the RHI's texture memory statistics.
- **Per-actor and per-sigil cost** are estimates. A GPU cannot time one thread, so each kernel's
  measured time is shared out by the work the kernels count per actor (tree nodes visited,
  sigils scanned, memories compared, episodes written) and per sigil (voxels touched). The
  shares add back up to the kernel time (tested).
- **Latency.** Queries are read only once a slot's timeline value says the GPU finished, so
  Onyx never stalls the pipeline; GPU numbers describe the tick two frames back.

The JSON form of a frame is the PRS-1 `gpu_telemetry` payload ([PRS-1 §2.6](PRS-1.md)).

## 5. Closing the loop in PrimordiaOS

`node-bridge/src/gpu/onyx.js` keeps the latest frame per source. A frame's load is
`max(frame_ms / budget_ms, memory_pressure / 0.9)`. `tuner.js` drops the realm quality by 0.1
once the smoothed load stays above 0.85 for 2 s. It raises it by 0.05 only after the load stays
below 0.55 for 4 s, with a 4 s cooldown between changes, so the realm never flickers. Quality
reaches the renderers two ways:

- **Unreal**: the delivered `realm_manifest` carries every layer density × quality, plus
  `gpu_quality`. Unreal already applies density-only changes cheaply, and `PrimordiaRealmGPU`
  also scales the MCP population by it. The authored manifest is never touched, so evolution
  continues from it.
- **Vulkan sidecar**: a `{"type":"quality","scale":q}` line; the engine simulates that share of
  its population (survivors keep their GPU state).

`set_quality {scale}` pins the quality by hand; `{scale: null}` hands it back to the tuner.

## 6. Unreal plugin (`unreal/PrimordiaGPU`)

| Module | Phase | Contents |
|---|---|---|
| `OnyxRuntime` | PostConfigInit | `FOnyx` (thread-safe telemetry API, JSON), `FOnyxGPUTimer` (render-graph timestamps), `UOnyxSubsystem` (frame delegates, on-screen inspector), console `Onyx.Show`, `Onyx.Dump`, `Onyx.Budget` |
| `MCPComputeBridge` | PostConfigInit | the 7 kernels as global shaders, `FMCPGPUState` (pooled buffers, render-graph passes, readbacks), `UMCPComputeSubsystem` (`SubmitRealmTick`, `SubmitActorCognition`, `SubmitSigilEvaluation`, `GetGPUResults`), `UMCPCognitionComponent`, `AMCPCrowdVisualizer`, project settings *PrimordiaOS MCP* |
| `VulkanRealmRenderer` | PostConfigInit | `FRealmAuraViewExtension` (marches each view ray through the sigil field after motion blur), `FVulkanRealmDevice` (native Vulkan probe, memory budget sampler); console `r.PrimordiaRealm.Aura*` |
| `PrimordiaRealmGPU` | Default | realm-bridge bindings: manifests → MCP, Onyx → `{"type":"telemetry"}` to the bridge; console `primordia.gpu.TelemetryHz`, `primordia.gpu.Crowd` |
| `OnyxInspector` | Editor | *Window → Onyx Inspector* |

Threading: the world subsystem ticks on the game thread (Unreal tick → realm tick) and enqueues
one render command per tick (game thread → MCP submission), which records the MCP passes into a
render graph. The aura extension reads the same pooled field buffer in the scene's graph
(render thread → realm rendering). Readbacks are polled on the render thread and handed to the
game thread under a lock.

To use it, add the plugin next to `PrimordiaOSRealmBridge` in a project's `Plugins/`. When the
bridge delivers a realm, MCP starts, a crowd appears, and telemetry flows back.

## 7. Running it

```bash
# standalone engine (needs the Vulkan SDK; builds shaders with DXC and validates them with spirv-val)
powershell -File realm-bridge/gpu/build.ps1 -Test        # build + GPU tests (validation layer on)
realm-bridge/gpu/build/bin/primordia_realmd --frames 600 --png realm.png   # headless
realm-bridge/gpu/build/bin/primordia_realmd --window                       # live window
# the realm bridge drives the engine as a sidecar
node realm-bridge/node-bridge/src/server.js --gpu-sidecar realm-bridge/gpu/build/bin/primordia_realmd.exe --gpu-actors 2048
```

Measured on this machine's AMD Radeon integrated GPU (Vulkan 1.3.260, 3 queue families), 2,048
actors, 256² terrain, 64³ sigil field, 1280×720: MCP about 0.9–1.4 ms of compute per tick and
rendering 1.6–2.2 ms, with headroom of about 87% against a 16.7 ms budget. Onyx flagged
`mcp.memory_retrieve` at about 117% of its budget share (2,048 groups × 64 threads), the first
thing to optimize.

## 8. Verification

- Standalone: `primordia_gpu_tests` (31 checks, Vulkan validation and synchronization
  validation on, 0 errors) covers GPU behavior-tree decisions against the CPU walk for 4,096
  actors (node counts included), int8 memory round trips (recall similarity ≥ 0.99998),
  structure budgets, sigil cost counters, Onyx timings and cost attribution. A 900-frame
  headless run of the whole loop also has 0 validation errors.
- Realm bridge: `node --test test/*.test.js`, 42 tests, including an end-to-end run through the
  real sidecar (`test/gpu.test.js`).
- Unreal: the plugin builds against UE 5.4 with no errors or warnings. Console `mcp.Demo
  [actors]` runs MCP on the reference realm in any world, and `mcp.Report` logs the result. With
  `-MCPSmokeTest`, the editor runs the demo, waits for GPU results and exits with a PASS/FAIL
  line. On D3D12 it passed: 240 ticks, 1,024 actors across all six actions, 9 spires, cost for all
  4 glyphs, and Onyx timing every kernel (topology 0.23 ms, sigil field 0.46 ms, cognition 0.08 ms,
  memory retrieval 0.26 ms; the standalone engine measures the same on this GPU).

## 9. Limits and next steps

- The `-vulkan` editor run has not completed yet. The first attempt never reached the test: it
  ran through a temporary `subst` drive (a workaround for MSVC's path limit in the scratch host
  project) that Unreal's shader compiler workers could not see, so they failed on engine shaders.
  Running it from a short real path will exercise `FVulkanRealmDevice` and the aura pass on Vulkan.
- Per-kernel Onyx timing in Unreal needs MCP on the graphics pipe (the default).
- Memory retrieval is the hottest kernel: a two-level search (coarse then fine) or subgroup
  reductions would cut its cost.
- The standalone renderer is a clear, honest visualization of MCP state, not a lit, shadowed
  AAA renderer; inside Unreal, the realm is drawn by the RealmBridge plugin's actors plus the aura.
