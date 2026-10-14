//! Storage side of the pack pipeline: read byte ranges of a file straight into a
//! caller-provided buffer, normally [`crate::decoder::GpuDecoder::input_mut`].
//!
//! On this machine the GPU shares system RAM, so the decoder's mapped input
//! buffer *is* the destination of the disk read; there is no staging copy and no
//! VRAM upload. [`ReadMode::Direct`] opens the file with
//! FILE_FLAG_NO_BUFFERING | FILE_FLAG_OVERLAPPED and keeps several reads in
//! flight, so the bytes land in that buffer without passing through the OS file
//! cache. Unbuffered I/O needs sector-aligned file offsets, lengths and buffer
//! addresses: [`DirectReader::plan`] widens every requested range to the sector
//! size, merges ranges whose widened spans touch, and reports where inside the
//! buffer each requested range ends up. [`ReadMode::Buffered`] uses ordinary
//! cached reads with the same plan/read interface, for comparison and for
//! platforms other than Windows.

use std::fs::File;
use std::io;
use std::path::Path;

/// How a [`DirectReader`] reads.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReadMode {
    /// Unbuffered, overlapped reads that bypass the OS file cache (Windows only).
    Direct,
    /// Ordinary cached reads, one at a time.
    Buffered,
}

/// One contiguous read: `len` bytes from `file_offset` into `buf[buf_offset..]`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Extent {
    pub file_offset: u64,
    pub len: usize,
    pub buf_offset: usize,
}

/// The reads needed for a set of requested ranges.
#[derive(Clone, Debug, Default)]
pub struct ReadPlan {
    /// Disjoint reads in ascending file order, packed back to back in the buffer.
    pub extents: Vec<Extent>,
    /// For each requested range (in request order), its offset in the buffer.
    pub offsets: Vec<usize>,
    /// Buffer bytes the plan needs.
    pub total: usize,
}

/// Reads byte ranges of one file into a caller-provided buffer.
pub struct DirectReader {
    file: File,
    mode: ReadMode,
    len: u64,
    align: usize,
    merge_gap: u64,
    max_io: usize,
    #[cfg(windows)]
    events: Vec<std::os::windows::io::OwnedHandle>,
}

/// Default number of unbuffered reads kept in flight.
pub const DEFAULT_QUEUE_DEPTH: usize = 8;
/// Default size of one unbuffered read; larger extents are split.
pub const DEFAULT_MAX_IO: usize = 1 << 20;

impl DirectReader {
    pub fn open(path: impl AsRef<Path>, mode: ReadMode) -> io::Result<Self> {
        let path = path.as_ref();
        let (file, align) = match mode {
            ReadMode::Buffered => (File::open(path)?, 1),
            #[cfg(windows)]
            ReadMode::Direct => windows::open_unbuffered(path)?,
            #[cfg(not(windows))]
            ReadMode::Direct => {
                return Err(io::Error::new(io::ErrorKind::Unsupported, "direct reads are Windows-only"));
            }
        };
        let len = file.metadata()?.len();
        Ok(DirectReader {
            file,
            mode,
            len,
            align,
            merge_gap: 0,
            max_io: DEFAULT_MAX_IO.max(align),
            #[cfg(windows)]
            events: match mode {
                ReadMode::Direct => windows::events(DEFAULT_QUEUE_DEPTH)?,
                ReadMode::Buffered => Vec::new(),
            },
        })
    }

    pub fn mode(&self) -> ReadMode {
        self.mode
    }

    /// File length in bytes.
    pub fn len(&self) -> u64 {
        self.len
    }

    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    /// Alignment every read obeys: the volume sector size for direct reads, 1 for buffered.
    pub fn alignment(&self) -> usize {
        self.align
    }

    /// Merge ranges separated by at most `gap` bytes into one read (default 0:
    /// only touching or overlapping ranges merge). Skipped bytes are read anyway.
    pub fn set_merge_gap(&mut self, gap: u64) {
        self.merge_gap = gap;
    }

    /// Unbuffered reads in flight at once (direct mode only).
    pub fn set_queue_depth(&mut self, depth: usize) -> io::Result<()> {
        #[cfg(windows)]
        if self.mode == ReadMode::Direct {
            self.events = windows::events(depth.max(1))?;
        }
        let _ = depth;
        Ok(())
    }

    /// Largest single unbuffered read; longer extents are split (rounded to the alignment).
    pub fn set_max_io(&mut self, bytes: usize) {
        self.max_io = bytes.max(self.align).next_multiple_of(self.align);
    }

