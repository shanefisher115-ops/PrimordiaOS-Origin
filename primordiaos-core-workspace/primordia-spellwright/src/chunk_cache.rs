//! CPU-side LRU cache of decoded pack blocks, filled by batched GPU decodes.
//!
//! A GPU pass costs ~110us before it does any work, so lookups never touch the
//! GPU: [`ChunkStore::get_many`] checks a HashMap first and only the misses of
//! one call go to the decoder, as one batch: their compressed bytes are read
//! (adjacent blocks merged into one read) straight into
//! [`GpuDecoder::input_mut`], decoded by a single [`GpuDecoder::decode`], and
//! copied out into the cache, which then evicts least-recently-used blocks to
//! stay under its byte capacity. [`Decode::Cpu`] swaps the GPU for lz4_flex on
//! all cores, with the same read path, for comparison.
//!
//! Thread safety: the cache map and the I/O + decoder state sit behind two
//! separate mutexes, so hits on one thread are not blocked by another thread's
//! miss; misses serialize on the decoder.

use crate::decoder::{BlockJob, GpuDecoder, MAX_JOBS};
use crate::pack::{self, BlockEntry, PackHeader};
use crate::storage::{DirectReader, ReadMode};
use std::collections::{BTreeMap, HashMap};
use std::error::Error;
use std::io;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering::Relaxed};
use std::sync::{Arc, Mutex};

pub type Result<T> = std::result::Result<T, Box<dyn Error + Send + Sync>>;

/// Which decoder fills misses.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Decode {
    Gpu,
    /// lz4_flex on all cores (comparison / no-GPU fallback).
    Cpu,
}

#[derive(Clone, Copy, Debug)]
pub struct StoreOptions {
    pub read: ReadMode,
    pub decode: Decode,
}

impl Default for StoreOptions {
    fn default() -> Self {
        StoreOptions {
            read: if cfg!(windows) { ReadMode::Direct } else { ReadMode::Buffered },
            decode: Decode::Gpu,
        }
    }
}

/// Counters since open (or the last [`ChunkStore::reset_stats`]).
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct CacheStats {
    /// Requested blocks served without decoding them in that call.
    pub hits: u64,
    /// Requested blocks that had to be read and decoded.
    pub misses: u64,
    /// Bytes read from the pack file (sector-widened in direct mode).
    pub bytes_read: u64,
    /// Decoded bytes produced.
    pub bytes_decoded: u64,
    /// Decode batches (GPU passes, for [`Decode::Gpu`]).
    pub batches: u64,
    /// GPU-only time over all batches, as reported by the decoder.
    pub gpu_ns: f64,
}

impl CacheStats {
    pub fn hit_rate(&self) -> f64 {
        let n = self.hits + self.misses;
        if n == 0 {
            0.0
        } else {
            self.hits as f64 / n as f64
        }
    }
}

/// LRU keyed by block index: a map for lookup plus a tick-ordered map for eviction.
#[derive(Default)]
struct Lru {
    map: HashMap<usize, (Arc<[u8]>, u64)>,
    order: BTreeMap<u64, usize>,
    tick: u64,
    bytes: usize,
}

impl Lru {
    fn get(&mut self, i: usize) -> Option<Arc<[u8]>> {
        let (data, t) = self.map.get_mut(&i)?;
        self.order.remove(t);
        self.tick += 1;
        *t = self.tick;
        self.order.insert(self.tick, i);
        Some(data.clone())
    }

    fn insert(&mut self, i: usize, data: Arc<[u8]>) {
        if self.get(i).is_some() {
            return;
        }
        self.tick += 1;
        self.bytes += data.len();
        self.map.insert(i, (data, self.tick));
        self.order.insert(self.tick, i);
    }

    fn evict_to(&mut self, capacity: usize) {
        while self.bytes > capacity {
            let Some((_, i)) = self.order.pop_first() else { break };
            if let Some((data, _)) = self.map.remove(&i) {
                self.bytes -= data.len();
            }
        }
    }
}

/// Page-aligned host scratch for the CPU decode path (direct reads need sector alignment).
#[derive(Default)]
struct AlignedBuf {
    raw: Vec<u8>,
    pad: usize,
}

