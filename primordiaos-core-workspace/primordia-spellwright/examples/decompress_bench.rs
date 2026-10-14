//! Decompression benchmark for the pack pipeline: CPU vs GPU LZ4 decode, disk to
//! decoded with buffered and direct reads, and the chunk cache under a Zipf-like
//! random-access load. Every decoded block is checked against the corpus.
//!
//!     cargo run --release --example decompress_bench
//!
//! The ~256 MiB corpus (JSON-like text, release executables, random bytes) and
//! its pack are built once in target/bench-data and reused.

use primordia_spellwright::chunk_cache::{ChunkStore, Decode, StoreOptions};
use primordia_spellwright::decoder::{BlockJob, GpuDecoder};
use primordia_spellwright::pack::{self, BlockEntry, PackHeader};
use primordia_spellwright::storage::{DirectReader, ReadMode, ReadPlan};
use std::error::Error;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

type Res<T> = Result<T, Box<dyn Error>>;

const CORPUS_BYTES: usize = 256 << 20;
const SEGMENT: usize = 1 << 20;
const RUNS: usize = 3;

struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }
    fn unit(&mut self) -> f64 {
        (self.next() >> 11) as f64 / (1u64 << 53) as f64
    }
}

fn bench_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("target").join("bench-data")
}

/// Segments of 1 MiB, in a fixed 10-step rotation: 5 JSON-like, 3 binary, 2 random.
fn build_corpus() -> Res<Vec<u8>> {
    const WORDS: [&str; 16] = [
        "glyph", "ritual", "reliquary", "spell", "agent", "kernel", "router", "envelope", "perceive", "decide",
        "persist", "vulkan", "compute", "batch", "primordia", "outbox",
    ];
    let mut binary = Vec::new();
    let release = Path::new(env!("CARGO_MANIFEST_DIR")).join("target").join("release");
    if let Ok(dir) = std::fs::read_dir(&release) {
        let mut exes: Vec<PathBuf> = dir
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().is_some_and(|x| x == "exe" || x == "rlib"))
            .collect();
        exes.sort();
        for p in exes {
            binary.extend(std::fs::read(p)?);
        }
    }
    if binary.len() < SEGMENT {
        binary.extend(std::fs::read(std::env::current_exe()?)?);
    }
    let mut rng = Rng(0x9E37_79B9_7F4A_7C15);
    let mut out = Vec::with_capacity(CORPUS_BYTES + SEGMENT);
    let (mut bin_pos, mut id) = (0usize, 0u64);
    for seg in 0..CORPUS_BYTES / SEGMENT {
        let end = out.len() + SEGMENT;
        match seg % 10 {
            0..=4 => {
                while out.len() < end {
                    id += 1;
                    let r = rng.next();
                    let mut msg = String::new();
                    for k in 0..(3 + r % 9) {
                        msg.push_str(WORDS[((r >> (4 * k)) & 15) as usize]);
                        msg.push(' ');
                    }
                    let line = format!(
                        "{{\"jsonrpc\":\"2.0\",\"id\":{id},\"method\":\"tools/call\",\"params\":{{\"name\":\"mcp.{}.{}\",\"t\":{},\"depth\":{},\"msg\":\"{}\"}}}}\n",
                        WORDS[(r >> 40) as usize & 15],
                        WORDS[(r >> 44) as usize & 15],
                        1_700_000_000_000u64 + id * 17 + (r >> 50),
                        r % 8,
                        msg.trim_end()
                    );
                    out.extend_from_slice(line.as_bytes());
                }
                out.truncate(end);
            }
            5..=7 => {
                while out.len() < end {
                    let take = (end - out.len()).min(binary.len() - bin_pos);
                    out.extend_from_slice(&binary[bin_pos..bin_pos + take]);
                    bin_pos = (bin_pos + take) % binary.len();
                }
            }
            _ => {
                while out.len() < end {
                    out.extend_from_slice(&rng.next().to_le_bytes());
                }
            }
        }
    }
    Ok(out)
}

fn load_or_build() -> Res<(Vec<u8>, PathBuf)> {
    let dir = bench_dir();
    std::fs::create_dir_all(&dir)?;
    let corpus_path = dir.join("corpus.bin");
    let pack_path = dir.join("corpus.ppk");
    let corpus = match std::fs::read(&corpus_path) {
        Ok(c) if c.len() == CORPUS_BYTES => c,
        _ => {
            eprintln!("building corpus in {} ...", corpus_path.display());
            let c = build_corpus()?;
            std::fs::write(&corpus_path, &c)?;
            std::fs::remove_file(&pack_path).ok();
            c
        }
    };
    let fresh = pack::read_index(&pack_path).is_ok_and(|(h, _)| h.original_size == corpus.len() as u64);
    if !fresh {
        eprintln!("packing {} ...", pack_path.display());
        pack::write_pack(&corpus_path, &pack_path, pack::DEFAULT_BLOCK_SIZE)?;
    }
    Ok((corpus, pack_path))
}

