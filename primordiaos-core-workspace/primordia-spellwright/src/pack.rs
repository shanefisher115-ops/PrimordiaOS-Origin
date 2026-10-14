//! Pack files (.ppk): a file cut into independent LZ4 blocks so many can be
//! decoded at once (on the GPU by `decoder::GpuDecoder`, or on the CPU here).
//!
//! Layout, little-endian:
//! - header, 32 bytes: magic `PPK1` | version u32 = 1 | block_size u32 | block_count u32 |
//!   original_size u64 | index_offset u64
//! - block data, each block starting at a 4-byte-aligned file offset
//! - index at index_offset: block_count entries of 16 bytes:
//!   comp_offset u64 | comp_size u32 | raw_size u32
//!
//! Bit 31 of comp_size marks a block stored uncompressed (length = comp_size & 0x7FFF_FFFF);
//! otherwise the block is a raw LZ4 block (block format, no frame). raw_size <= block_size and
//! only the last block may be shorter. block_size is a multiple of 4, so blocks decoded back to
//! back land on 4-byte-aligned output offsets (which the GPU decoder requires).

use std::fs::File;
use std::io::{self, BufWriter, Read, Seek, SeekFrom, Write};
use std::path::Path;

pub const MAGIC: [u8; 4] = *b"PPK1";
pub const VERSION: u32 = 1;
pub const HEADER_SIZE: u64 = 32;
pub const ENTRY_SIZE: u64 = 16;
pub const DEFAULT_BLOCK_SIZE: u32 = 65536;
/// Bit 31 of `comp_size`: block stored uncompressed.
pub const STORED_BIT: u32 = 0x8000_0000;
/// Largest block size `write_pack` accepts: the GPU decoder's per-job limit (one LZ4 sequence,
/// up to a whole block, runs within a single dispatch). Larger blocks only decode on the CPU.
pub const MAX_BLOCK_SIZE: u32 = 65536;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PackHeader {
    pub block_size: u32,
    pub block_count: u32,
    pub original_size: u64,
    pub index_offset: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct BlockEntry {
    pub comp_offset: u64,
    /// Raw field: length in the low 31 bits, `STORED_BIT` if stored uncompressed.
    pub comp_size: u32,
    pub raw_size: u32,
}

impl BlockEntry {
    pub fn stored(&self) -> bool {
        self.comp_size & STORED_BIT != 0
    }

    /// Bytes the block occupies in the pack file.
    #[allow(clippy::len_without_is_empty)]
    pub fn len(&self) -> u32 {
        self.comp_size & !STORED_BIT
    }
}

fn invalid(msg: impl Into<String>) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, msg.into())
}

impl PackHeader {
    fn to_bytes(self) -> [u8; HEADER_SIZE as usize] {
        let mut b = [0u8; HEADER_SIZE as usize];
        b[0..4].copy_from_slice(&MAGIC);
        b[4..8].copy_from_slice(&VERSION.to_le_bytes());
        b[8..12].copy_from_slice(&self.block_size.to_le_bytes());
        b[12..16].copy_from_slice(&self.block_count.to_le_bytes());
        b[16..24].copy_from_slice(&self.original_size.to_le_bytes());
        b[24..32].copy_from_slice(&self.index_offset.to_le_bytes());
        b
    }

    fn from_bytes(b: &[u8; HEADER_SIZE as usize]) -> io::Result<Self> {
        if b[0..4] != MAGIC {
            return Err(invalid("not a pack file (bad magic)"));
        }
        let u32_at = |o: usize| u32::from_le_bytes(b[o..o + 4].try_into().unwrap());
        let u64_at = |o: usize| u64::from_le_bytes(b[o..o + 8].try_into().unwrap());
        if u32_at(4) != VERSION {
            return Err(invalid(format!("unsupported pack version {}", u32_at(4))));
        }
        Ok(Self { block_size: u32_at(8), block_count: u32_at(12), original_size: u64_at(16), index_offset: u64_at(24) })
    }
}

