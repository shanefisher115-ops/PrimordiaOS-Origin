import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { CONFIG } from "./config.ts";
export let db;
export async function initDB() {
    db = new DB(CONFIG.DB_PATH);
    db.execute(`
    CREATE TABLE IF NOT EXISTS ucl_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal TEXT,
      params TEXT,
      status TEXT,
      requested_at TEXT,
      executed_at TEXT,
      completed_at TEXT
    );
  `);
    db.execute(`
    CREATE TABLE IF NOT EXISTS pipeline_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER,
      name TEXT,
      input_payload TEXT,
      output_payload TEXT,
      status TEXT,
      started_at TEXT,
      finished_at TEXT
    );
  `);
    db.execute(`
    CREATE TABLE IF NOT EXISTS cycle_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tick INTEGER,
      run_id INTEGER,
      metrics_json TEXT,
      pulse_score REAL,
      patch_applied INTEGER,
      patch_details TEXT,
      new_defaults_json TEXT,
      timestamp TEXT
    );
  `);
    db.execute(`
    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT,
      post_id TEXT,
      retention REAL,
      completion REAL,
      ctr REAL,
      rpm REAL,
      engagement REAL,
      timestamp TEXT
    );
  `);
    db.execute(`
    CREATE TABLE IF NOT EXISTS system_defaults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      value_json TEXT,
      last_patched TEXT,
      patch_history TEXT
    );
  `);
    console.log("DB initialized.");
}