fn gbps(bytes: u64, d: Duration) -> f64 {
    bytes as f64 / d.as_secs_f64() / 1e9
}

fn best<T>(runs: usize, mut f: impl FnMut() -> Res<(Duration, T)>) -> Res<(Duration, T)> {
    let mut best: Option<(Duration, T)> = None;
    for _ in 0..runs {
        let r = f()?;
        if best.as_ref().is_none_or(|b| r.0 < b.0) {
            best = Some(r);
        }
    }
    Ok(best.unwrap())
}

fn threads() -> usize {
    std::thread::available_parallelism().map_or(1, |n| n.get())
}

/// Decodes blocks `first..first+n` (compressed bytes at `offsets` in `src`) into `out`, on `t` threads.
fn cpu_decode(index: &[BlockEntry], first: usize, src: &[u8], offsets: &[usize], out: &mut [u8], bs: usize, t: usize) -> Res<()> {
    let n = offsets.len();
    let per = n.div_ceil(t.max(1)).max(1);
    std::thread::scope(|s| -> Res<()> {
        let mut handles = Vec::new();
        for (c, chunk) in out.chunks_mut(per * bs).enumerate() {
            handles.push(s.spawn(move || -> Result<(), String> {
                for k in c * per..((c + 1) * per).min(n) {
                    let e = &index[first + k];
                    let dst = &mut chunk[(k - c * per) * bs..];
                    pack::decode_block_cpu(&src[offsets[k]..offsets[k] + e.len() as usize], e, dst)
                        .map_err(|e| e.to_string())?;
                }
                Ok(())
            }));
        }
        for h in handles {
            h.join().unwrap()?;
        }
        Ok(())
    })
}

/// Consecutive block batches `[start, end)` that fit the decoder's buffers.
fn batches(index: &[BlockEntry], in_cap: usize, out_cap: usize) -> Vec<(usize, usize)> {
    let mut v = Vec::new();
    let mut start = 0;
    while start < index.len() {
        let mut end = start;
        let base = index[start].comp_offset / 4096 * 4096;
        while end < index.len() {
            let e = &index[end];
            let in_end = (e.comp_offset + e.len() as u64).div_ceil(4096) * 4096 - base;
            let out_end = (end + 1 - start) * index[start].raw_size as usize;
            if in_end as usize > in_cap || out_end > out_cap {
                break;
            }
            end += 1;
        }
        v.push((start, end));
        start = end;
    }
    v
}

fn jobs_for(index: &[BlockEntry], start: usize, offsets: &[usize], bs: usize) -> Vec<BlockJob> {
    offsets
        .iter()
        .enumerate()
        .map(|(k, &o)| BlockJob::new(&index[start + k], o as u32, (k * bs) as u32))
        .collect()
}

fn check(name: &str, got: &[u8], want: &[u8]) -> Res<()> {
    if got != want {
        let at = got.iter().zip(want).position(|(a, b)| a != b).unwrap_or(got.len().min(want.len()));
        return Err(format!("{name}: decoded output differs from corpus at byte {at}").into());
    }
    Ok(())
}

/// Blocks of `got` that differ from `want` (the GPU rows report this instead of aborting).
fn count_bad(got: &[u8], want: &[u8], bs: usize) -> usize {
    got.chunks(bs).zip(want.chunks(bs)).filter(|(a, b)| a != b).count()
}

fn verdict(bad: usize, of: usize) -> String {
    if bad == 0 {
        "verified".into()
    } else {
        format!("**{bad} of {of} blocks WRONG**")
    }
}

struct Row {
    test: String,
    gbps: f64,
    note: String,
}