    /// Upper bound on bytes one plan for these range lengths can need, whatever the offsets.
    pub fn worst_case_len(&self, lens: impl IntoIterator<Item = usize>) -> usize {
        lens.into_iter().map(|l| if l == 0 { 0 } else { l + 2 * self.align }).sum()
    }

    /// Lays out `ranges` (file offset, length) for one [`read`](Self::read).
    /// Ranges may be in any order and may overlap.
    pub fn plan(&self, ranges: &[(u64, usize)]) -> io::Result<ReadPlan> {
        let a = self.align as u64;
        let mut order: Vec<usize> = (0..ranges.len()).collect();
        order.sort_by_key(|&i| ranges[i].0);
        let mut plan = ReadPlan { extents: Vec::new(), offsets: vec![0; ranges.len()], total: 0 };
        for i in order {
            let (off, len) = ranges[i];
            if len == 0 {
                continue;
            }
            let end = off.checked_add(len as u64).filter(|&e| e <= self.len).ok_or_else(|| {
                io::Error::new(
                    io::ErrorKind::UnexpectedEof,
                    format!("range {off}+{len} is past the end of the file ({} bytes)", self.len),
                )
            })?;
            let (start, stop) = (off / a * a, end.div_ceil(a) * a);
            match plan.extents.last_mut() {
                Some(x) if start <= x.file_offset + x.len as u64 + self.merge_gap => {
                    let new_len = (stop.max(x.file_offset + x.len as u64) - x.file_offset) as usize;
                    x.len = new_len;
                    plan.offsets[i] = x.buf_offset + (off - x.file_offset) as usize;
                    plan.total = x.buf_offset + x.len;
                }
                _ => {
                    let buf_offset = plan.total;
                    plan.extents.push(Extent { file_offset: start, len: (stop - start) as usize, buf_offset });
                    plan.offsets[i] = buf_offset + (off - start) as usize;
                    plan.total = buf_offset + (stop - start) as usize;
                }
            }
        }
        Ok(plan)
    }

    /// Executes `plan` into `buf` and returns the bytes actually read from the file.
    /// In direct mode `buf` must start on a sector boundary (a page-aligned
    /// mapping does). Bytes of `buf` past `plan.total`, and bytes of the last
    /// sector past the end of the file, are left unspecified.
    pub fn read(&mut self, plan: &ReadPlan, buf: &mut [u8]) -> io::Result<u64> {
        if buf.len() < plan.total {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("plan needs {} bytes, buffer has {}", plan.total, buf.len()),
            ));
        }
        match self.mode {
            ReadMode::Buffered => self.read_buffered(plan, buf),
            #[cfg(windows)]
            ReadMode::Direct => {
                if buf.as_ptr() as usize % self.align != 0 {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidInput,
                        format!("direct reads need a {}-byte aligned buffer", self.align),
                    ));
                }
                windows::read_direct(&self.file, &self.events, self.len, self.max_io, plan, buf)
            }
            #[cfg(not(windows))]
            ReadMode::Direct => unreachable!("direct readers are never constructed off Windows"),
        }
    }

    /// [`plan`](Self::plan) + [`read`](Self::read); returns each range's offset in `buf`.
    pub fn read_ranges(&mut self, ranges: &[(u64, usize)], buf: &mut [u8]) -> io::Result<Vec<usize>> {
        let plan = self.plan(ranges)?;
        self.read(&plan, buf)?;
        Ok(plan.offsets)
    }

    fn read_buffered(&mut self, plan: &ReadPlan, buf: &mut [u8]) -> io::Result<u64> {
        let mut total = 0u64;
        for x in &plan.extents {
            let want = (self.len.saturating_sub(x.file_offset) as usize).min(x.len);
            let dst = &mut buf[x.buf_offset..x.buf_offset + want];
            let mut done = 0;
            while done < want {
                match read_at(&self.file, &mut dst[done..], x.file_offset + done as u64)? {
                    0 => return Err(io::ErrorKind::UnexpectedEof.into()),
                    n => done += n,
                }
            }
            total += want as u64;
        }
        Ok(total)
    }
}

#[cfg(windows)]
fn read_at(f: &File, buf: &mut [u8], off: u64) -> io::Result<usize> {
    std::os::windows::fs::FileExt::seek_read(f, buf, off)
}

#[cfg(unix)]
fn read_at(f: &File, buf: &mut [u8], off: u64) -> io::Result<usize> {
    std::os::unix::fs::FileExt::read_at(f, buf, off)
}

