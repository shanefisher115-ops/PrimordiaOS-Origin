use std::sync::Arc;
use tokio::sync::Mutex;
use std::time::Duration;
use crate::ring_buffer::ZeroCopyRingBuffer;
use crate::dispatcher::ComputeDispatcher;

pub struct EngineDaemon {
    ring: Arc<Mutex<ZeroCopyRingBuffer>>,
    dispatcher: Arc<ComputeDispatcher>,
}

impl EngineDaemon {
    pub fn new(ring: Arc<Mutex<ZeroCopyRingBuffer>>, dispatcher: ComputeDispatcher) -> Self {
        Self {
            ring,
            dispatcher: Arc::new(dispatcher),
        }
    }

    /// Spawns the background ingestion and processing loop
    pub async fn run_background_worker(self) {
        println!("[Primordia Engine] Daemon background worker active. Listening for zero-copy streams...");

        let ring = Arc::clone(&self.ring);
        let dispatcher = Arc::clone(&self.dispatcher);

        tokio::spawn(async move {
            let mut poll_interval = tokio::time::interval(Duration::from_millis(10));
            let mut out_buf = vec![0u8; 65536];

            loop {
                poll_interval.tick().await;

                let mut r = ring.lock().await;
                match r.pop(&mut out_buf) {
                    Ok(len) => {
                        let packet = &out_buf[..len];
                        drop(r); // Release lock during heavy compute dispatch

                        match dispatcher.dispatch(packet) {
                            Ok(decompressed) => {
                                println!("[Daemon] Successfully processed {} bytes -> {} bytes decompressed", len, decompressed.len());
                            }
                            Err(e) => {
                                eprintln!("[Daemon Error] Dispatch failed: {}", e);
                            }
                        }
                    }
                    Err(_) => {
                        // Buffer empty, continue polling with minimal CPU footprint
                    }
                }
            }
        });
    }
}
