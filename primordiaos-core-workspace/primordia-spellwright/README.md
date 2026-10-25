# primordia-spellwright

A GPU-resident MCP server for PrimordiaOS. The MCP protocol layer itself —
framing, JSON-RPC parsing, method and tool routing, and reply serialization —
runs as Vulkan compute glyphs. The Rust host is only a conduit that moves
stdin bytes into GPU memory and GPU memory to stdout.

## The ritual (one tick)

| Glyph | Threadlings | Work |
|---|---|---|
| `frame.comp` | one per 4 request bytes | finds `\n` boundaries (MCP stdio framing) |
| `parse.comp` | one per message | locates `id` / `method` / `params`, FNV-1a hashes `method` and tool `name` against the grimoire |
| `respond.comp` | one per message | runs GPU tool spells, then measures → reserves (`atomicAdd`) → writes each reply |

The command buffer is recorded once and resubmitted every tick. All three glyphs
share one descriptor set of nine storage buffers (see `shaders/common.glsl`).
Every dispatch is indirect: the host sizes frame by the request bytes, and frame
sizes parse and respond by the messages it found (`ceil(messages / 64)` groups).

Replies within a tick are unordered; JSON-RPC clients match them by `id`.

## Tools

| Tool | Runs on |
|---|---|
| `mcp.vulkan.agentStatus` | GPU |
| `mcp.vulkan.readReliquary` | GPU |
| `mcp.vulkan.writeReliquary` | GPU |
| `mcp.vulkan.listDevices` | host (Vulkan API call, queued by the GPU) |
| `mcp.vulkan.pipelineInfo` | host (queued by the GPU) |

## Build and run

Needs Rust and `glslc` (found via `$GLSLC`, `$VULKAN_SDK/Bin`, or `PATH`).

```bash
cargo build --release
```

```bash
cat tests/session.jsonl | ./target/release/primordia-spellwright
```

`SPELLWRIGHT_DEVICE=<index>` picks a specific GPU (see `listDevices`).

## Benchmark

```bash
cargo run --release --example bench
```

One GPU pass versus a single-threaded CPU port of the same framing, parsing,
routing and reply work. Mixed `ping` / `readReliquary` / `agentStatus` requests,
AMD Radeon integrated GPU (Vulkan 1.3.260), 2026-10-14:

| Batch | Input | GPU pass p50 | GPU busy | GPU msg/s | CPU p50 | CPU msg/s | GPU vs CPU |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 0.1 KB | 171 µs | 111 µs | 5.9 K | 0.1 µs | 10 M | ~1700× slower |
| 100 | 8.7 KB | 474 µs | 358 µs | 211 K | 41 µs | 2.4 M | 11× slower |
| 4000 | 359 KB | 1.44 ms | 0.83 ms | 2.8 M | 1.75 ms | 2.3 M | 1.2× faster |

Memory is chosen per buffer: buffers the host reads back each tick (control,
messages, replies, host calls) use CPU-cached memory; buffers it only writes
use device-local write-combined memory. With uncached device-local memory for
everything, the 4000-message pass took 8.6 ms. The glyphs reserve message
slots and reply space with one atomic per subgroup. Neither change measurably
moved the numbers above relative to all-cached memory with per-message atomics.

## Multi-client daemon

One stdio server serves one client, which sends a request and waits, so it
never fills a batch. `spellwright-daemon` accepts many clients on
`127.0.0.1:7341` and runs each GPU pass over everything queued since the last
one, routing replies by message position (not id, since clients reuse ids).
`spellwright-bridge` connects a stdio MCP client to it.

```bash
cargo build --release --bins --examples
```

```bash
./target/release/spellwright-daemon
```

```bash
cat tests/session.jsonl | ./target/release/spellwright-bridge
```

Load test (`cargo run --release --example daemon_load`): each client sends 200
requests one at a time, waiting for each reply. No reply was misrouted or lost.

| Daemon | Clients | p50 latency | p95 latency | Total msg/s |
|---|---:|---:|---:|---:|
| one message per pass | 1 | 410 µs | 580 µs | 2.4 K |
| one message per pass | 64 | 20.0 ms | 27.4 ms | 3.1 K |
| batch whatever is queued (default) | 1 | 401 µs | 714 µs | 2.3 K |
| batch whatever is queued (default) | 16 | 986 µs | 1.28 ms | 15.8 K |
| batch whatever is queued (default) | 64 | 1.93 ms | 4.29 ms | 26.2 K |
| wait up to 1 ms to fill a batch | 64 | 2.61 ms | 4.43 ms | 23.2 K |

Waiting to fill a batch was slower at every client count than batching
whatever queued while the GPU was busy, so `--window-us` defaults to 0.

## Named-pipe engine

`primordia-engine` uses the same batching and routing as the TCP daemon
(shared in `src/batcher.rs`) over a local IPC endpoint: the named pipe
`\\.\pipe\primordia-spellwright` on Windows (overlapped I/O, local clients only)
or the domain socket `/tmp/primordia-spellwright.sock` on Unix. The Unix path
compiles but has not been run. `primordia-pipe-bridge` connects a stdio MCP
client to it. The wire format is still newline-delimited JSON-RPC.

