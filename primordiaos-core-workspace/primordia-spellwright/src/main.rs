use std::path::Path;
use std::sync::Arc;
use tokio::sync::Mutex;
use primordia_spellwright::ring_buffer::ZeroCopyRingBuffer;
use primordia_spellwright::dispatcher::ComputeDispatcher;
use primordia_spellwright::daemon::EngineDaemon;
use primordia_spellwright::api::create_router;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("--- [Primordia Engine] Initializing HTTP Ingestion & Compute Core ---");

    let mmap_path = Path::new("primordia_stream.mmap");
    let capacity = 1024 * 1024; // 1 MB ring buffer

    // Initialize memory-mapped ring buffer ONCE
    let ring = ZeroCopyRingBuffer::new(mmap_path, capacity)?;
    let shared_ring = Arc::new(Mutex::new(ring));

    // Initialize dispatcher with a 1024-byte CPU/GPU threshold
    let dispatcher = ComputeDispatcher::new(1024);

    // 1. Spin up the background worker daemon using the shared ring Arc
    let daemon = EngineDaemon::new(Arc::clone(&shared_ring), dispatcher);
    daemon.run_background_worker().await;

    // 2. Spin up the Axum HTTP Webhook Ingestion server on port 8080
    let app = create_router(shared_ring);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8080").await?;
    
    println!("[Primordia API] Webhook ingestion active on http://127.0.0.1:8080/ingest");
    axum::serve(listener, app).await?;

    Ok(())
}
