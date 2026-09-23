/* ============================================================
   PRIMORDIAOS COCKPIT DB MODULE — FULL FILE
   ============================================================

   Purpose:
   This module provides the Cockpit with a unified, resilient,
   SSL‑secured PlanetScale Postgres client.

   Features:
   • Automatic .env injection
   • SSL negotiation (PlanetScale required)
   • Connection pooling
   • Query harmonics + error resonance
   • Emerald/Violet technophysical logging aesthetic
   • Ready for:
       - VisionCore
       - Unreal Simulation Bridge
       - Cloudflare Hyperdrive
       - Osmium Ledger
       - MoneyPlugHub Autonomous Loop Manager

   Cockpit DB Module = the data artery of PrimordiaOS.
*/

import pg from "pg";
import dotenv from "dotenv";

// ============================================================
//   ENV INJECTION
// ============================================================
dotenv.config();

const {
  DB_HOST,
  DB_PORT,
  DB_DATABASE,
  DB_USERNAME,
  DB_PASSWORD
} = process.env;

// ============================================================
//   VALIDATION
// ============================================================
function validateEnv() {
  const missing = [];

  if (!DB_HOST) missing.push("DB_HOST");
  if (!DB_PORT) missing.push("DB_PORT");
  if (!DB_DATABASE) missing.push("DB_DATABASE");
  if (!DB_USERNAME) missing.push("DB_USERNAME");
  if (!DB_PASSWORD) missing.push("DB_PASSWORD");

  if (missing.length > 0) {
    console.error("◆ PRIMORDIAOS DB ERROR — Missing env vars:", missing);
    throw new Error("Missing required DB environment variables");
  }
}

validateEnv();

// ============================================================
//   POOL CONFIGURATION
// ============================================================
const pool = new pg.Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_DATABASE,
  user: DB_USERNAME,
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false }, // PlanetScale requirement
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000
});

// ============================================================
//   EMERALD/VIOLET LOGGING AESTHETIC
// ============================================================
function logEmerald(message, data = null) {
  console.log(`\x1b[38;2;0;255;180m◆ PRIMORDIAOS DB — ${message}\x1b[0m`);
  if (data) console.log(data);
}

function logViolet(message, data = null) {
  console.log(`\x1b[38;2;180;0;255m◇ PRIMORDIAOS DB — ${message}\x1b[0m`);
  if (data) console.log(data);
}

// ============================================================
//   CORE QUERY FUNCTION
// ============================================================
export async function dbQuery(sql, params = []) {
  const start = Date.now();

  try {
    const result = await pool.query(sql, params);

    logEmerald("Query OK", {
      sql,
      duration_ms: Date.now() - start,
      rows: result.rowCount
    });

    return result;
  } catch (err) {
    logViolet("Query ERROR", {
      sql,
      params,
      error: err.message
    });
    throw err;
  }
}

// ============================================================
//   HEALTH CHECK
// ============================================================
export async function dbHealth() {
  try {
    const res = await dbQuery("SELECT NOW()");
    return {
      status: "ok",
      timestamp: res.rows[0].now
    };
  } catch (err) {
    return {
      status: "error",
      error: err.message
    };
  }
}

// ============================================================
//   MODULE EXPORTS
// ============================================================
export default {
  query: dbQuery,
  health: dbHealth,
  pool
};
