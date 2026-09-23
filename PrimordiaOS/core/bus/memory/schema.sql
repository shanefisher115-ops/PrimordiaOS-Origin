-- Enable Write-Ahead Logging & Foreign Keys
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

--------------------------------------------------------------------------------
-- 1. RAW INGESTED SOURCES
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memory_sources (
    source_id TEXT PRIMARY KEY,               -- UUIDv4 or Hash
    realm_id TEXT NOT NULL,                  -- 'windows', 'cloud_shell', 'termux'
    source_type TEXT NOT NULL,                -- 'execution_log', 'transcript', 'diff', 'pdf'
    uri_path TEXT,                           -- File path or remote URI
    hash_sha256 TEXT UNIQUE NOT NULL,         -- Deduplication hash
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------------------------------------
-- 2. CHUNKED CONTENT & CITATIONS
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memory_chunks (
    chunk_id TEXT PRIMARY KEY,                -- UUIDv4
    source_id TEXT NOT NULL,                  -- FK to memory_sources
    chunk_index INTEGER NOT NULL,            -- Sequence order inside source
    content TEXT NOT NULL,                    -- Chunk text body
    trust_level REAL DEFAULT 0.5 CHECK(trust_level BETWEEN 0.0 AND 1.0),
    sensitivity TEXT DEFAULT 'internal' CHECK(sensitivity IN ('public', 'internal', 'restricted')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(source_id) REFERENCES memory_sources(source_id) ON DELETE CASCADE
);

--------------------------------------------------------------------------------
-- 3. FIRST-CLASS FAILURE MEMORY
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS failure_memory (
    failure_id TEXT PRIMARY KEY,               -- UUIDv4
    task_id TEXT NOT NULL,                     -- PrimordiaOS Task ID
    realm_id TEXT NOT NULL,                    -- Execution realm where failure occurred
    error_signature TEXT NOT NULL,             -- e.g., 'MISSING_DEP_GCC', 'RATE_LIMIT_429'
    attempted_approach TEXT NOT NULL,          -- Command, script, or path attempted
    root_cause TEXT,                           -- Agent analysis or stack trace
    suggested_bypass TEXT,                     -- Workaround or alternate execution route
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------------------------------------
-- 4. PROPOSAL & GOVERNANCE QUEUE
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memory_proposals (
    proposal_id TEXT PRIMARY KEY,             -- UUIDv4
    agent_id TEXT NOT NULL,                    -- Proposing agent ID
    proposal_type TEXT NOT NULL CHECK(proposal_type IN ('FACT', 'DECISION', 'FAILURE', 'DEPRECATION')),
    subject_chunk_id TEXT,                     -- Optional FK to memory_chunks
    proposed_data TEXT NOT NULL,               -- JSON payload of fact/decision
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by TEXT,                          -- 'system_policy' or Governor User ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(subject_chunk_id) REFERENCES memory_chunks(chunk_id) ON DELETE SET NULL
);

--------------------------------------------------------------------------------
-- INDICES & FULL-TEXT SEARCH (FTS5)
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chunks_source ON memory_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_failures_sig ON failure_memory(error_signature, realm_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON memory_proposals(status);

-- FTS5 Virtual Table for Keyword Match Performance
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    chunk_id UNINDEXED,
    content,
    tokenize = 'porter ascii'
);

-- Triggers to auto-sync FTS index with memory_chunks
CREATE TRIGGER IF NOT EXISTS trg_chunks_fts_insert AFTER INSERT ON memory_chunks BEGIN
    INSERT INTO memory_fts(chunk_id, content) VALUES (new.chunk_id, new.content);
END;

CREATE TRIGGER IF NOT EXISTS trg_chunks_fts_delete AFTER DELETE ON memory_chunks BEGIN
    DELETE FROM memory_fts WHERE chunk_id = old.chunk_id;
END;