#[cfg(windows)]
mod windows {
    use super::ReadPlan;
    use std::ffi::c_void;
    use std::fs::File;
    use std::io;
    use std::os::windows::ffi::OsStrExt;
    use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle, RawHandle};
    use std::path::Path;

    type Handle = *mut c_void;
    type Bool = i32;

    #[repr(C)]
    struct Overlapped {
        internal: usize,
        internal_high: usize,
        offset: u32,
        offset_high: u32,
        h_event: Handle,
    }

    /// FILE_STORAGE_INFO.
    #[repr(C)]
    #[derive(Default)]
    struct FileStorageInfo {
        logical_bytes_per_sector: u32,
        physical_bytes_per_sector_for_atomicity: u32,
        physical_bytes_per_sector_for_performance: u32,
        fs_effective_physical_bytes_per_sector_for_atomicity: u32,
        flags: u32,
        byte_offset_for_sector_alignment: u32,
        byte_offset_for_partition_alignment: u32,
    }

    const INVALID_HANDLE_VALUE: Handle = -1isize as Handle;
    const GENERIC_READ: u32 = 0x8000_0000;
    const FILE_SHARE_READ: u32 = 0x1;
    const OPEN_EXISTING: u32 = 3;
    const FILE_FLAG_NO_BUFFERING: u32 = 0x2000_0000;
    const FILE_FLAG_OVERLAPPED: u32 = 0x4000_0000;
    const FILE_STORAGE_INFO_CLASS: i32 = 16;
    const ERROR_HANDLE_EOF: i32 = 38;
    const ERROR_IO_PENDING: i32 = 997;
    /// Used when the volume will not say; every sector size in use divides it.
    const FALLBACK_SECTOR: usize = 4096;

    #[link(name = "kernel32")]
    extern "system" {
        fn CreateFileW(
            name: *const u16,
            access: u32,
            share: u32,
            security: *mut c_void,
            disposition: u32,
            flags: u32,
            template: Handle,
        ) -> Handle;
        fn ReadFile(h: Handle, buf: *mut u8, len: u32, read: *mut u32, ov: *mut Overlapped) -> Bool;
        fn GetOverlappedResult(h: Handle, ov: *mut Overlapped, n: *mut u32, wait: Bool) -> Bool;
        fn CancelIoEx(h: Handle, ov: *mut Overlapped) -> Bool;
        fn CreateEventW(security: *mut c_void, manual_reset: Bool, initial: Bool, name: *const u16) -> Handle;
        fn GetFileInformationByHandleEx(h: Handle, class: i32, info: *mut c_void, size: u32) -> Bool;
    }

    fn owned(h: Handle) -> io::Result<OwnedHandle> {
        if h.is_null() || h == INVALID_HANDLE_VALUE {
            Err(io::Error::last_os_error())
        } else {
            Ok(unsafe { OwnedHandle::from_raw_handle(h as RawHandle) })
        }
    }

    pub(super) fn events(n: usize) -> io::Result<Vec<OwnedHandle>> {
        // Manual-reset, as overlapped I/O requires; ReadFile resets it on entry.
        (0..n).map(|_| owned(unsafe { CreateEventW(std::ptr::null_mut(), 1, 0, std::ptr::null()) })).collect()
    }

    /// Opens `path` for unbuffered overlapped reads; returns it with its sector size.
    pub(super) fn open_unbuffered(path: &Path) -> io::Result<(File, usize)> {
        let w: Vec<u16> = path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
        let h = owned(unsafe {
            CreateFileW(
                w.as_ptr(),
                GENERIC_READ,
                FILE_SHARE_READ,
                std::ptr::null_mut(),
                OPEN_EXISTING,
                FILE_FLAG_NO_BUFFERING | FILE_FLAG_OVERLAPPED,
                std::ptr::null_mut(),
            )
        })?;
        let mut info = FileStorageInfo::default();
        let ok = unsafe {
            GetFileInformationByHandleEx(
                h.as_raw_handle() as Handle,
                FILE_STORAGE_INFO_CLASS,
                &mut info as *mut _ as *mut c_void,
                std::mem::size_of::<FileStorageInfo>() as u32,
            )
        };
        // Offsets and lengths must be multiples of the logical sector size; the
        // physical one is what avoids read-modify-write inside the drive. Use the larger.
        let sector = (info.logical_bytes_per_sector.max(info.physical_bytes_per_sector_for_performance)) as usize;
        let align = if ok != 0 && sector.is_power_of_two() { sector } else { FALLBACK_SECTOR };
        Ok((File::from(h), align))
    }

    /// One unbuffered read, at most `max_io` bytes.
    struct Piece {
        file_offset: u64,
        buf_offset: usize,
        len: usize,
        /// Bytes that must arrive: `len` clipped to the end of the file.
        need: usize,
    }

    pub(super) fn read_direct(
        file: &File,
        events: &[OwnedHandle],
        file_len: u64,
        max_io: usize,
        plan: &ReadPlan,
        buf: &mut [u8],
    ) -> io::Result<u64> {
        let mut pieces = Vec::new();
        for x in &plan.extents {
            let mut done = 0;
            while done < x.len {
                let len = (x.len - done).min(max_io);
                let file_offset = x.file_offset + done as u64;
                let need = (file_len.saturating_sub(file_offset) as usize).min(len);
                if need > 0 {
                    pieces.push(Piece { file_offset, buf_offset: x.buf_offset + done, len, need });
                }
                done += len;
            }
        }

        let h = file.as_raw_handle() as Handle;
        let depth = events.len();
        // One OVERLAPPED per slot; boxed so their addresses stay put while the kernel holds them.
        let mut slots: Box<[Overlapped]> = events
            .iter()
            .map(|e| Overlapped {
                internal: 0,
                internal_high: 0,
                offset: 0,
                offset_high: 0,
                h_event: e.as_raw_handle() as Handle,
            })
            .collect();
        let base = buf.as_mut_ptr();
        let mut total = 0u64;

        // Piece i uses slot i % depth; before reusing a slot, wait for its previous piece.
        let mut result = Ok(());
        let mut issued = 0;
        let mut completed = 0;
        while completed < pieces.len() {
            if issued < pieces.len() && issued - completed < depth {
                let p = &pieces[issued];
                let ov = &mut slots[issued % depth];
                ov.internal = 0;
                ov.internal_high = 0;
                ov.offset = p.file_offset as u32;
                ov.offset_high = (p.file_offset >> 32) as u32;
                // SAFETY: plan.total <= buf.len() was checked; the slot and buffer outlive the read
                // because every issued read is waited on below, also on the error path.
                let ok = unsafe { ReadFile(h, base.add(p.buf_offset), p.len as u32, std::ptr::null_mut(), ov) };
                if ok == 0 {
                    let e = io::Error::last_os_error();
                    if e.raw_os_error() != Some(ERROR_IO_PENDING) {
                        result = Err(e);
                        break;
                    }
                }
                issued += 1;
                continue;
            }
            let p = &pieces[completed];
            let ov = &mut slots[completed % depth];
            let mut n = 0u32;
            if unsafe { GetOverlappedResult(h, ov, &mut n, 1) } == 0 {
                let e = io::Error::last_os_error();
                if e.raw_os_error() != Some(ERROR_HANDLE_EOF) {
                    completed += 1;
                    result = Err(e);
                    break;
                }
                n = 0;
            }
            completed += 1;
            if (n as usize) < p.need {
                result = Err(io::Error::new(
                    io::ErrorKind::UnexpectedEof,
                    format!("short read at {}: {} of {} bytes", p.file_offset, n, p.need),
                ));
                break;
            }
            total += (n as usize).min(p.len) as u64;
        }

        // On error, cancel and reap whatever is still in flight before the buffer is released.
        while completed < issued {
            let ov = &mut slots[completed % depth];
            let mut n = 0u32;
            unsafe {
                CancelIoEx(h, ov);
                GetOverlappedResult(h, ov, &mut n, 1);
            }
            completed += 1;
        }
        result.map(|()| total)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::path::PathBuf;

    /// A temp file of `len` bytes where byte i is a hash of i, so misplaced bytes are caught.
    fn temp_file(tag: &str, len: usize) -> (PathBuf, Vec<u8>) {
        let data: Vec<u8> = (0..len as u64).map(|i| (i.wrapping_mul(0x9E37_79B9_7F4A_7C15) >> 56) as u8).collect();
        let path = std::env::temp_dir().join(format!("spellwright-storage-{tag}-{}.bin", std::process::id()));
        File::create(&path).unwrap().write_all(&data).unwrap();
        (path, data)
    }

    /// Page-aligned scratch, like the decoder's mapped input buffer.
    struct Aligned(Vec<u8>, usize);
    impl Aligned {
        fn new(len: usize) -> Self {
            let v = vec![0u8; len + 4096];
            let pad = (4096 - v.as_ptr() as usize % 4096) % 4096;
            Aligned(v, pad)
        }
        fn buf(&mut self) -> &mut [u8] {
            let pad = self.1;
            &mut self.0[pad..]
        }
    }

    fn modes() -> Vec<ReadMode> {
        if cfg!(windows) {
            vec![ReadMode::Direct, ReadMode::Buffered]
        } else {
            vec![ReadMode::Buffered]
        }
    }

    fn check(tag: &str, file_len: usize, ranges: &[(u64, usize)]) {
        let (path, data) = temp_file(tag, file_len);
        for mode in modes() {
            let mut r = DirectReader::open(&path, mode).unwrap();
            let plan = r.plan(ranges).unwrap();
            let a = r.alignment();
            for x in &plan.extents {
                assert_eq!(x.file_offset % a as u64, 0, "{mode:?} extent offset unaligned");
                assert_eq!(x.len % a, 0, "{mode:?} extent length unaligned");
                assert_eq!(x.buf_offset % a, 0, "{mode:?} buffer offset unaligned");
            }
            for w in plan.extents.windows(2) {
                assert!(w[0].file_offset + (w[0].len as u64) < w[1].file_offset, "{mode:?} extents should merge");
            }
            let mut buf = Aligned::new(plan.total);
            r.read(&plan, buf.buf()).unwrap();
            for (i, &(off, len)) in ranges.iter().enumerate() {
                let got = &buf.buf()[plan.offsets[i]..plan.offsets[i] + len];
                assert!(got == &data[off as usize..off as usize + len], "{mode:?} range {i} ({off}+{len}) wrong");
            }
        }
        std::fs::remove_file(path).ok();
    }

    #[test]
    fn ranges_crossing_sector_boundaries() {
        check("cross", 64 * 1024, &[(4090, 12), (8191, 2), (100, 5000), (20000, 1)]);
    }

    #[test]
    fn file_tail_not_sector_multiple() {
        // Last range ends exactly at EOF inside a partial sector; another sits wholly in it.
        let len = 3 * 4096 + 777;
        check("tail", len, &[(len as u64 - 500, 500), (3 * 4096 + 1, 10), (0, 1)]);
    }

    #[test]
    fn whole_small_file_and_unsorted_overlapping() {
        check("small", 1000, &[(0, 1000)]);
        check("overlap", 50_000, &[(30_000, 4000), (10, 20), (29_000, 3000), (31_000, 100), (10, 20)]);
    }

    #[test]
    fn extents_larger_than_one_io_are_split_and_reassembled() {
        let len = 3 * DEFAULT_MAX_IO + 12_345;
        check("big", len, &[(5, len - 10), (len as u64 - 1, 1)]);
    }

    #[test]
    fn past_eof_and_short_buffer_are_errors() {
        let (path, _) = temp_file("eof", 5000);
        for mode in modes() {
            let mut r = DirectReader::open(&path, mode).unwrap();
            assert_eq!(r.plan(&[(4999, 2)]).unwrap_err().kind(), io::ErrorKind::UnexpectedEof);
            let plan = r.plan(&[(0, 5000)]).unwrap();
            let mut buf = Aligned::new(plan.total);
            let short = plan.total - 1;
            assert_eq!(r.read(&plan, &mut buf.buf()[..short]).unwrap_err().kind(), io::ErrorKind::InvalidInput);
        }
        std::fs::remove_file(path).ok();
    }

    #[cfg(windows)]
    #[test]
    fn direct_rejects_unaligned_buffer_and_reports_sector() {
        let (path, data) = temp_file("unaligned", 10_000);
        let mut r = DirectReader::open(&path, ReadMode::Direct).unwrap();
        let a = r.alignment();
        assert!(a.is_power_of_two() && (512..=4096).contains(&a), "sector size {a}");
        let plan = r.plan(&[(0, 100)]).unwrap();
        let mut buf = Aligned::new(plan.total + 1);
        assert_eq!(r.read(&plan, &mut buf.buf()[1..]).unwrap_err().kind(), io::ErrorKind::InvalidInput);
        // Merge gap: two far ranges become one read.
        r.set_merge_gap(8192);
        let plan = r.plan(&[(0, 10), (9000, 10)]).unwrap();
        assert_eq!(plan.extents.len(), 1);
        let mut buf = Aligned::new(plan.total);
        r.read(&plan, buf.buf()).unwrap();
        assert_eq!(&buf.buf()[plan.offsets[1]..plan.offsets[1] + 10], &data[9000..9010]);
        std::fs::remove_file(path).ok();
    }
}
