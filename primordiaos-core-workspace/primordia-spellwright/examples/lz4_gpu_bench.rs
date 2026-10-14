//! GPU LZ4 block decode vs lz4_flex single-thread on ~256 MiB of mixed data.
//!
//!   cargo run --release --example lz4_gpu_bench [MiB] [block_size] [mixed|text|runs|zeros|random]

use primordia_spellwright::decoder::{BlockJob, GpuDecoder};
use primordia_spellwright::pack;
use std::time::Instant;

struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }
}

/// Mixed data: JSON-ish text, low-entropy runs, zeros and incompressible noise, in 1 MiB slabs
/// (4:2:1:1), or only one of those kinds.
fn mixed(len: usize, kind: &str) -> Vec<u8> {
    let words: [&[u8]; 12] = [
        b"{\"jsonrpc\":\"2.0\",", b"\"method\":\"tools/call\",", b"\"id\":", b"glyph ", b"ritual ", b"reliquary ",
        b"\"params\":{", b"}}\n", b"compute ", b"0123456789", b"primordia ", b"spellwright ",
    ];
    let mut rng = Rng(0x2545_F491_4F6C_DD1D);
    let mut v = Vec::with_capacity(len + (1 << 20));
    let mut slab = 0;
    while v.len() < len {
        let end = v.len() + (1 << 20);
        let pick = match kind {
            "text" => 0,
            "runs" => 4,
            "zeros" => 6,
            "random" => 7,
            _ => slab % 8,
        };
        match pick {
            0..=3 => {
                while v.len() < end {
                    v.extend_from_slice(words[(rng.next() % 12) as usize]);
                    if rng.next() % 8 == 0 {
                        v.extend_from_slice(&rng.next().to_le_bytes()[..3]);
                    }
                }
            }
            4 | 5 => {
                while v.len() < end {
                    let b = rng.next();
                    let n = 1 + (b >> 8) % 64;
                    for k in 0..n {
                        v.push((b >> ((k % 3) * 8)) as u8);
                    }
                }
            }
            6 => v.resize(end, 0),
            _ => {
                while v.len() < end {
                    v.extend_from_slice(&rng.next().to_le_bytes());
                }
            }
        }
        v.truncate(end);
        slab += 1;
    }
    v.truncate(len);
    v
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let mib: usize = args.first().and_then(|s| s.parse().ok()).unwrap_or(256);
    let block_size: u32 = args.get(1).and_then(|s| s.parse().ok()).unwrap_or(pack::DEFAULT_BLOCK_SIZE);

    let kind = args.get(2).map(String::as_str).unwrap_or("mixed");
    let data = mixed(mib << 20, kind);
    let dir = std::env::temp_dir();
    let (src, dst) = (dir.join("lz4_gpu_bench.bin"), dir.join("lz4_gpu_bench.ppk"));
    std::fs::write(&src, &data)?;
    let t = Instant::now();
    let h = pack::write_pack(&src, &dst, block_size)?;
    let pack_s = t.elapsed().as_secs_f64();
    let (_, entries) = pack::read_index(&dst)?;
    let file = std::fs::read(&dst)?;
    let _ = std::fs::remove_file(&src);
    let _ = std::fs::remove_file(&dst);
    let stored = entries.iter().filter(|e| e.stored()).count();
    println!(
        "data: {} MiB {kind}, {} blocks of {} ({} stored), packed {:.1}% in {:.2}s",
        mib,
        h.block_count,
        block_size,
        stored,
        100.0 * file.len() as f64 / data.len() as f64,
        pack_s
    );
    let gb = data.len() as f64 / 1e9;

    // CPU: lz4_flex (safe decode), one thread.
    let mut out = vec![0u8; data.len()];
    let mut best_cpu = f64::MAX;
    for _ in 0..3 {
        let t = Instant::now();
        for (i, (e, o)) in entries.iter().zip(out.chunks_mut(block_size as usize)).enumerate() {
            let comp = &file[e.comp_offset as usize..][..e.len() as usize];
            pack::decode_block_cpu(comp, e, o).map_err(|err| format!("block {i}: {err}"))?;
        }
        best_cpu = best_cpu.min(t.elapsed().as_secs_f64());
    }
    assert!(out == data, "CPU decode mismatch");
    println!("cpu  lz4_flex 1 thread : {:6.3} s  {:6.2} GB/s", best_cpu, gb / best_cpu);

    // GPU: as many blocks per decode as fit in the output buffer.
    let mut dec = GpuDecoder::new()?;
    println!("gpu  device: {}", dec.device_name);
    let per_call = dec.output_capacity() / block_size as usize;
    let (mut best_gpu, mut best_wall, mut best_total) = (f64::MAX, f64::MAX, f64::MAX);
    let (mut worst_decode_ns, mut worst_round_ns) = (0f64, 0f64);
    let (mut dispatches, mut submits) = (0, 0);
    for rep in 0..4 {
        let (mut gpu_ns, mut wall, mut total) = (0f64, 0f64, 0f64);
        let mut check = true;
        for (c, chunk) in entries.chunks(per_call).enumerate() {
            let t0 = Instant::now();
            // The pack's block data for this chunk is contiguous: copy it in one go.
            let first = chunk[0].comp_offset as usize;
            let last = chunk.last().unwrap();
            let end = last.comp_offset as usize + last.len() as usize;
            dec.input_mut()[..end - first].copy_from_slice(&file[first..end]);
            let jobs: Vec<BlockJob> = chunk
                .iter()
                .enumerate()
                .map(|(k, e)| BlockJob::new(e, (e.comp_offset as usize - first) as u32, k as u32 * block_size))
                .collect();
            let t1 = Instant::now();
            let decoded = dec.decode(&jobs)?;
            let t2 = Instant::now();
            let start = c * per_call * block_size as usize;
            let n: usize = chunk.iter().map(|e| e.raw_size as usize).sum();
            if rep == 0 {
                check &= decoded[..n] == data[start..start + n];
            }
            gpu_ns += dec.last_gpu_ns.unwrap_or(f64::NAN);
            worst_decode_ns = worst_decode_ns.max(dec.last_gpu_ns.unwrap_or(0.0));
            worst_round_ns = worst_round_ns.max(dec.last_longest_round_ns.unwrap_or(0.0));
            dispatches = dispatches.max(dec.last_dispatches);
            submits = submits.max(dec.last_submits);
            wall += (t2 - t1).as_secs_f64();
            total += (t2 - t0).as_secs_f64();
        }
        assert!(check, "GPU decode mismatch");
        best_gpu = best_gpu.min(gpu_ns / 1e9);
        best_wall = best_wall.min(wall);
        best_total = best_total.min(total);
    }
    println!("gpu  timestamps        : {:6.3} s  {:6.2} GB/s", best_gpu, gb / best_gpu);
    println!("gpu  decode() wall     : {:6.3} s  {:6.2} GB/s", best_wall, gb / best_wall);
    println!("gpu  + input upload    : {:6.3} s  {:6.2} GB/s", best_total, gb / best_total);
    println!(
        "gpu  per {} MiB decode() call: up to {:.1} ms GPU, {} submit(s) x {} rounds x {} dispatch(es); longest round {:.1} ms; output verified",
        dec.output_capacity() >> 20,
        worst_decode_ns / 1e6,
        submits,
        primordia_spellwright::decoder::ROUNDS_PER_SUBMIT,
        dispatches,
        worst_round_ns / 1e6
    );
    Ok(())
}
