import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.FLOW_DB_PATH || path.resolve(__dirname, 'flow_memory.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

// Configure SQLite for high performance, ACID durability, and concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA busy_timeout = 10000;');
db.exec('PRAGMA wal_autocheckpoint = 1000;');

export function checkpointWal(): boolean {
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    return true;
  } catch (e) {
    console.error('[Flow DB WAL Checkpoint Error]:', e);
    return false;
  }
}

export function verifyDiskIntegrity(): { ok: boolean; sizeBytes: number; message: string; dbPath: string } {
  try {
    const check = db.prepare('PRAGMA integrity_check;').get() as { integrity_check?: string } | undefined;
    const stats = fs.statSync(dbPath);
    const ok = check?.integrity_check === 'ok';
    return {
      ok,
      sizeBytes: stats.size,
      message: ok ? 'Physical SQLite disk file verified healthy (ACID WAL mode).' : `Integrity notice: ${JSON.stringify(check)}`,
      dbPath
    };
  } catch (err: any) {
    return {
      ok: false,
      sizeBytes: 0,
      message: `Integrity check failed: ${err.message}`,
      dbPath
    };
  }
}

// Background checkpointing
const walInterval = setInterval(() => {
  checkpointWal();
}, 60000);
if (walInterval.unref) {
  walInterval.unref();
}
