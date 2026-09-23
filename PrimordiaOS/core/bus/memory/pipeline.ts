import { Database } from 'sqlite3';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class IngestionPipeline {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  public async ingestSource(realmId: string, sourceType: string, content: string, uriPath?: string): Promise<{ sourceId: string; chunkIds: string[] }> {
    const sourceId = uuidv4();
    const hash = createHash('sha256').update(content).digest('hex');

    // 1. Insert Raw Source
    await new Promise<void>((resolve, reject) => {
      const sql = `INSERT INTO memory_sources (source_id, realm_id, source_type, uri_path, hash_sha256) VALUES (?, ?, ?, ?, ?)`;
      this.db.run(sql, [sourceId, realmId, sourceType, uriPath || null, hash], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 2. Chunk Content & Store
    const chunks = this.chunkText(content, 500); // 500-char windowing
    const chunkIds: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = uuidv4();
      chunkIds.push(chunkId);
      await new Promise<void>((resolve, reject) => {
        const sql = `INSERT INTO memory_chunks (chunk_id, source_id, chunk_index, content) VALUES (?, ?, ?, ?)`;
        this.db.run(sql, [chunkId, sourceId, i, chunks[i]], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    return { sourceId, chunkIds };
  }

  private chunkText(text: string, chunkSize: number): string[] {
    const regex = new RegExp(`.{1,${chunkSize}}`, 'g');
    return text.match(regex) || [text];
  }
}