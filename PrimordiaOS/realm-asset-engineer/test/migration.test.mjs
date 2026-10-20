// The catalog migration on a real Postgres (PGlite, in process) with Supabase's pieces stubbed: the anon /
// authenticated / service_role roles, auth.jwt() from the request claims, and the storage tables.
// Checks it applies twice, and that RLS gives anon nothing, other users nothing, and reviewers read + review only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'supabase', 'migrations');
const SQL = readdirSync(MIGRATIONS).filter((f) => /realm_asset.*\.sql$/.test(f)).sort().map((f) => readFileSync(path.join(MIGRATIONS, f), 'utf8'));

const SUPABASE_STUBS = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.jwt() to anon, authenticated, service_role;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select on storage.objects to anon, authenticated;
  grant all on storage.objects, storage.buckets to service_role;
`;

const row = (name) => ({
  name, genre: 'gothic', generator: 'spire', params: JSON.stringify({ height: 40 }), pack_version: '1.0.0',
  kernel_commit: 'abc', manifold_version: '3.5.4', mesh_sha256: `sha-${name}`, metrics: '{}', scores: '{}',
});

async function as(db, role, email, fn) {
  await db.exec(`set role ${role}`);
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [email ? JSON.stringify({ email, role }) : '']);
  try { return await fn(); } finally { await db.exec('reset role'); }
}

test('migration applies twice and RLS limits access to listed reviewers', async () => {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const sql of SQL) await db.exec(sql);
  for (const sql of SQL) await db.exec(sql); // idempotent

  const bucket = (await db.query(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'realm-assets'`)).rows[0];
  assert.equal(bucket.public, false);
  assert.equal(Number(bucket.file_size_limit), 52428800);

  // The engineer (service role) writes rows and files.
  const id = await as(db, 'service_role', null, async () => {
    const r = row('SM_GothicSpire_aaaaaa');
    const res = await db.query(`insert into public.realm_assets (name, genre, generator, params, pack_version, kernel_commit, manifold_version, mesh_sha256, metrics, scores)
      values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9::jsonb, $10::jsonb) returning id`, Object.values(r));
    await db.query(`insert into storage.objects (bucket_id, name) values ('realm-assets', 'gothic/spire/x.webp')`);
    return res.rows[0].id;
  });

  // anon: no table access at all.
  await assert.rejects(as(db, 'anon', null, () => db.query('select * from public.realm_assets')), /permission denied/);

  // Signed in but not a reviewer: sees nothing.
  const none = await as(db, 'authenticated', 'stranger@example.com', () => db.query('select * from public.realm_assets'));
  assert.equal(none.rows.length, 0);
  const noFiles = await as(db, 'authenticated', 'stranger@example.com', () => db.query(`select * from storage.objects`));
  assert.equal(noFiles.rows.length, 0);

  await db.query(`insert into public.realm_asset_reviewers (email) values ('reviewer@example.com')`);

  // Reviewer: reads, reviews (trigger stamps who and when), cannot touch the recipe, queues briefs.
  const seen = await as(db, 'authenticated', 'Reviewer@Example.com', () => db.query('select id from public.realm_assets'));
  assert.equal(seen.rows.length, 1);
  await as(db, 'authenticated', 'reviewer@example.com', () => db.query(`update public.realm_assets set verdict = 'approved', review_note = 'nice' where id = $1`, [id]));
  const reviewed = (await db.query('select verdict, reviewed_by, reviewed_at from public.realm_assets where id = $1', [id])).rows[0];
  assert.equal(reviewed.verdict, 'approved');
  assert.equal(reviewed.reviewed_by, 'reviewer@example.com');
  assert.ok(reviewed.reviewed_at);
  await assert.rejects(as(db, 'authenticated', 'reviewer@example.com', () => db.query(`update public.realm_assets set params = '{}'::jsonb where id = $1`, [id])), /permission denied/);
  await assert.rejects(as(db, 'authenticated', 'reviewer@example.com', () => db.query(`delete from public.realm_assets where id = $1`, [id])), /permission denied/);
  await as(db, 'authenticated', 'reviewer@example.com', () => db.query(`insert into public.realm_asset_briefs (genre, count, notes) values ('scifi', 4, 'tall')`));
  await assert.rejects(as(db, 'authenticated', 'reviewer@example.com', () => db.query(`insert into public.realm_asset_briefs (genre, status) values ('scifi', 'done')`)), /row-level security/);
  const files = await as(db, 'authenticated', 'reviewer@example.com', () => db.query(`select * from storage.objects`));
  assert.equal(files.rows.length, 1);
  await assert.rejects(as(db, 'authenticated', 'reviewer@example.com', () => db.query('select * from public.realm_asset_reviewers')), /permission denied/);

  const usage = (await db.query('select * from public.realm_asset_usage')).rows[0];
  assert.equal(Number(usage.approved), 1);
  await db.close();
});
