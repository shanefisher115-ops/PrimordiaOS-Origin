#!/usr/bin/env node
// Applies the realm-asset catalog migration to the Supabase Postgres database.
//
//   npm run migrate                          apply supabase/migrations/*realm_asset*.sql (safe to repeat)
//   npm run migrate -- --reviewer you@x.com  also allow that email to review in the gallery's Supabase mode
//   npm run migrate -- --check               only check, through the REST API, that the catalog answers
//
// Needs SUPABASE_DB_URL (Project Settings -> Database -> connection string, session pooler) in the env file
// ~/.primordia/realm-asset-engineer.env. Or paste the .sql file into the Supabase SQL editor instead.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from '../workshop/config.mjs';
import { PATHS } from '../workshop/paths.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const env = loadEnv();

if (flag('check')) {
  const { SupabaseCatalog } = await import('../workshop/catalog.mjs');
  const c = new SupabaseCatalog({ url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY });
  await c.init();
  console.log('catalog ok:', await c.usage());
  process.exit(0);
}

if (!env.SUPABASE_DB_URL) {
  console.error(`SUPABASE_DB_URL is not set in ${PATHS.envFile}.\nEither add it, or paste the migration into the Supabase SQL editor:\n  ${PATHS.migrations}`);
  process.exit(1);
}

const files = (await readdir(PATHS.migrations)).filter((f) => /realm_asset.*\.sql$/.test(f)).sort();
const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  for (const f of files) {
    const sql = await readFile(path.join(PATHS.migrations, f), 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('commit');
      console.log(`applied ${f}`);
    } catch (e) {
      await client.query('rollback');
      throw new Error(`${f}: ${e.message}`);
    }
  }
  const reviewer = value('reviewer');
  if (reviewer) {
    await client.query('insert into public.realm_asset_reviewers (email) values (lower($1)) on conflict do nothing', [reviewer]);
    console.log(`reviewer ${reviewer.toLowerCase()} can sign in to the gallery's Supabase mode`);
  }
  const { rows } = await client.query("select id, public, file_size_limit from storage.buckets where id = 'realm-assets'");
  console.log('bucket:', rows[0] ?? 'missing');
} finally {
  await client.end();
}
