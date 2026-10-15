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
            let mut out_buf = Vec::new();

            loop {
                poll_interval.tick().await;

                // Drain everything queued since the last tick, one record per lock.
                loop {
                    let len = {
                        let mut r = ring.lock().await;
                        let Some(len) = r.peek_len() else { break };
                        out_buf.resize(len, 0);
                        match r.pop(&mut out_buf) {
                            Ok(len) => len,
                            Err(e) => {
                                eprintln!("[Daemon Error] Ring pop failed: {}", e);
                                break;
                            }
                        }
                    }; // lock released before dispatch

                    match dispatcher.dispatch(&out_buf[..len]) {
                        Ok(decompressed) => {
                            println!("[Daemon] Successfully processed {} bytes -> {} bytes decompressed", len, decompressed.len());
                        }
                        Err(e) => {
                            eprintln!("[Daemon Error] Dispatch failed: {}", e);
                        }
                    }
                }
            }
        });
    }
}