fn main() -> Res<()> {
    let (corpus, pack_path) = load_or_build()?;
    let (header, index): (PackHeader, Vec<BlockEntry>) = pack::read_index(&pack_path)?;
    let bs = header.block_size as usize;
    let raw_total = header.original_size;
    let pack_bytes = std::fs::read(&pack_path)?;
    let comp_total: u64 = index.iter().map(|e| e.len() as u64).sum();
    let stored = index.iter().filter(|e| e.stored()).count();
    let t = threads();
    println!(
        "corpus {} MiB, pack {} MiB ({:.1}% of original), {} blocks of {} KiB ({} stored uncompressed), {} CPU threads",
        raw_total >> 20,
        pack_bytes.len() >> 20,
        100.0 * comp_total as f64 / raw_total as f64,
        index.len(),
        bs >> 10,
        stored,
        t
    );
    let mut rows: Vec<Row> = Vec::new();
    let mut out = vec![0u8; raw_total as usize];
    let offsets_all: Vec<usize> = index.iter().map(|e| e.comp_offset as usize).collect();

    eprintln!("  CPU decode");
    // ---- CPU decode, from memory ----
    for (label, nt) in [("CPU decode, lz4_flex 1 thread", 1), ("CPU decode, lz4_flex all cores", t)] {
        let (d, ()) = best(RUNS, || {
            let t0 = Instant::now();
            cpu_decode(&index, 0, &pack_bytes, &offsets_all, &mut out, bs, nt)?;
            Ok((t0.elapsed(), ()))
        })?;
        check(label, &out, &corpus)?;
        rows.push(Row { test: label.into(), gbps: gbps(raw_total, d), note: format!("{nt} threads, in memory") });
    }

    // ---- GPU decode, from memory ----
    let mut dec = match GpuDecoder::new() {
        Ok(d) => Some(d),
        Err(e) => {
            println!("GPU decoder unavailable: {e}");
            None
        }
    };
    if let Some(dec) = dec.as_mut() {
        println!("GPU: {}", dec.device_name);
        let groups = batches(&index, dec.input_capacity(), dec.output_capacity());
        // Probe: one small batch, to show the per-block GPU rate before the long runs.
        for probe in [1usize, 16, 256] {
            let (s, e) = (0, probe);
            let end = (index[e - 1].comp_offset + index[e - 1].len() as u64) as usize;
            let base = index[s].comp_offset as usize;
            let src = pack_bytes[base..end].to_vec();
            dec.input_mut()[..src.len()].copy_from_slice(&src);
            let offs: Vec<usize> = (s..e).map(|i| index[i].comp_offset as usize - base).collect();
            let t0 = Instant::now();
            dec.decode(&jobs_for(&index, s, &offs, bs))?;
            eprintln!(
                "  probe {probe} blocks: wall {:.2} ms, gpu {:.2} ms, {} dispatches",
                t0.elapsed().as_secs_f64() * 1e3,
                dec.last_gpu_ns.unwrap_or(f64::NAN) / 1e6,
                dec.last_dispatches
            );
        }
        out.fill(0);
        let (d, (stage, gpu_ns, copy)) = best(RUNS, || {
            let (mut wall, mut stage, mut copy, mut gpu_ns) = (Duration::ZERO, Duration::ZERO, Duration::ZERO, 0.0);
            for &(s, e) in &groups {
                let base = index[s].comp_offset as usize;
                let end = (index[e - 1].comp_offset + index[e - 1].len() as u64) as usize;
                let t0 = Instant::now();
                dec.input_mut()[..end - base].copy_from_slice(&pack_bytes[base..end]);
                stage += t0.elapsed();
                let offs: Vec<usize> = (s..e).map(|i| index[i].comp_offset as usize - base).collect();
                let jobs = jobs_for(&index, s, &offs, bs);
                let t1 = Instant::now();
                let res = dec.decode(&jobs)?;
                wall += t1.elapsed();
                let n = (e - s - 1) * bs + index[e - 1].raw_size as usize;
                let t2 = Instant::now();
                out[s * bs..s * bs + n].copy_from_slice(&res[..n]);
                copy += t2.elapsed();
                gpu_ns += dec.last_gpu_ns.unwrap_or(f64::NAN);
            }
            Ok((wall, (stage, gpu_ns, copy)))
        })?;
        let bad = count_bad(&out, &corpus, bs);
        rows.push(Row {
            test: "GPU decode, wall (decode calls)".into(),
            gbps: gbps(raw_total, d),
            note: format!(
                "{} batches; staging copy-in {:.2} GB/s, copy-out {:.2} GB/s; {}",
                groups.len(),
                gbps(comp_total, stage),
                gbps(raw_total, copy),
                verdict(bad, index.len())
            ),
        });
        rows.push(Row {
            test: "GPU decode, GPU-only (timestamps)".into(),
            gbps: raw_total as f64 / gpu_ns,
            note: format!("{:.1} ms of GPU time", gpu_ns / 1e6),
        });
    }
    drop(pack_bytes);

    // ---- End to end: disk -> decoded ----
    let mut host_in = AlignedBuf::new(65 << 20);
    let e2e: Vec<(&str, ReadMode, bool)> = {
        let mut v = vec![("buffered read + CPU decode (all cores)", ReadMode::Buffered, false)];
        if cfg!(windows) {
            v.push(("direct read + CPU decode (all cores)", ReadMode::Direct, false));
        }
        if dec.is_some() {
            v.push(("buffered read + GPU decode", ReadMode::Buffered, true));
            if cfg!(windows) {
                v.push(("direct read + GPU decode", ReadMode::Direct, true));
            }
        }
        v
    };
    for (label, mode, gpu) in e2e {
        let mut reader = DirectReader::open(&pack_path, mode)?;
        let (in_cap, out_cap) = match (&dec, gpu) {
            (Some(d), true) => (d.input_capacity(), d.output_capacity()),
            _ => (host_in.len(), usize::MAX),
        };
        let groups = batches(&index, in_cap, out_cap);
        let plans: Vec<ReadPlan> = groups
            .iter()
            .map(|&(s, e)| reader.plan(&(s..e).map(|i| (index[i].comp_offset, index[i].len() as usize)).collect::<Vec<_>>()))
            .collect::<Result<_, _>>()?;
        // Every pass checks its output against the corpus outside the timed region.
        let mut pass = |out: &mut [u8]| -> Res<(Duration, Duration, u64, usize)> {
            let (mut total, mut read_t, mut read_bytes, mut bad) = (Duration::ZERO, Duration::ZERO, 0u64, 0usize);
            for (&(s, e), plan) in groups.iter().zip(&plans) {
                let n = (e - s - 1) * bs + index[e - 1].raw_size as usize;
                let want = &corpus[s * bs..s * bs + n];
                let t0 = Instant::now();
                if gpu {
                    let d = dec.as_mut().unwrap();
                    read_bytes += reader.read(plan, d.input_mut())?;
                    read_t += t0.elapsed();
                    let res = d.decode(&jobs_for(&index, s, &plan.offsets, bs))?;
                    total += t0.elapsed();
                    bad += count_bad(&res[..n], want, bs);
                } else {
                    let buf = host_in.get();
                    read_bytes += reader.read(plan, buf)?;
                    read_t += t0.elapsed();
                    let dst = &mut out[s * bs..s * bs + n];
                    cpu_decode(&index, s, buf, &plan.offsets, dst, bs, t)?;
                    total += t0.elapsed();
                    check(label, dst, want)?;
                    dst.fill(0);
                }
            }
            Ok((total, read_t, read_bytes, bad))
        };
        // One untimed pass first, so buffered rows measure a warm OS file cache.
        eprintln!("  e2e: {label}");
        let mut bad = pass(&mut out)?.3;
        let (d, (read_t, read_bytes)) = best(RUNS, || {
            let (d, r, b, x) = pass(&mut out)?;
            bad = bad.max(x);
            Ok((d, (r, b)))
        })?;
        rows.push(Row {
            test: format!("e2e: {label}"),
            gbps: gbps(raw_total, d),
            note: format!(
                "read {:.2} GB/s of pack ({} MiB), {} batches{}; {}",
                gbps(read_bytes, read_t),
                read_bytes >> 20,
                groups.len(),
                if mode == ReadMode::Buffered { ", warm OS cache" } else { ", bypasses OS cache" },
                verdict(bad, index.len())
            ),
        });
    }
    drop(dec); // ChunkStore opens its own decoder.

    // ---- Chunk cache: Zipf-like random access ----
    let n = index.len();
    let mut rng = Rng(0xD1B5_4A32_D192_ED03);
    let mut perm: Vec<usize> = (0..n).collect();
    for i in (1..n).rev() {
        perm.swap(i, rng.next() as usize % (i + 1));
    }
    let mut cdf = Vec::with_capacity(n);
    let mut acc = 0.0;
    for r in 0..n {
        acc += 1.0 / (r as f64 + 1.0);
        cdf.push(acc);
    }
    let zipf = |rng: &mut Rng| perm[cdf.partition_point(|&c| c < rng.unit() * acc).min(n - 1)];
    const PER_REQ: usize = 16;
    const WARM_REQS: usize = 500;
    const REQS: usize = 2000;
    let requests: Vec<Vec<usize>> = (0..WARM_REQS + REQS).map(|_| (0..PER_REQ).map(|_| zipf(&mut rng)).collect()).collect();
    let mut configs = vec![("CPU", StoreOptions { read: StoreOptions::default().read, decode: Decode::Cpu })];
    if GpuDecoder::new().is_ok() {
        configs.insert(0, ("GPU", StoreOptions::default()));
    }
    let mut cache_rows = Vec::new();
    for pct in [10usize, 50] {
        let cap = raw_total as usize * pct / 100;
        for &(name, opts) in &configs {
            let store = ChunkStore::open_with(&pack_path, cap, opts).map_err(|e| e.to_string())?;
            eprintln!("  chunk cache {pct}% {name}");
            let bad = std::cell::Cell::new(0usize);
            let verify = |req: &[usize], got: &[Arc<[u8]>]| -> Res<()> {
                for (&b, d) in req.iter().zip(got) {
                    bad.set(bad.get() + count_bad(d, &corpus[b * bs..(b * bs + bs).min(corpus.len())], bs));
                }
                Ok(())
            };
            for req in &requests[..WARM_REQS] {
                let got = store.get_many(req).map_err(|e| e.to_string())?;
                verify(req, &got)?;
            }
            store.reset_stats();
            let mut busy = Duration::ZERO;
            for req in &requests[WARM_REQS..] {
                let t0 = Instant::now();
                let got = store.get_many(req).map_err(|e| e.to_string())?;
                busy += t0.elapsed();
                verify(req, &got)?;
            }
            let s = store.stats();
            cache_rows.push(format!(
                "| {pct}% ({} MiB) | {name} | get_many x{PER_REQ} | {:.1}% | {:.0} | {:.1} us | {:.2} GB/s | {} |",
                cap >> 20,
                100.0 * s.hit_rate(),
                (REQS * PER_REQ) as f64 / busy.as_secs_f64(),
                busy.as_secs_f64() * 1e6 / REQS as f64,
                gbps((REQS * PER_REQ * bs) as u64, busy),
                verdict(bad.get(), (WARM_REQS + REQS) * PER_REQ),
            ));
            // The same accesses one get() at a time: every miss pays a whole decode pass.
            store.reset_stats();
            let single: Vec<usize> = requests[WARM_REQS..WARM_REQS + REQS / 4].iter().flatten().copied().collect();
            let t0 = Instant::now();
            for &b in &single {
                std::hint::black_box(store.get(b).map_err(|e| e.to_string())?);
            }
            let busy = t0.elapsed();
            let s = store.stats();
            cache_rows.push(format!(
                "| {pct}% ({} MiB) | {name} | get x1 | {:.1}% | {:.0} | {:.1} us/access | {:.2} GB/s | not re-checked |",
                cap >> 20,
                100.0 * s.hit_rate(),
                single.len() as f64 / busy.as_secs_f64(),
                busy.as_secs_f64() * 1e6 / single.len() as f64,
                gbps((single.len() * bs) as u64, busy),
            ));
        }
    }

    println!("\n| Test | Decoded GB/s | Notes |\n|---|---:|---|");
    for r in &rows {
        println!("| {} | {:.2} | {} |", r.test, r.gbps, r.note);
    }
    println!(
        "\nChunk cache: {PER_REQ}-block requests, Zipf(s=1) over {n} blocks with shuffled ranks, {WARM_REQS} warm-up requests then {REQS} measured; misses use {:?} reads",
        StoreOptions::default().read
    );
    println!("| Cache size | Decoder | Call | Hit rate | Accesses/s | Latency per call | Decoded GB/s served | Output |\n|---|---|---|---:|---:|---:|---:|---|");
    for r in &cache_rows {
        println!("{r}");
    }
    println!(
        "\nEvery decoded block is compared with the corpus (CPU rows abort on a mismatch, GPU rows count them). Buffered rows are warm-cache numbers (the pack is \
         read once before timing and fits in RAM); a cold-cache buffered number needs the file flushed from the \
         OS cache first (e.g. reboot or RAMMap 'Empty Standby List'). Direct rows bypass the OS cache on every run."
    );
    Ok(())
}

/// Page-aligned host buffer (direct reads need sector alignment).
struct AlignedBuf {
    raw: Vec<u8>,
    pad: usize,
    len: usize,
}

impl AlignedBuf {
    fn new(len: usize) -> Self {
        let raw = vec![0u8; len + 4096];
        let pad = (4096 - raw.as_ptr() as usize % 4096) % 4096;
        AlignedBuf { raw, pad, len }
    }
    fn len(&self) -> usize {
        self.len
    }
    fn get(&mut self) -> &mut [u8] {
        &mut self.raw[self.pad..self.pad + self.len]
    }
}
