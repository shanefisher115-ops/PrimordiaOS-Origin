//! Library half of primordia-spellwright, shared by the stdio server, the
//! multi-client servers (spellwright-daemon, primordia-engine) and the benchmarks.

pub mod batcher;
pub mod decoder;
pub mod pack;
pub mod grimoire;
pub mod host_spells;
pub mod ipc;
pub mod reliquary;
pub mod ritual;
pub mod storage;
pub mod chunk_cache;
pub mod dispatcher;  
pub mod ring_buffer; 
pub mod daemon; 
pub mod api; 