/// Reads and validates the header and block index. Every entry is checked to lie inside the
/// block data area, be 4-byte aligned, and have consistent sizes, so callers can trust offsets.
pub fn read_index(path: impl AsRef<Path>) -> io::Result<(PackHeader, Vec<BlockEntry>)> {
    let mut f = File::open(path)?;
    let file_len = f.metadata()?.len();
    let mut hb = [0u8; HEADER_SIZE as usize];
    f.read_exact(&mut hb)?;
    let h = PackHeader::from_bytes(&hb)?;
    if h.block_size == 0 || h.block_size % 4 != 0 || h.block_size >= STORED_BIT {
        return Err(invalid(format!("bad block size {}", h.block_size)));
    }
    let blocks_needed = h.original_size.div_ceil(h.block_size as u64);
    if blocks_needed != h.block_count as u64 {
        return Err(invalid(format!(
            "block count {} does not cover original size {} at block size {}",
            h.block_count, h.original_size, h.block_size
        )));
    }
    let index_len = h.block_count as u64 * ENTRY_SIZE;
    if h.index_offset < HEADER_SIZE || h.index_offset.checked_add(index_len) != Some(file_len) {
        return Err(invalid("index does not end at end of file"));
    }
    f.seek(SeekFrom::Start(h.index_offset))?;
    let mut raw = vec![0u8; index_len as usize];
    f.read_exact(&mut raw)?;
    let mut entries = Vec::with_capacity(h.block_count as usize);
    for (i, e) in raw.chunks_exact(ENTRY_SIZE as usize).enumerate() {
        let entry = BlockEntry {
            comp_offset: u64::from_le_bytes(e[0..8].try_into().unwrap()),
            comp_size: u32::from_le_bytes(e[8..12].try_into().unwrap()),
            raw_size: u32::from_le_bytes(e[12..16].try_into().unwrap()),
        };
        let last = i + 1 == h.block_count as usize;
        let expected_raw = if last { h.original_size - i as u64 * h.block_size as u64 } else { h.block_size as u64 };
        if entry.raw_size as u64 != expected_raw {
            return Err(invalid(format!("block {i}: raw size {} (expected {expected_raw})", entry.raw_size)));
        }
        if entry.comp_offset % 4 != 0
            || entry.comp_offset < HEADER_SIZE
            || entry.comp_offset + entry.len() as u64 > h.index_offset
        {
            return Err(invalid(format!("block {i}: data range out of bounds or misaligned")));
        }
        if entry.stored() && entry.len() != entry.raw_size {
            return Err(invalid(format!("block {i}: stored block size {} != raw size {}", entry.len(), entry.raw_size)));
        }
        entries.push(entry);
    }
    Ok((h, entries))
}

/// Packs `src` into `dst`. Blocks that LZ4 does not shrink are stored uncompressed.
pub fn write_pack(src: &Path, dst: &Path, block_size: u32) -> io::Result<PackHeader> {
    if block_size == 0 || block_size % 4 != 0 || block_size > MAX_BLOCK_SIZE {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("block size must be a nonzero multiple of 4 and at most {MAX_BLOCK_SIZE}"),
        ));
    }
    let mut input = File::open(src)?;
    let mut out = BufWriter::with_capacity(1 << 20, File::create(dst)?);
    out.write_all(&[0u8; HEADER_SIZE as usize])?;
    let mut pos = HEADER_SIZE;
    let mut entries = Vec::new();
    let mut original_size = 0u64;
    let mut buf = vec![0u8; block_size as usize];
    loop {
        // Fill a whole block (read may return short counts before EOF).
        let mut n = 0;
        while n < buf.len() {
            match input.read(&mut buf[n..])? {
                0 => break,
                k => n += k,
            }
        }
        if n == 0 {
            break;
        }
        let raw = &buf[..n];
        let comp = lz4_flex::block::compress(raw);
        let (data, comp_size) =
            if comp.len() < raw.len() { (&comp[..], comp.len() as u32) } else { (raw, n as u32 | STORED_BIT) };
        out.write_all(data)?;
        entries.push(BlockEntry { comp_offset: pos, comp_size, raw_size: n as u32 });
        pos += data.len() as u64;
        let pad = pos.next_multiple_of(4) - pos;
        out.write_all(&[0u8; 3][..pad as usize])?;
        pos += pad;
        original_size += n as u64;
        if n < buf.len() {
            break;
        }
    }
    let block_count = u32::try_from(entries.len()).map_err(|_| invalid("too many blocks"))?;
    let header = PackHeader { block_size, block_count, original_size, index_offset: pos };
    for e in &entries {
        out.write_all(&e.comp_offset.to_le_bytes())?;
        out.write_all(&e.comp_size.to_le_bytes())?;
        out.write_all(&e.raw_size.to_le_bytes())?;
    }
    let mut f = out.into_inner().map_err(|e| e.into_error())?;
    f.seek(SeekFrom::Start(0))?;
    f.write_all(&header.to_bytes())?;
    f.sync_all()?;
    Ok(header)
}

/// Decodes one block on the CPU. `comp` is the block's bytes in the pack (`entry.len()` long);
/// exactly `entry.raw_size` bytes are written to the front of `out`.
pub fn decode_block_cpu(comp: &[u8], entry: &BlockEntry, out: &mut [u8]) -> io::Result<()> {
    let raw = entry.raw_size as usize;
    if comp.len() != entry.len() as usize {
        return Err(invalid(format!("block data is {} bytes, index says {}", comp.len(), entry.len())));
    }
    if out.len() < raw {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "output buffer shorter than raw size"));
    }
    let out = &mut out[..raw];
    if entry.stored() {
        if comp.len() != raw {
            return Err(invalid("stored block size differs from raw size"));
        }
        out.copy_from_slice(comp);
        return Ok(());
    }
    let n = lz4_flex::block::decompress_into(comp, out).map_err(|e| invalid(format!("lz4: {e}")))?;
    if n != raw {
        return Err(invalid(format!("lz4 block decoded to {n} bytes, expected {raw}")));
    }
    Ok(())
}