```bash
./target/release/primordia-engine
```

```bash
cat tests/session.jsonl | ./target/release/primordia-pipe-bridge
```

## HTTP ingest

`primordia-ingest` is a separate, CPU-only path for webhooks. `POST /ingest`
on `127.0.0.1:$PORT` (default 8080) queues the body in a 1 MiB file-backed ring
(`primordia_stream.mmap` in the working directory) and returns 202, or 507
while the ring is full. A background worker drains the ring every 10 ms and
decodes each payload: size-prepended LZ4 if it decodes, otherwise the raw
bytes. A first byte of `0x01` (JSON) or `0x02` (bulk binary) is taken as a type
tag; untagged bodies are tagged `0x01`. Both types decode on the CPU (the GPU
decoder is slower, see below). Queued records are not kept across restarts.
`ecosystem.config.cjs` runs it under pm2.

```bash
./target/release/primordia-ingest
```

## Transport benchmark

`cargo run --release --example transport_bench` runs the same request mix over
stdio, TCP and the named pipe. Depth is how many requests each client keeps in
flight before waiting for replies (`daemon_load --depth K` does the same).
600 requests per client, 2026-10-14. Every row had 0 misrouted, missing or
duplicate replies.

| Transport | Clients | Depth | p50 latency | p95 latency | Total msg/s |
|---|---:|---:|---:|---:|---:|
| stdio | 1 | 1 | 342 µs | 485 µs | 2.9 K |
| tcp | 1 | 1 | 346 µs | 499 µs | 2.8 K |
| pipe | 1 | 1 | 324 µs | 482 µs | 3.0 K |
| stdio | 1 | 64 | 820 µs | 2.05 ms | 62.6 K |
| tcp | 1 | 64 | 948 µs | 1.37 ms | 60.9 K |
| pipe | 1 | 64 | 1.07 ms | 2.79 ms | 47.3 K |
| tcp | 64 | 1 | 1.88 ms | 2.97 ms | 31.5 K |
| pipe | 64 | 1 | 1.22 ms | 2.53 ms | 44.6 K |
| tcp | 64 | 8 | 3.74 ms | 4.63 ms | 139 K |
| pipe | 64 | 8 | 1.63 ms | 2.83 ms | 287 K |
| tcp | 64 | 64 | 15.2 ms | 18.6 ms | 267 K |
| pipe | 64 | 64 | 7.02 ms | 8.79 ms | 552 K |

- One client, one request at a time: all three transports take about 330 µs,
  set by the GPU pass, not the transport.
- Keeping requests in flight matters most: one client at depth 64 is about
  20× faster than at depth 1.
- Under heavy load the pipe roughly doubles TCP throughput and halves latency.
- The best result, 552 K msg/s, is still about 5× below what a single
  4000-message GPU pass handles (2.8 M msg/s).

## Compressed chunk store

- `primordia-pack` turns a file into a `.ppk` pack of independent 64 KiB LZ4
  blocks plus an index (`--verify` checks it on the CPU).
- `lz4_decode.comp` decodes one block per GPU thread, bounds-checking every
  read and write and reporting a per-block error for malformed input.
- `storage::DirectReader` reads with unbuffered overlapped I/O straight into
  the decoder's GPU-visible buffer; a buffered mode exists for comparison.
- `chunk_cache::ChunkStore` is a CPU-side LRU of decoded blocks that batches
  misses into one read and one decode, on the GPU or the CPU.

Tests: round trips through the GPU, corrupted and truncated blocks (no writes
outside the job's range), reader alignment edge cases, cache eviction and
concurrent readers.

`cargo run --release --example decompress_bench`: 256 MiB mixed corpus packed
to 120 MiB (4096 blocks), 4 CPU threads, 2026-10-14. Every block verified.

| Decode | GB/s of decoded output |
|---|---:|
| CPU, lz4_flex, 1 thread | 2.30 |
| CPU, lz4_flex, 4 threads | 3.72 |
| GPU, `lz4_decode.comp` | 0.49 |
| Disk → decoded: buffered read (warm cache) + CPU, 4 threads | 1.59 |
| Disk → decoded: buffered read (warm cache) + GPU | 0.41 |
| Disk → decoded: direct read + GPU | 0.24 |

The GPU decoder is about 7.6× slower than four CPU threads. LZ4 decoding is
sequential within a block, so each block runs on a single GPU thread, which
is far slower than a CPU core on serial work: one block alone takes about
14 ms. Use the CPU decoder; the GPU path is kept for experiments.
Direct reads ran at 0.23 GB/s here; warm buffered reads come from RAM, so the
two are not a like-for-like disk comparison.

## Limits

- 1 MiB of input, 4096 messages and 4 MiB of replies per tick; on overflow the
  host retries with half the input.
- The parser locates values as raw spans and does not unescape strings, so
  method and tool names must match byte-for-byte.
- For one client sending one request at a time, each tick's submit-and-fence
  round trip costs far more than CPU parsing (see the benchmark). The GPU path
  pays off only when thousands of messages arrive together.
