use std::sync::Arc;
use tokio::sync::Mutex;
use axum::{
    routing::post,
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Router,
};
use crate::ring_buffer::ZeroCopyRingBuffer;

#[derive(Clone)]
pub struct AppState {
    pub ring: Arc<Mutex<ZeroCopyRingBuffer>>,
}

/// Builds the Axum router for webhook ingestion
pub fn create_router(ring: Arc<Mutex<ZeroCopyRingBuffer>>) -> Router {
    let state = AppState { ring };
    Router::new()
        .route("/ingest", post(ingest_handler))
        .with_state(state)
}

/// Ingestion endpoint: receives raw payload bytes and pushes them atomically to mmap ring
async fn ingest_handler(
    State(state): State<AppState>,
    body: bytes::Bytes,
) -> impl IntoResponse {
    if body.is_empty() {
        return StatusCode::BAD_REQUEST;
    }

    let mut ring = state.ring.lock().await;
    
    // Prepend tag 0x01 (VariableJson) unless the body already carries a type tag
    let tagged = matches!(body[0], 0x01 | 0x02);
    let mut packet = Vec::with_capacity(body.len() + 1);
    if !tagged {
        packet.push(0x01);
    }
    packet.extend_from_slice(&body);

    if packet.len() + 4 > ring.capacity() {
        return StatusCode::PAYLOAD_TOO_LARGE;
    }
    match ring.push(&packet) {
        Ok(_) => StatusCode::ACCEPTED,
        Err(_) => StatusCode::INSUFFICIENT_STORAGE, // Ring full until the daemon drains it
    }
}
