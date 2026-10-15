//! File-backed byte ring for the HTTP ingest engine (`primordia-ingest`).
//!
//! Each record is a 4-byte little-endian length followed by the payload, and
//! either part may wrap past the end of the mapping. Head and tail are byte
//! counters that only grow; their difference is the space in use. They live in
//! memory, not in the file, so queued records do not survive a restart.

use std::fs::OpenOptions;
use std::path::Path;
use memmap2::MmapMut;

const LEN_PREFIX: usize = 4;

pub struct ZeroCopyRingBuffer {
    mmap: MmapMut,
    capacity: usize,
    head: u64,
    tail: u64,
}

impl ZeroCopyRingBuffer {
    /// Creates or opens a memory-mapped file-backed ring buffer of a given capacity
    pub fn new<P: AsRef<Path>>(path: P, capacity: usize) -> Result<Self, std::io::Error> {
        if capacity <= LEN_PREFIX {
            return Err(std::io::Error::new(std::io::ErrorKind::InvalidInput, "ring capacity too small"));
        }
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(path)?;

        file.set_len(capacity as u64)?;

        let mmap = unsafe { MmapMut::map_mut(&file)? };

        Ok(Self { mmap, capacity, head: 0, tail: 0 })
    }

    /// Returns the whole mapped region
    pub fn as_bytes(&self) -> &[u8] {
        &self.mmap[..]
    }

    /// Returns the whole mapped region, writable
    pub fn as_mut_bytes(&mut self) -> &mut [u8] {
        &mut self.mmap[..]
    }

    #[inline]
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Bytes currently queued, including length prefixes
    #[inline]
    pub fn used(&self) -> usize {
        (self.tail - self.head) as usize
    }

    #[inline]
    pub fn is_empty(&self) -> bool {
        self.head == self.tail
    }

    /// Length of the next record, if any
    pub fn peek_len(&self) -> Option<usize> {
        if self.is_empty() {
            return None;
        }
        let mut len_bytes = [0u8; LEN_PREFIX];
        self.read_at(self.head, &mut len_bytes);
        Some(u32::from_le_bytes(len_bytes) as usize)
    }

    /// Appends one record. Fails without writing anything if it does not fit.
    pub fn push(&mut self, data: &[u8]) -> Result<usize, &'static str> {
        let len = data.len();
        if len > u32::MAX as usize || len + LEN_PREFIX > self.capacity {
            return Err("Payload too large for ring capacity");
        }
        if len + LEN_PREFIX > self.capacity - self.used() {
            return Err("Ring buffer full");
        }

