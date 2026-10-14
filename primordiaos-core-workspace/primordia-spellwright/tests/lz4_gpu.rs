//! Pack format + GPU LZ4 decoder: round trips through write_pack -> GpuDecoder, and a
//! fuzz-style test feeding corrupted blocks that checks statuses and guard bytes.

use primordia_spellwright::decoder::{self, BlockJob, GpuDecoder, STATUS_NOT_RUN, STATUS_OK};
use primordia_spellwright::pack::{self, BlockEntry, STORED_BIT};
use std::path::PathBuf;
use std::sync::Mutex;

// One GPU decoder at a time (each maps ~130 MiB).
static GPU: Mutex<()> = Mutex::new(());

struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }
    fn below(&mut self, n: u64) -> u64 {
        self.next() % n.max(1)
    }
    fn fill(&mut self, buf: &mut [u8]) {
        for c in buf.chunks_mut(8) {
            let v = self.next().to_le_bytes();
            c.copy_from_slice(&v[..c.len()]);
        }
    }
}

fn text(len: usize, seed: u64) -> Vec<u8> {
    let words = [
        "glyph", "ritual", "reliquary", "the", "of", "compute", "{\"jsonrpc\":\"2.0\",", "\"method\":", "lz4", "spell",
        "\n", "decoder", "block", "primordia", "  ", "0123456789", "grimoire",
    ];
    let mut rng = Rng(seed | 1);
    let mut out = Vec::with_capacity(len + 32);
    while out.len() < len {
        out.extend_from_slice(words[rng.below(words.len() as u64) as usize].as_bytes());
        out.push(b' ');
    }
    out.truncate(len);
    out
}

fn random(len: usize, seed: u64) -> Vec<u8> {
    let mut v = vec![0u8; len];
    Rng(seed | 1).fill(&mut v);
    v
}

/// Low-entropy data with short-distance repeats: exercises overlapping matches.
fn runs(len: usize, seed: u64) -> Vec<u8> {
    let mut rng = Rng(seed | 1);
    let mut v = Vec::with_capacity(len);
    while v.len() < len {
        let period = 1 + rng.below(7) as usize;
        let pat: Vec<u8> = (0..period).map(|_| rng.below(256) as u8).collect();
        let n = 1 + rng.below(300) as usize;
        for k in 0..n {
            v.push(pat[k % period]);
        }
        if rng.below(4) == 0 {
            let mut r = vec![0u8; rng.below(40) as usize];
            rng.fill(&mut r);
            v.extend_from_slice(&r);
        }
    }
    v.truncate(len);
    v
}

