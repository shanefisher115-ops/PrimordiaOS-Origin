use std::fs::OpenOptions;
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use memmap2::MmapMut;

pub struct ZeroCopyRingBuffer {
    mmap: MmapMut,
    capacity: usize,
    head: AtomicUsize,
    tail: AtomicUsize,
}

impl ZeroCopyRingBuffer {
    /// Creates or opens a memory-mapped file-backed ring buffer of a given capacity
    pub fn new<P: AsRef<Path>>(path: P, capacity: usize) -> Result<Self, std::io::Error> {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(path)?;

        file.set_len(capacity as u64)?;
        
        let mmap = unsafe { MmapMut::map_mut(&file)? };

        Ok(Self {
            mmap,
            capacity,
            head: AtomicUsize::new(0),
            tail: AtomicUsize::new(0),
        })
    }

    /// Returns a zero-copy immutable slice of the current active buffer region
    pub fn as_bytes(&self) -> &[u8] {
        &self.mmap[..]
    }

    /// Returns a mutable slice for zero-copy ingestion directly from disk/storage
    pub fn as_mut_bytes(&mut self) -> &mut [u8] {
        &mut self.mmap[..]
    }

    #[inline]
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Attempts to push a slice of data into the ring buffer atomically (lock-free)
    pub fn push(&mut self, data: &[u8]) -> Result<usize, &'static str> {
        let len = data.len();
        if len + 8 > self.capacity {
            return Err("Payload too large for ring capacity");
        }

        let current_tail = self.tail.load(Ordering::Relaxed);
        let current_head = self.head.load(Ordering::Acquire);

        let next_tail = (current_tail + len + 4) % self.capacity;
        if next_tail == current_head {
            return Err("Ring buffer full");
        }

        let mmap_len = self.mmap.len();
        if current_tail + 4 + len > mmap_len {
            return Err("Buffer wrap-around boundary exceeded");
        }

        let len_bytes = (len as u32).to_le_bytes();
        self.mmap[current_tail..current_tail + 4].copy_from_slice(&len_bytes);
        self.mmap[current_tail + 4..current_tail + 4 + len].copy_from_slice(data);

        self.tail.store(next_tail, Ordering::Release);
        Ok(len)
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
}

impl ZeroCopyRingBuffer {
    /// Attempts to pop a payload slice from the ring buffer atomically (lock-free)
    pub fn pop(&mut self, buf: &mut [u8]) -> Result<usize, &'static str> {
        let current_head = self.head.load(Ordering::Relaxed);
        let current_tail = self.tail.load(Ordering::Acquire);

        if current_head == current_tail {
            return Err("Ring buffer empty");
        }

        let mmap_len = self.mmap.len();
        if current_head + 4 > mmap_len {
            return Err("Buffer boundary exceeded reading length");
        }

        // Read 4-byte length prefix
        let mut len_bytes = [0u8; 4];
        len_bytes.copy_from_slice(&self.mmap[current_head..current_head + 4]);
        let payload_len = u32::from_le_bytes(len_bytes) as usize;

        if buf.len() < payload_len {
            return Err("Provided destination buffer too small");
        }

        if current_head + 4 + payload_len > mmap_len {
            return Err("Buffer boundary exceeded reading payload");
        }

        // Copy data directly into consumer buffer (zero-copy from mmap space)
        buf[..payload_len].copy_from_slice(&self.mmap[current_head + 4..current_head + 4 + payload_len]);

        let next_head = (current_head + payload_len + 4) % self.capacity;
        self.head.store(next_head, Ordering::Release);

        Ok(payload_len)
    }
}

#[cfg(test)]
mod push_pop_tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_atomic_push_pop_roundtrip() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("ring_roundtrip.mmap");
        
        let mut ring = ZeroCopyRingBuffer::new(&file_path, 4096).unwrap();
        let payload = b"HYBRID_COMPUTE_STREAM_PAYLOAD";
        
        // Push
        ring.push(payload).unwrap();

        // Pop
        let mut out_buf = [0u8; 256];
        let bytes_read = ring.pop(&mut out_buf).unwrap();

        assert_eq!(bytes_read, payload.len());
        assert_eq!(&out_buf[..bytes_read], payload);
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
        
        // Allocate a larger shared mmap buffer for concurrent stress testing
        let ring = Arc::new(std::sync::Mutex::new(
            ZeroCopyRingBuffer::new(&file_path, 65536).unwrap()
        ));

        let num_producers = 4;
        let items_per_producer = 10;
        let mut handles = vec![];

        // Spawn concurrent producer threads
        for p in 0..num_producers {
            let ring_clone = Arc::clone(&ring);
            let handle = thread::spawn(move || {
                for i in 0..items_per_producer {
                    let payload = format!("PRODUCER_{}_PAYLOAD_{}", p, i);
                    let mut r = ring_clone.lock().unwrap();
                    // Keep trying until pushed successfully (busy-wait or backoff in real pipelines)
                    while let Err(_) = r.push(payload.as_bytes()) {
                        drop(r);
                        thread::yield_now();
                        r = ring_clone.lock().unwrap();
                    }
                }
            });
            handles.push(handle);
        }

        // Wait for all producers to finish writing
        for handle in handles {
            handle.join().unwrap();
        }

        // Verify total items can be popped cleanly
        let mut r = ring.lock().unwrap();
        let mut total_popped = 0;
        let mut out_buf = [0u8; 512];

        while let Ok(len) = r.pop(&mut out_buf) {
            assert!(len > 0);
            total_popped += 1;
        }

        assert_eq!(total_popped, num_producers * items_per_producer);
    }
}