        let tail = self.tail;
        self.write_at(tail, &(len as u32).to_le_bytes());
        self.write_at(tail + LEN_PREFIX as u64, data);
        self.tail = tail + (LEN_PREFIX + len) as u64;
        Ok(len)
    }

    /// Removes the next record into `buf`. If `buf` is too small the record
    /// stays queued; use `peek_len` to size the buffer.
    pub fn pop(&mut self, buf: &mut [u8]) -> Result<usize, &'static str> {
        let len = self.peek_len().ok_or("Ring buffer empty")?;
        if buf.len() < len {
            return Err("Provided destination buffer too small");
        }
        self.read_at(self.head + LEN_PREFIX as u64, &mut buf[..len]);
        self.head += (LEN_PREFIX + len) as u64;
        Ok(len)
    }

    fn write_at(&mut self, pos: u64, data: &[u8]) {
        let start = (pos % self.capacity as u64) as usize;
        let first = data.len().min(self.capacity - start);
        self.mmap[start..start + first].copy_from_slice(&data[..first]);
        self.mmap[..data.len() - first].copy_from_slice(&data[first..]);
    }

    fn read_at(&self, pos: u64, out: &mut [u8]) {
        let start = (pos % self.capacity as u64) as usize;
        let first = out.len().min(self.capacity - start);
        let n = out.len();
        out[..first].copy_from_slice(&self.mmap[start..start + first]);
        out[first..].copy_from_slice(&self.mmap[..n - first]);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_mmap_ring_buffer_creation() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("ring_test.mmap");

        let mut ring = ZeroCopyRingBuffer::new(&file_path, 4096).unwrap();
        assert_eq!(ring.capacity(), 4096);

        let data = b"PRIMORDIA_ZERO_COPY_PAYLOAD";
        let mut_bytes = ring.as_mut_bytes();
        mut_bytes[..data.len()].copy_from_slice(data);

        let read_bytes = ring.as_bytes();
        assert_eq!(&read_bytes[..data.len()], data);
    }

    #[test]
    fn test_atomic_push() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("ring_push.mmap");

        let mut ring = ZeroCopyRingBuffer::new(&file_path, 4096).unwrap();
        let payload = b"SYSTEM_STATE_SYNCHRONIZED";

        let written = ring.push(payload).unwrap();
        assert_eq!(written, payload.len());
    }

    #[test]
    fn test_atomic_push_pop_roundtrip() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("ring_roundtrip.mmap");

        let mut ring = ZeroCopyRingBuffer::new(&file_path, 4096).unwrap();
        let payload = b"HYBRID_COMPUTE_STREAM_PAYLOAD";

        ring.push(payload).unwrap();

        let mut out_buf = [0u8; 256];
        let bytes_read = ring.pop(&mut out_buf).unwrap();

        assert_eq!(bytes_read, payload.len());
        assert_eq!(&out_buf[..bytes_read], payload);
        assert!(ring.is_empty());
    }

    #[test]
    fn test_wraps_past_capacity_many_times() {
        let dir = tempdir().unwrap();
        let mut ring = ZeroCopyRingBuffer::new(dir.path().join("wrap.mmap"), 100).unwrap();
        let mut out = [0u8; 100];
        // 37-byte records: neither prefix nor payload ever lines up with the end.
        for i in 0u32..1000 {
            let payload: Vec<u8> = (0..33).map(|j| (i as u8).wrapping_add(j)).collect();
            ring.push(&payload).unwrap();
            let n = ring.pop(&mut out).unwrap();
            assert_eq!(&out[..n], &payload[..]);
        }
        assert!(ring.is_empty());
    }

    #[test]
    fn test_full_rejects_without_overwriting() {
        let dir = tempdir().unwrap();
        let mut ring = ZeroCopyRingBuffer::new(dir.path().join("full.mmap"), 64).unwrap();
        ring.push(&[1u8; 28]).unwrap(); // 32 bytes used
        ring.push(&[2u8; 28]).unwrap(); // 64 bytes used
        assert_eq!(ring.push(&[3u8; 1]), Err("Ring buffer full"));
        assert_eq!(ring.push(&[0u8; 61]), Err("Payload too large for ring capacity"));

        let mut out = [0u8; 64];
        assert_eq!(ring.pop(&mut out).unwrap(), 28);
        assert_eq!(&out[..28], &[1u8; 28]);
        ring.push(&[3u8; 28]).unwrap(); // reuses the freed space
        assert_eq!(ring.pop(&mut out).unwrap(), 28);
        assert_eq!(&out[..28], &[2u8; 28]);
        assert_eq!(ring.pop(&mut out).unwrap(), 28);
        assert_eq!(&out[..28], &[3u8; 28]);
        assert_eq!(ring.pop(&mut out), Err("Ring buffer empty"));
    }

    #[test]
    fn test_small_destination_keeps_record() {
        let dir = tempdir().unwrap();
        let mut ring = ZeroCopyRingBuffer::new(dir.path().join("small.mmap"), 256).unwrap();
        ring.push(b"0123456789").unwrap();
        let mut tiny = [0u8; 4];
        assert_eq!(ring.pop(&mut tiny), Err("Provided destination buffer too small"));
        assert_eq!(ring.peek_len(), Some(10));
        let mut out = vec![0u8; ring.peek_len().unwrap()];
        assert_eq!(ring.pop(&mut out).unwrap(), 10);
        assert_eq!(&out, b"0123456789");
    }
}

#[cfg(test)]
mod concurrent_stress_tests {
    use super::*;
    use tempfile::tempdir;
    use std::sync::Arc;
    use std::thread;

    #[test]
    fn test_concurrent_multi_producer_consumer_ring() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("concurrent_ring.mmap");

        // Small enough that producers wrap and wait on the consumer.
        let ring = Arc::new(std::sync::Mutex::new(
            ZeroCopyRingBuffer::new(&file_path, 512).unwrap()
        ));

        let num_producers = 4;
        let items_per_producer = 500;
        let mut handles = vec![];

        for p in 0..num_producers {
            let ring_clone = Arc::clone(&ring);
            handles.push(thread::spawn(move || {
                for i in 0..items_per_producer {
                    let payload = format!("PRODUCER_{}_PAYLOAD_{}", p, i);
                    loop {
                        if ring_clone.lock().unwrap().push(payload.as_bytes()).is_ok() {
                            break;
                        }
                        thread::yield_now();
                    }
                }
            }));
        }

        let consumer = {
            let ring = Arc::clone(&ring);
            thread::spawn(move || {
                let mut next = vec![0usize; num_producers];
                let mut out = [0u8; 512];
                let mut total = 0;
                while total < num_producers * items_per_producer {
                    let popped = ring.lock().unwrap().pop(&mut out);
                    match popped {
                        Ok(len) => {
                            let s = std::str::from_utf8(&out[..len]).unwrap();
                            let rest = s.strip_prefix("PRODUCER_").unwrap();
                            let (p, i) = rest.split_once("_PAYLOAD_").unwrap();
                            let (p, i): (usize, usize) = (p.parse().unwrap(), i.parse().unwrap());
                            assert_eq!(i, next[p], "records from one producer arrive in order");
                            next[p] += 1;
                            total += 1;
                        }
                        Err(_) => thread::yield_now(),
                    }
                }
            })
        };

        for handle in handles {
            handle.join().unwrap();
        }
        consumer.join().unwrap();
        assert!(ring.lock().unwrap().is_empty());
    }
}