impl AlignedBuf {
    fn get(&mut self, len: usize) -> &mut [u8] {
        if self.raw.len() < len + 4096 {
            self.raw = vec![0u8; len + 4096];
            self.pad = (4096 - self.raw.as_ptr() as usize % 4096) % 4096;
        }
        &mut self.raw[self.pad..self.pad + len]
    }
}

/// Batch limit for the CPU path's host scratch, matching the GPU decoder's minimum.
const CPU_BATCH_BYTES: usize = 64 << 20;

struct Io {
    reader: DirectReader,
    gpu: Option<GpuDecoder>,
    scratch: AlignedBuf,
}

// SAFETY: `Io` is only ever reached through `ChunkStore::io`'s mutex, so the
// decoder's Vulkan handles and mapped pointers are used by one thread at a time;
// Vulkan objects are externally synchronized and may be used from any thread.
unsafe impl Send for Io {}

/// Decoded-block cache over one .ppk file.
pub struct ChunkStore {
    header: PackHeader,
    index: Vec<BlockEntry>,
    capacity: usize,
    decode: Decode,
    cache: Mutex<Lru>,
    io: Mutex<Io>,
    hits: AtomicU64,
    misses: AtomicU64,
    bytes_read: AtomicU64,
    bytes_decoded: AtomicU64,
    batches: AtomicU64,
    gpu_ns: Mutex<f64>,
}

impl ChunkStore {
    /// Opens `path` with direct reads (Windows) and GPU decoding, caching up to
    /// `capacity_bytes` of decoded blocks.
    pub fn open(path: impl AsRef<Path>, capacity_bytes: usize) -> Result<Self> {
        Self::open_with(path, capacity_bytes, StoreOptions::default())
    }

    pub fn open_with(path: impl AsRef<Path>, capacity_bytes: usize, opts: StoreOptions) -> Result<Self> {
        let path = path.as_ref();
        let (header, index) = pack::read_index(path)?;
        let reader = DirectReader::open(path, opts.read)?;
        let gpu = match opts.decode {
            Decode::Gpu => {
                let d = GpuDecoder::new().map_err(|e| e.to_string())?;
                if (d.output_capacity() as u64) < header.block_size as u64
                    || (d.input_capacity() as u64) < header.block_size as u64 + 2 * reader.alignment() as u64
                {
                    return Err(format!("decoder buffers too small for {}-byte blocks", header.block_size).into());
                }
                Some(d)
            }
            Decode::Cpu => None,
        };
        Ok(ChunkStore {
            header,
            index,
            capacity: capacity_bytes,
            decode: opts.decode,
            cache: Mutex::new(Lru::default()),
            io: Mutex::new(Io { reader, gpu, scratch: AlignedBuf::default() }),
            hits: AtomicU64::new(0),
            misses: AtomicU64::new(0),
            bytes_read: AtomicU64::new(0),
            bytes_decoded: AtomicU64::new(0),
            batches: AtomicU64::new(0),
            gpu_ns: Mutex::new(0.0),
        })
    }

    pub fn header(&self) -> &PackHeader {
        &self.header
    }

    pub fn index(&self) -> &[BlockEntry] {
        &self.index
    }

    pub fn block_count(&self) -> usize {
        self.index.len()
    }

    pub fn capacity(&self) -> usize {
        self.capacity
    }

    pub fn decode_mode(&self) -> Decode {
        self.decode
    }

    /// Decoded bytes currently cached.
    pub fn cached_bytes(&self) -> usize {
        self.cache.lock().unwrap().bytes
    }

    pub fn cached_blocks(&self) -> usize {
        self.cache.lock().unwrap().map.len()
    }

    pub fn stats(&self) -> CacheStats {
        CacheStats {
            hits: self.hits.load(Relaxed),
            misses: self.misses.load(Relaxed),
            bytes_read: self.bytes_read.load(Relaxed),
            bytes_decoded: self.bytes_decoded.load(Relaxed),
            batches: self.batches.load(Relaxed),
            gpu_ns: *self.gpu_ns.lock().unwrap(),
        }
    }

    pub fn reset_stats(&self) {
        for c in [&self.hits, &self.misses, &self.bytes_read, &self.bytes_decoded, &self.batches] {
            c.store(0, Relaxed);
        }
        *self.gpu_ns.lock().unwrap() = 0.0;
    }

    /// Drops every cached block.
    pub fn clear(&self) {
        *self.cache.lock().unwrap() = Lru::default();
    }

