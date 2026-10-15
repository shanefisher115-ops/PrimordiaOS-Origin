use std::time::Instant;
use crate::ring_buffer::ZeroCopyRingBuffer;
use lz4_flex::decompress_size_prepended;

/// Largest decoded size accepted from a size-prepended LZ4 payload. Also bounds
/// the allocation when an uncompressed payload's first bytes are misread as a size.
const MAX_DECODED: usize = 64 * 1024 * 1024;
/// LZ4 cannot expand input by more than about 255x.
const MAX_RATIO: usize = 255;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PayloadType {
    /// Variable length, JSON-heavy, jagged data
    VariableJson = 0x01,
    /// Uniform bulk binary, dense spatial geometry, textures
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

    /// Strips the type tag and decodes the payload.
    ///
    /// Both routes decode on the CPU for now: `decoder::GpuDecoder` works on
    /// `.ppk` block jobs and measured about 7.6x slower than four CPU threads
    /// (see README, "Compressed chunk store").
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
        // Size-prepended LZ4 if it decodes; otherwise (e.g. a raw JSON webhook) the bytes as-is.
        if data.len() >= 4 {
            let size = u32::from_le_bytes([data[0], data[1], data[2], data[3]]) as usize;
            if size <= MAX_DECODED && size <= (data.len() - 4).saturating_mul(MAX_RATIO) {
                if let Ok(decompressed) = decompress_size_prepended(data) {
                    return Ok(decompressed);
                }
            }
        }
        Ok(data.to_vec())
    }

    fn decompress_gpu(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        self.decompress_cpu(data)
    }

    /// Pops the next chunk directly from the zero-copy ring buffer and dispatches it
    pub fn process_next_from_ring(&self, ring: &mut ZeroCopyRingBuffer) -> Result<Vec<u8>, String> {
        let mut buf = vec![0u8; ring.peek_len().ok_or("Ring buffer empty")?];
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

    #[test]
    fn test_bulk_lz4_is_decoded() {
        let dispatcher = ComputeDispatcher::new(512);
        let raw_data = vec![7u8; 10_000];
        let mut packet = vec![0x02];
        packet.extend_from_slice(&compress_prepend_size(&raw_data));
        assert_eq!(dispatcher.dispatch(&packet).unwrap(), raw_data);
    }

    #[test]
    fn test_raw_json_passes_through() {
        // '{"sy' read as a little-endian size is ~2 GB; must not be trusted.
        let dispatcher = ComputeDispatcher::new(512);
        let raw = b"{\"system\": \"primordia\"}";
        let mut packet = vec![0x01];
        packet.extend_from_slice(raw);
        assert_eq!(dispatcher.dispatch(&packet).unwrap(), raw);
    }
}
