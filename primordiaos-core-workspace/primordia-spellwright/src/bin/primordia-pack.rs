//! primordia-pack: build or verify a .ppk pack file (src/pack.rs).
//!
//!   primordia-pack <input> <output.ppk> [--block-size N]
//!   primordia-pack --verify <file.ppk> <original>

use primordia_spellwright::pack::{self, DEFAULT_BLOCK_SIZE};
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use std::process::ExitCode;
use std::time::Instant;

const USAGE: &str = "usage: primordia-pack <input> <output.ppk> [--block-size N]\n       primordia-pack --verify <file.ppk> <original>";

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let result = match args.iter().map(String::as_str).collect::<Vec<_>>()[..] {
        ["--verify", ppk, original] => verify(Path::new(ppk), Path::new(original)),
        [input, output] => build(Path::new(input), Path::new(output), DEFAULT_BLOCK_SIZE),
        [input, output, "--block-size", n] => match n.parse() {
            Ok(n) => build(Path::new(input), Path::new(output), n),
            Err(_) => Err(format!("bad block size {n:?}").into()),
        },
        _ => {
            eprintln!("{USAGE}");
            return ExitCode::from(2);
        }
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("primordia-pack: {e}");
            ExitCode::FAILURE
        }
    }
}

fn build(input: &Path, output: &Path, block_size: u32) -> Result<(), Box<dyn std::error::Error>> {
    let t = Instant::now();
    let h = pack::write_pack(input, output, block_size)?;
    let (_, entries) = pack::read_index(output)?;
    let packed = std::fs::metadata(output)?.len();
    let stored = entries.iter().filter(|e| e.stored()).count();
    println!(
        "{} -> {}: {} bytes in {} blocks of {} ({} stored), pack {} bytes ({:.1}%), {:.2}s",
        input.display(),
        output.display(),
        h.original_size,
        h.block_count,
        h.block_size,
        stored,
        packed,
        100.0 * packed as f64 / h.original_size.max(1) as f64,
        t.elapsed().as_secs_f64()
    );
    Ok(())
}

fn verify(ppk: &Path, original: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let t = Instant::now();
    let (h, entries) = pack::read_index(ppk)?;
    let mut orig = File::open(original)?;
    let orig_len = orig.metadata()?.len();
    if orig_len != h.original_size {
        return Err(format!("original is {orig_len} bytes, pack says {}", h.original_size).into());
    }
    let mut packf = File::open(ppk)?;
    let mut comp = vec![0u8; h.block_size as usize];
    let mut out = vec![0u8; h.block_size as usize];
    let mut want = vec![0u8; h.block_size as usize];
    for (i, e) in entries.iter().enumerate() {
        comp.resize(e.len() as usize, 0);
        packf.seek(SeekFrom::Start(e.comp_offset))?;
        packf.read_exact(&mut comp)?;
        pack::decode_block_cpu(&comp, e, &mut out).map_err(|err| format!("block {i}: {err}"))?;
        let raw = e.raw_size as usize;
        orig.read_exact(&mut want[..raw])?;
        if out[..raw] != want[..raw] {
            let at = out[..raw].iter().zip(&want[..raw]).position(|(a, b)| a != b).unwrap_or(0);
            return Err(format!("block {i}: mismatch at original byte {}", i as u64 * h.block_size as u64 + at as u64).into());
        }
    }
    println!("{}: {} blocks, {} bytes verified OK in {:.2}s", ppk.display(), h.block_count, h.original_size, t.elapsed().as_secs_f64());
    Ok(())
}
