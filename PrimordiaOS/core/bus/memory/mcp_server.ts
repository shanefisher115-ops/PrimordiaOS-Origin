// Replace this line:
// import { Database } from 'sqlite3';

// With this:
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface MemoryQueryInput {
  query: string;
  min_trust_level?: number;
  max_sensitivity?: 'public' | 'internal' | 'restricted';
  limit?: number;
}

export interface MemoryProposeInput {
  agent_id: string;
  type: 'FACT' | 'DECISION' | 'FAILURE' | 'DEPRECATION';
  content: string;
  subject_chunk_id?: string;
}

export interface MemoryLogFailureInput {
  task_id: string;
  realm_id: string;
  error_signature: string;
  attempted_approach: string;
  root_cause?: string;
  suggested_bypass?: string;
}

export class MemoryMCPServer {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
  }

  // Tool 1: Query Cited Memory (FTS5 + Citation Join)
  public async memory_query(params: MemoryQueryInput) {
    const limit = params.limit || 5;
    const minTrust = params.min_trust_level || 0.0;
    
    const query = `
      SELECT 
        c.chunk_id,
        c.content,
        c.trust_level,
        c.sensitivity,
        s.source_id,
        s.realm_id,
        s.uri_path,
        s.created_at
      FROM memory_fts f
      JOIN memory_chunks c ON f.chunk_id = c.chunk_id
      JOIN memory_sources s ON c.source_id = s.source_id
      WHERE memory_fts MATCH ?
        AND c.trust_level >= ?
      LIMIT ?;
    `;

    return new Promise((resolve, reject) => {
      this.db.all(query, [params.query, minTrust, limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Tool 2: Propose Fact/Decision (Review Gate)
  public async memory_propose(params: MemoryProposeInput) {
    const proposalId = uuidv4();
    const query = `
      INSERT INTO memory_proposals (proposal_id, agent_id, proposal_type, subject_chunk_id, proposed_data, status)
      VALUES (?, ?, ?, ?, ?, 'PENDING');
    `;

    return new Promise((resolve, reject) => {
      this.db.run(
        query,
        [proposalId, params.agent_id, params.type, params.subject_chunk_id || null, params.content],
        function (err) {
          if (err) reject(err);
          else resolve({ proposal_id: proposalId, status: 'PENDING' });
        }
      );
    });
  }

  // Tool 3: Log Execution Failure
  public async memory_log_failure(params: MemoryLogFailureInput) {
    const failureId = uuidv4();
    const query = `
      INSERT INTO failure_memory (failure_id, task_id, realm_id, error_signature, attempted_approach, root_cause, suggested_bypass)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `;

    return new Promise((resolve, reject) => {
      this.db.run(
        query,
        [
          failureId,
          params.task_id,
          params.realm_id,
          params.error_signature,
          params.attempted_approach,
          params.root_cause || null,
          params.suggested_bypass || null
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ failure_id: failureId, logged: true });
        }
      );
    });
  }

  // Tool 4: Check Warnings Before Task Execution
  public async memory_check_warnings(errorSignature: string, realmId: string) {
    const query = `
      SELECT failure_id, task_id, realm_id, attempted_approach, root_cause, suggested_bypass, created_at
      FROM failure_memory
      WHERE error_signature = ? AND (realm_id = ? OR realm_id = 'all')
      ORDER BY created_at DESC
      LIMIT 3;
    `;

    return new Promise((resolve, reject) => {
      this.db.all(query, [errorSignature, realmId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}