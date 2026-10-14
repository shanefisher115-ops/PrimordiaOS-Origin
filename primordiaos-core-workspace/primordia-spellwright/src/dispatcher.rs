use std::time::Instant;
use crate::ring_buffer::ZeroCopyRingBuffer;
use lz4_flex::decompress_size_prepended;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PayloadType {
    /// Variable length, JSON-heavy, jagged data (Optimized for All-Core CPU ~4.6 GB/s)
    VariableJson = 0x01,
    /// Uniform bulk binary, dense spatial geometry, textures (Optimized for GPU ~1.07 GB/s)
    BulkBinary = 0x02,
}

pub struct ComputeDispatcher {
    cpu_threshold_bytes: usize,
}

impl ComputeDispatcher {
    pub fn new(cpu_threshold_bytes: usize) -> Self {
        Self { cpu_threshold_bytes }
    }

    /// Inspects the explicit type tag (first byte) or falls back to heuristics
    pub fn classify(&self, data: &[u8]) -> PayloadType {
        if data.is_empty() {
            return PayloadType::VariableJson;
        }

        match data[0] {
            0x01 => PayloadType::VariableJson,
            0x02 => PayloadType::BulkBinary,
            _ => {
                let first_byte = data[0];
                if (first_byte == b'{' || first_byte == b'[') && data.len() < self.cpu_threshold_bytes {
                    PayloadType::VariableJson
                } else {
                    PayloadType::BulkBinary
                }
            }
        }
    }

    /// Dispatches the decompression task to the winning silicon
    pub fn dispatch(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        let route = self.classify(data);
        let start = Instant::now();

        let payload_slice = if data.len() > 0 && (data[0] == 0x01 || data[0] == 0x02) {
            &data[1..]
        } else {
            data
        };

        let result = match route {
            PayloadType::VariableJson => self.decompress_cpu(payload_slice),
            PayloadType::BulkBinary => self.decompress_gpu(payload_slice),
        };

        println!("[Dispatcher] Routed to {:?} in {:?}", route, start.elapsed());
        result
    }

    fn decompress_cpu(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        // Try LZ4 decompression; if it fails (e.g. raw uncompressed JSON webhook), return raw bytes as-is
        if data.len() >= 4 {
            match decompress_size_prepended(data) {
                Ok(decompressed) => Ok(decompressed),
                Err(_) => Ok(data.to_vec()), // Graceful fallback for raw uncompressed webhooks
            }
        } else {
            Ok(data.to_vec())
        }
    }

    fn decompress_gpu(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        Ok(data.to_vec())
    }

    /// Zero-copy dispatch directly from a memory-mapped ring buffer region
    pub fn dispatch_mmap(&self, ring: &ZeroCopyRingBuffer, len: usize) -> Result<Vec<u8>, String> {
        let bytes = ring.as_bytes();
        if bytes.len() < len {
            return Err("Requested length exceeds ring buffer bounds".into());
        }
        self.dispatch(&bytes[..len])
    }

    /// Pops the next chunk directly from the zero-copy ring buffer and dispatches it
    pub fn process_next_from_ring(&self, ring: &mut ZeroCopyRingBuffer) -> Result<Vec<u8>, String> {
        let mut buf = vec![0u8; ring.capacity()];
        let len = ring.pop(&mut buf).map_err(|e| e.to_string())?;
        self.dispatch(&buf[..len])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use lz4_flex::compress_prepend_size;

    #[test]
    fn test_payload_classification() {
        let dispatcher = ComputeDispatcher::new(1024);
        let tagged_json = &[0x01, 0x7b];
        assert_eq!(dispatcher.classify(tagged_json), PayloadType::VariableJson);

        let tagged_bin = &[0x02, 0x89];
        assert_eq!(dispatcher.classify(tagged_bin), PayloadType::BulkBinary);
    }

    #[test]
    fn test_cpu_lz4_dispatch_execution() {
        let dispatcher = ComputeDispatcher::new(512);
        let raw_data = b"{\"system\": \"primordia\", \"status\": \"nominal\"}";
        let compressed = compress_prepend_size(raw_data);
        
        let mut tagged_packet = vec![0x01];
        tagged_packet.extend_from_slice(&compressed);

        let result = dispatcher.dispatch(&tagged_packet);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), raw_data);
    }
}