fn tmp(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("spellwright-lz4-test-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    dir.join(name)
}

/// Packs `data`, decodes it on the GPU (with blocks placed at `skew`-shifted input offsets),
/// and compares byte for byte. Returns (block count, stored count).
fn round_trip(dec: &mut GpuDecoder, name: &str, data: &[u8], block_size: u32, skew: u32) -> (usize, usize) {
    let src = tmp(&format!("{name}.bin"));
    let dst = tmp(&format!("{name}.ppk"));
    std::fs::write(&src, data).unwrap();
    let h = pack::write_pack(&src, &dst, block_size).unwrap();
    assert_eq!(h.original_size, data.len() as u64);
    let (h2, entries) = pack::read_index(&dst).unwrap();
    assert_eq!(h, h2);
    let file = std::fs::read(&dst).unwrap();

    // CPU path agrees too.
    let mut cpu = vec![0u8; block_size as usize];
    for (i, e) in entries.iter().enumerate() {
        let comp = &file[e.comp_offset as usize..][..e.len() as usize];
        pack::decode_block_cpu(comp, e, &mut cpu).unwrap();
        let start = i * block_size as usize;
        assert_eq!(&cpu[..e.raw_size as usize], &data[start..start + e.raw_size as usize], "{name}: CPU block {i}");
    }

    // GPU: as many blocks per decode as fit in the output buffer.
    let per_call = (dec.output_capacity() / block_size as usize).min(decoder::MAX_JOBS);
    for (c, chunk) in entries.chunks(per_call).enumerate() {
        let mut jobs = Vec::new();
        let mut in_pos = 0u32;
        for (k, e) in chunk.iter().enumerate() {
            in_pos += skew; // misalign each block's input by a few bytes
            let comp = &file[e.comp_offset as usize..][..e.len() as usize];
            dec.input_mut()[in_pos as usize..][..comp.len()].copy_from_slice(comp);
            jobs.push(BlockJob::new(e, in_pos, k as u32 * block_size));
            in_pos += comp.len() as u32;
        }
        let out = dec.decode(&jobs).unwrap_or_else(|e| panic!("{name}: {e}"));
        let start = c * per_call * block_size as usize;
        let n: usize = chunk.iter().map(|e| e.raw_size as usize).sum();
        if out[..n] != data[start..start + n] {
            let at = out[..n].iter().zip(&data[start..]).position(|(a, b)| a != b).unwrap();
            panic!("{name}: GPU output differs at byte {}", start + at);
        }
    }
    let _ = std::fs::remove_file(&src);
    let _ = std::fs::remove_file(&dst);
    (entries.len(), entries.iter().filter(|e| e.stored()).count())
}

#[test]
fn round_trips() {
    let _g = GPU.lock().unwrap_or_else(|e| e.into_inner());
    let mut dec = GpuDecoder::new().expect("GPU decoder");
    eprintln!("device: {}", dec.device_name);
    assert_eq!(dec.input_mut().as_ptr() as usize % 4096, 0, "input buffer must be page aligned");
    assert!(dec.input_capacity() >= 64 << 20 && dec.output_capacity() >= 64 << 20);

    let exe = std::fs::read(env!("CARGO_BIN_EXE_primordia-spellwright")).unwrap();
    let mut mixed = text(3 << 20, 7);
    mixed.extend(random(1 << 20, 8));
    mixed.extend(runs(2 << 20, 9));
    let cases: Vec<(&str, Vec<u8>)> = vec![
        ("empty", vec![]),
        ("tiny", b"abc".to_vec()),
        ("zeros", vec![0u8; 5 << 20]),
        ("random", random(3 << 20, 1)),
        ("text", text(6 << 20, 2)),
        ("runs", runs(4 << 20, 3)),
        ("exe", exe),
        ("odd-length", text((1 << 20) + 13, 4)),
        ("mixed", mixed),
    ];
    for (name, data) in &cases {
        for (bs, skew) in [(65536u32, 0u32), (65536, 1), (4096, 3), (32768, 2), (12, 1)] {
            let (blocks, stored) = round_trip(&mut dec, &format!("{name}-{bs}-{skew}"), data, bs, skew);
            eprintln!("{name:>10} bs={bs:<7} skew={skew}: {blocks} blocks ({stored} stored) ok");
        }
    }
    // Spans several decode calls (> 64 MiB output).
    let big = runs(70 << 20, 11);
    round_trip(&mut dec, "big", &big, 65536, 0);
    assert!(dec.last_dispatches >= 1);
    // Text blocks need several step budgets, so this exercises pending/resume.
    round_trip(&mut dec, "resume", &text(8 << 20, 12), 65536, 1);
    assert!(dec.last_submits > 1 || dec.last_gpu_ns.is_none(), "expected the decode to resume across submits");
}

#[test]
fn rejects_bad_jobs() {
    let _g = GPU.lock().unwrap_or_else(|e| e.into_inner());
    let mut dec = GpuDecoder::new().expect("GPU decoder");
    let cap_in = dec.input_capacity() as u32;
    let cap_out = dec.output_capacity() as u32;
    let job = |i, c, r, o| BlockJob { in_offset: i, comp_size: c, raw_size: r, out_offset: o };
    // Host-side checks.
    for bad in [
        vec![job(cap_in - 4, 8 | STORED_BIT, 8, 0)],       // input past end
        vec![job(0, 8 | STORED_BIT, 8, cap_out - 4)],      // output past end
        vec![job(0, 8 | STORED_BIT, 8, 2)],                // misaligned output
        vec![job(0, 8 | STORED_BIT, 8, 0), job(0, 8 | STORED_BIT, 8, 4)], // overlap
        vec![job(0, 65540 | STORED_BIT, 65540, 0)],        // larger than MAX_JOB_RAW
    ] {
        assert!(dec.decode(&bad).is_err(), "{bad:?} should be rejected");
    }
    // Shader-side checks (host checks bypassed).
    let jobs = [
        job(cap_in - 4, 8 | STORED_BIT, 8, 0),
        job(0, 8 | STORED_BIT, 8, cap_out - 4),
        job(0, 8 | STORED_BIT, 8, 66),
        job(u32::MAX - 2, 8, 8, 128),
        job(0, 4 | STORED_BIT, 8, 256), // stored size mismatch
        job(0, 0, 8, 512),              // empty lz4 block
        job(0, 0 | STORED_BIT, 0, 1024), // empty stored block: fine
    ];
    dec.decode_unchecked_for_tests(&jobs).unwrap();
    let codes: Vec<u32> = dec.job_status().iter().map(|s| s[0]).collect();
    assert_eq!(codes, [1, 1, 1, 1, 6, 2, 0]);
}

/// Corrupts real LZ4 blocks in many ways and checks that the GPU (a) never writes outside a
/// job's output range, (b) agrees with lz4_flex on which blocks are valid, and (c) produces the
/// same bytes as lz4_flex whenever both accept a block.
#[test]
fn fuzz_corrupt_blocks() {
    let _g = GPU.lock().unwrap_or_else(|e| e.into_inner());
    let mut dec = GpuDecoder::new().expect("GPU decoder");
    let block = 16384usize;
    let mut sources: Vec<Vec<u8>> = Vec::new();
    for s in 0..24u64 {
        let data = match s % 3 {
            0 => text(block, s),
            1 => runs(block, s),
            _ => {
                let mut d = text(block, s);
                d[..block / 3].copy_from_slice(&random(block / 3, s));
                d
            }
        };
        sources.push(lz4_flex::block::compress(&data));
    }

    let guard = 64u32;
    let stride = (2 * block as u32 + 2 * guard).next_multiple_of(4);
    let mut rng = Rng(0x9E37_79B9_7F4A_7C15);
    let (mut total, mut gpu_err, mut agree_err, mut both_ok) = (0, 0, 0, 0);
    let mut disagreements = Vec::new();
    for round in 0..40 {
        let n_jobs = 1000;
        let mut jobs = Vec::new();
        let mut blobs = Vec::new();
        let mut in_pos = 0u32;
        for k in 0..n_jobs {
            let src = &sources[rng.below(sources.len() as u64) as usize];
            let mut comp = src.clone();
            let mut raw = block as u32;
            let mut stored = false;
            for _ in 0..1 + rng.below(3) {
                let m = rng.below(9);
                if comp.is_empty() && matches!(m, 0 | 1 | 8) {
                    continue;
                }
                match m {
                    0 => {
                        let i = rng.below(comp.len() as u64) as usize;
                        comp[i] ^= 1 << rng.below(8);
                    }
                    1 => {
                        let i = rng.below(comp.len() as u64) as usize;
                        comp[i] = rng.next() as u8;
                    }
                    2 => comp.truncate(rng.below(comp.len() as u64 + 1) as usize),
                    3 => comp.extend((0..1 + rng.below(16)).map(|_| rng.next() as u8)),
                    4 => raw = rng.below(2 * block as u64) as u32,
                    5 => raw = raw.saturating_sub(1 + rng.below(8) as u32),
                    6 => {
                        comp = vec![0u8; rng.below(64) as usize];
                        rng.fill(&mut comp);
                    }
                    7 => stored = rng.below(8) == 0,
                    _ => {
                        // Token with huge literal length extension run.
                        let i = rng.below(comp.len() as u64) as usize;
                        for b in comp.iter_mut().skip(i).take(1 + rng.below(32) as usize) {
                            *b = 255;
                        }
                    }
                }
            }
            if stored && rng.below(2) == 0 {
                raw = comp.len() as u32;
            }
            in_pos += rng.below(4) as u32;
            dec.input_mut()[in_pos as usize..][..comp.len()].copy_from_slice(&comp);
            let comp_size = comp.len() as u32 | if stored { STORED_BIT } else { 0 };
            jobs.push(BlockJob { in_offset: in_pos, comp_size, raw_size: raw, out_offset: k * stride + guard });
            in_pos += comp.len() as u32;
            blobs.push(comp);
        }
        // Guard pattern over the whole output area.
        let area = (n_jobs * stride) as usize;
        let pattern = |i: usize| (i as u32).wrapping_mul(2654435761).rotate_right(13) as u8;
        for (i, b) in dec.output_mut()[..area].iter_mut().enumerate() {
            *b = pattern(i);
        }
        let failed = dec.decode(&jobs).is_err();
        let status = dec.job_status().to_vec();
        let out = dec.output_mut()[..area].to_vec();
        if status.iter().any(|s| s[0] != STATUS_OK) {
            assert!(failed, "decode must fail when a job fails");
        }

        for (k, j) in jobs.iter().enumerate() {
            total += 1;
            let s = status[k];
            assert_ne!(s[0], STATUS_NOT_RUN, "round {round} job {k} never ran");
            let lo = j.out_offset as usize;
            let hi = lo + j.raw_size as usize;
            let slot = k * stride as usize..(k + 1) * stride as usize;
            for i in slot.clone() {
                if (i < lo || i >= hi) && out[i] != pattern(i) {
                    panic!("round {round} job {k}: wrote outside its range at byte {i} (range {lo}..{hi}, status {s:?})");
                }
            }
            let entry = BlockEntry { comp_offset: 0, comp_size: j.comp_size, raw_size: j.raw_size };
            let mut cpu = vec![0u8; j.raw_size as usize];
            let cpu_ok = pack::decode_block_cpu(&blobs[k], &entry, &mut cpu).is_ok();
            let gpu_ok = s[0] == STATUS_OK;
            if !gpu_ok {
                gpu_err += 1;
            }
            match (cpu_ok, gpu_ok) {
                (true, true) => {
                    both_ok += 1;
                    assert_eq!(&out[lo..hi], &cpu[..], "round {round} job {k}: GPU and CPU decodes differ");
                }
                (false, false) => agree_err += 1,
                _ => disagreements.push((round, k, cpu_ok, s)),
            }
        }
    }
    eprintln!(
        "fuzz: {total} jobs, {gpu_err} GPU errors, {agree_err} rejected by both, {both_ok} accepted by both, {} disagreements",
        disagreements.len()
    );
    assert!(disagreements.is_empty(), "GPU/CPU disagree on validity: {:?}", &disagreements[..disagreements.len().min(10)]);
    assert!(gpu_err > total / 4, "fuzzer should produce many invalid blocks");
}