    pub fn get(&self, block: usize) -> Result<Arc<[u8]>> {
        Ok(self.get_many(&[block])?.pop().unwrap())
    }

    /// Returns the decoded blocks in request order. All misses of this call are
    /// read and decoded together (in as few GPU passes as the buffers allow).
    pub fn get_many(&self, blocks: &[usize]) -> Result<Vec<Arc<[u8]>>> {
        if let Some(&b) = blocks.iter().find(|&&b| b >= self.index.len()) {
            return Err(format!("block {b} out of range (pack has {})", self.index.len()).into());
        }
        let mut out: Vec<Option<Arc<[u8]>>> = vec![None; blocks.len()];
        let mut missing: Vec<usize> = Vec::new();
        {
            let mut lru = self.cache.lock().unwrap();
            for (slot, &b) in out.iter_mut().zip(blocks) {
                *slot = lru.get(b);
                if slot.is_none() {
                    missing.push(b);
                }
            }
        }
        missing.sort_unstable();
        missing.dedup();
        let mut decoded: HashMap<usize, Arc<[u8]>> = HashMap::new();
        if !missing.is_empty() {
            let mut io = self.io.lock().unwrap();
            // Another thread may have decoded some of these while we waited for the decoder.
            {
                let mut lru = self.cache.lock().unwrap();
                missing.retain(|&b| match lru.get(b) {
                    Some(d) => {
                        decoded.insert(b, d);
                        false
                    }
                    None => true,
                });
            }
            let mut fresh = Vec::with_capacity(missing.len());
            let mut rest = &missing[..];
            while !rest.is_empty() {
                let n = self.fetch_batch(&mut io, rest, &mut fresh)?;
                rest = &rest[n..];
            }
            self.misses.fetch_add(fresh.len() as u64, Relaxed);
            let mut lru = self.cache.lock().unwrap();
            for (b, data) in fresh {
                lru.insert(b, data.clone());
                decoded.insert(b, data);
            }
            lru.evict_to(self.capacity);
        }
        let hits = blocks.len() as u64 - missing.len() as u64;
        self.hits.fetch_add(hits, Relaxed);
        Ok(out
            .into_iter()
            .zip(blocks)
            .map(|(slot, b)| slot.unwrap_or_else(|| decoded[b].clone()))
            .collect())
    }

    /// Reads and decodes the longest prefix of `blocks` (sorted, distinct) that fits
    /// the decoder's buffers; returns how many blocks it took.
    fn fetch_batch(&self, io: &mut Io, blocks: &[usize], out: &mut Vec<(usize, Arc<[u8]>)>) -> Result<usize> {
        let (in_cap, out_cap) = match &io.gpu {
            Some(d) => (d.input_capacity(), d.output_capacity()),
            None => (CPU_BATCH_BYTES, usize::MAX),
        };
        let align = io.reader.alignment();
        let entries: Vec<&BlockEntry> = blocks.iter().map(|&b| &self.index[b]).collect();
        let ranges: Vec<(u64, usize)> = entries.iter().map(|e| (e.comp_offset, e.len() as usize)).collect();
        let full = io.reader.plan(&ranges)?;
        // Blocks are sorted by file offset, so the buffer layout is monotone: block j's
        // bytes end at offsets[j] + len, and a prefix plan has the same offsets.
        let mut take = 0;
        let mut out_end = 0usize;
        for (j, e) in entries.iter().enumerate() {
            let in_end = (full.offsets[j] + e.len() as usize).next_multiple_of(align);
            let next_out = out_end.next_multiple_of(4) + e.raw_size as usize;
            if in_end > in_cap || next_out > out_cap || j == MAX_JOBS {
                break;
            }
            out_end = next_out;
            take = j + 1;
        }
        if take == 0 {
            return Err(format!("block {} does not fit the decoder buffers", blocks[0]).into());
        }
        let plan = if take == blocks.len() { full } else { io.reader.plan(&ranges[..take])? };
        let entries = &entries[..take];

        let Io { reader, gpu, scratch } = io;
        match gpu {
            Some(dec) => {
                let n = reader.read(&plan, dec.input_mut())?;
                self.bytes_read.fetch_add(n, Relaxed);
                let mut jobs = Vec::with_capacity(take);
                let mut out_offset = 0u32;
                for (j, e) in entries.iter().enumerate() {
                    jobs.push(BlockJob {
                        in_offset: plan.offsets[j] as u32,
                        comp_size: e.comp_size,
                        raw_size: e.raw_size,
                        out_offset,
                    });
                    out_offset = (out_offset + e.raw_size).next_multiple_of(4);
                }
                let decoded = dec.decode(&jobs).map_err(|e| e.to_string())?;
                for ((job, e), &b) in jobs.iter().zip(entries).zip(blocks) {
                    let o = job.out_offset as usize;
                    out.push((b, Arc::from(&decoded[o..o + e.raw_size as usize])));
                }
                if let Some(ns) = dec.last_gpu_ns {
                    *self.gpu_ns.lock().unwrap() += ns;
                }
            }
            None => {
                let buf = scratch.get(plan.total);
                let n = reader.read(&plan, buf)?;
                self.bytes_read.fetch_add(n, Relaxed);
                let buf: &[u8] = buf;
                let decoded = decode_cpu_parallel(entries, &plan.offsets, buf)?;
                out.extend(blocks[..take].iter().copied().zip(decoded));
            }
        }
        self.batches.fetch_add(1, Relaxed);
        self.bytes_decoded.fetch_add(entries.iter().map(|e| e.raw_size as u64).sum(), Relaxed);
        Ok(take)
    }
}

/// Decodes `entries` (compressed bytes at `offsets` in `buf`) on all cores.
fn decode_cpu_parallel(entries: &[&BlockEntry], offsets: &[usize], buf: &[u8]) -> io::Result<Vec<Arc<[u8]>>> {
    let decode_one = |j: usize| -> io::Result<Arc<[u8]>> {
        let e = entries[j];
        let mut raw = vec![0u8; e.raw_size as usize];
        pack::decode_block_cpu(&buf[offsets[j]..offsets[j] + e.len() as usize], e, &mut raw)?;
        Ok(raw.into())
    };
    let threads = std::thread::available_parallelism().map_or(1, |n| n.get()).min(entries.len());
    if threads <= 1 {
        return (0..entries.len()).map(decode_one).collect();
    }
    let per = entries.len().div_ceil(threads);
    std::thread::scope(|s| {
        let handles: Vec<_> = (0..entries.len())
            .step_by(per)
            .map(|start| s.spawn(move || (start..(start + per).min(entries.len())).map(decode_one).collect::<io::Result<Vec<_>>>()))
            .collect();
        let mut all = Vec::with_capacity(entries.len());
        for h in handles {
            all.extend(h.join().expect("decode thread panicked")?);
        }
        Ok(all)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::path::PathBuf;

    /// A pack of `len` bytes mixing compressible text, runs and pseudo-random bytes.
    fn temp_pack(tag: &str, len: usize, block_size: u32) -> (PathBuf, Vec<u8>) {
        let mut data = Vec::with_capacity(len);
        let mut x = 0x2545_F491_4F6C_DD1Du64;
        while data.len() < len {
            match (data.len() / 7000) % 3 {
                0 => data.extend_from_slice(format!("{{\"id\":{},\"name\":\"glyph\"}},", data.len()).as_bytes()),
                1 => data.extend(std::iter::repeat(b'a' + (data.len() % 26) as u8).take(300)),
                _ => {
                    x ^= x << 13;
                    x ^= x >> 7;
                    x ^= x << 17;
                    data.extend_from_slice(&x.to_le_bytes());
                }
            }
        }
        data.truncate(len);
        let dir = std::env::temp_dir();
        let src = dir.join(format!("spellwright-cache-{tag}-{}.bin", std::process::id()));
        let dst = src.with_extension("ppk");
        std::fs::File::create(&src).unwrap().write_all(&data).unwrap();
        pack::write_pack(&src, &dst, block_size).unwrap();
        std::fs::remove_file(src).ok();
        (dst, data)
    }

    fn block<'a>(data: &'a [u8], bs: usize, i: usize) -> &'a [u8] {
        &data[i * bs..((i + 1) * bs).min(data.len())]
    }

    fn opts_under_test() -> Vec<StoreOptions> {
        let mut v = vec![
            StoreOptions { read: ReadMode::Buffered, decode: Decode::Cpu },
        ];
        if cfg!(windows) {
            v.push(StoreOptions { read: ReadMode::Direct, decode: Decode::Cpu });
        }
        match GpuDecoder::new() {
            Ok(_) => v.push(StoreOptions::default()),
            Err(e) => eprintln!("skipping GPU ChunkStore tests: {e}"),
        }
        v
    }

    #[test]
    fn get_many_returns_correct_blocks_in_request_order() {
        let bs = 4096;
        let (path, data) = temp_pack("order", 37 * bs + 123, bs as u32);
        for opts in opts_under_test() {
            let store = ChunkStore::open_with(&path, usize::MAX, opts).unwrap();
            assert_eq!(store.block_count(), 38);
            let req = [37, 0, 5, 5, 6, 7, 20, 36, 1];
            let got = store.get_many(&req).unwrap();
            for (&b, d) in req.iter().zip(&got) {
                assert_eq!(&d[..], block(&data, bs, b), "{opts:?} block {b}");
            }
            let s = store.stats();
            assert_eq!((s.misses, s.hits, s.batches), (8, 1, 1), "{opts:?}");
            assert_eq!(s.bytes_decoded, 7 * bs as u64 + 123);
            // Everything requested is now a hit.
            store.get_many(&req).unwrap();
            assert_eq!(store.stats().misses, 8);
            assert_eq!(store.stats().hits, 1 + req.len() as u64);
            // Whole pack, all at once.
            let all: Vec<usize> = (0..38).collect();
            for (b, d) in all.iter().zip(store.get_many(&all).unwrap()) {
                assert_eq!(&d[..], block(&data, bs, *b), "{opts:?} block {b}");
            }
            assert!(store.get(38).is_err());
        }
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn evicts_least_recently_used_under_capacity() {
        let bs = 4096;
        let (path, data) = temp_pack("evict", 16 * bs, bs as u32);
        for opts in opts_under_test() {
            let store = ChunkStore::open_with(&path, 4 * bs, opts).unwrap();
            store.get_many(&[0, 1, 2, 3]).unwrap();
            assert_eq!(store.cached_blocks(), 4);
            store.get(0).unwrap(); // 0 is now most recent; 1 is the LRU
            store.get(4).unwrap(); // evicts 1
            assert_eq!(store.cached_blocks(), 4);
            assert!(store.cached_bytes() <= 4 * bs);
            store.reset_stats();
            for b in [0, 2, 3, 4] {
                assert_eq!(&store.get(b).unwrap()[..], block(&data, bs, b));
            }
            assert_eq!(store.stats().misses, 0, "{opts:?}: 0,2,3,4 should be cached");
            assert_eq!(&store.get(1).unwrap()[..], block(&data, bs, 1));
            assert_eq!(store.stats().misses, 1, "{opts:?}: 1 should have been evicted");
            // A batch larger than the cache still returns everything correctly.
            let all: Vec<usize> = (0..16).collect();
            for (b, d) in all.iter().zip(store.get_many(&all).unwrap()) {
                assert_eq!(&d[..], block(&data, bs, *b));
            }
            assert!(store.cached_bytes() <= 4 * bs);
            // Zero capacity caches nothing.
            let none = ChunkStore::open_with(&path, 0, opts).unwrap();
            none.get(3).unwrap();
            none.get(3).unwrap();
            assert_eq!((none.stats().misses, none.cached_blocks()), (2, 0));
        }
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn concurrent_readers_see_correct_data() {
        let bs = 4096;
        let (path, data) = temp_pack("threads", 64 * bs + 5, bs as u32);
        for opts in opts_under_test() {
            let store = ChunkStore::open_with(&path, 16 * bs, opts).unwrap();
            std::thread::scope(|s| {
                for t in 0..4u64 {
                    let (store, data) = (&store, &data);
                    s.spawn(move || {
                        let mut x = t * 7919 + 1;
                        for _ in 0..50 {
                            let req: Vec<usize> = (0..6)
                                .map(|_| {
                                    x = x.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
                                    (x >> 33) as usize % 65
                                })
                                .collect();
                            for (&b, d) in req.iter().zip(store.get_many(&req).unwrap()) {
                                assert_eq!(&d[..], block(data, bs, b));
                            }
                        }
                    });
                }
            });
            let s = store.stats();
            assert_eq!(s.hits + s.misses, 4 * 50 * 6);
            assert!(store.cached_bytes() <= 16 * bs);
        }
        std::fs::remove_file(path).ok();
    }
}
