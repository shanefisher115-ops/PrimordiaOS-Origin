# Realm-asset engineer

An autonomous PrimordiaOS agent that keeps generating, judging and cataloguing scene assets for realm
genres. Geometry comes from the Primordia-cad kernel, the catalog lives in Supabase, previews and the review
gallery are WebGL (three.js), and approved pieces go into Unreal in overnight batches.

```
brief (gallery / CLI / standing rotation)
  -> RealmAssetEngineer agent picks generators + params inside the genre's style (seeded, deterministic;
     optional Ollama steer from the brief's notes)
  -> forge: kernel build, mechanical checks, CPU silhouettes, headless WebGL turntable, optional vision score
  -> agent judges: keep (row + WebP thumbnails) or discard
  -> Shane approves / rejects in the gallery (phone OK) -> the agent learns taste, the .glb is rebuilt from the
     recipe (sha must match) and uploaded
  -> 02:30: approved pieces -> Blender finish -> headless Unreal import into /Game/ThirdParty/<Genre>Kit/
```

## Run it

```bash
npm install                       # once (three 0.186.1, puppeteer-core 25.12.0, pg 8.23.0 pinned)
npm start                         # 24/7 loop + LAN gallery; prints http://<laptop-ip>:8790/?t=<token>
npm run once -- --genre scifi --count 6 --notes "tall slender towers"
node workshop/main.mjs --brief gothic --count 8 --notes "ornate spires"   # queue for the running engineer
node workshop/main.mjs --status
npm test                          # agent, workshop + host loop, migration RLS (PGlite)
```

Primordia-cad needs `npm install` too (its `node_modules/manifold-3d`). Chrome or Edge must be installed: the
previewer drives the system browser headless, nothing is downloaded.

## Pieces

| Path | What |
|---|---|
| `RealmAssetEngineer/` | The agent (Agent Container Standard v1, runtime v1.2; the validator passes). `agent.js` is pure: plan, judge, learn. Its actions target `capability:forge` and `capability:catalog`. |
| `workshop/host.mjs` | Dev-realm dispatcher + tool host: installs the agent in the data folder, delivers events in equal-depth batches, runs the rate-limited job queue, executes catalog actions, polls briefs and reviews, backfills missing thumbnails. |
| `workshop/forge.mjs` | Kernel build, checks (closed, finite, volume, triangle budget, size, base at z = 0), mesh sha256, provenance (last Primordia-cad commit, local edits, manifold-3d version). |
| `workshop/silhouette.mjs` | Three 32x32 orthographic masks per piece; variety = 1 - IoU to the nearest catalogued piece. |
| `workshop/preview.mjs`, `preview/` | Headless WebGL: `stage.js` (shared with the gallery) applies the genre's slot looks (Stone / Glass / Iron) and lighting preset; hero WebP, 8-frame turntable strip, JPEG for the vision model. 0.1-0.4 s a piece on the Radeon. |
| `workshop/ollama.mjs` | Optional: brief notes -> generator weights + height/width/ornament bias (keyword reader first, `llama3.2:3b` second); vision score (`vision.model`, off by default; gemma4 needs ~10 GB free RAM). Cloud models refused. |
| `workshop/catalog.mjs` | `SupabaseCatalog` (PostgREST + Storage, service key server-side only) and `LocalCatalog` (same interface on disk). |
| `workshop/server.mjs`, `gallery/` | Review gallery: grid, 3D viewer (pending pieces are rebuilt from their recipe on the fly), turntable scrubber, approve / reject / note, briefs. |
| `unreal/` | `batch_import.mjs` (guards, signed-URL download, sha check, Blender finish, one commandlet), `import_batch.py` (runs the look-dev skill's `import_asset.py` per item), `register_tasks.ps1`. |
| `scripts/migrate.mjs` | Applies `PrimordiaOS/supabase/migrations/*realm_asset*.sql`; `--reviewer <email>`; `--check`. |

Genre packs live in `Primordia-cad/genres/` (style ranges, budgets, slot looks, lighting preset): `gothic`
(9 generators) and `scifi` (arcology, pylon, dome, mast in `kernel/scifi.ts`).

## Supabase (free tier)

Secrets go in `~/.primordia/realm-asset-engineer.env`, never in the repo:

- `SUPABASE_URL`: already filled in.
- `SUPABASE_SERVICE_ROLE_KEY`: Project Settings -> API Keys, the `service_role` key or a `sb_secret_` key.
- `SUPABASE_DB_URL`: optional, only for `npm run migrate`. Alternatively paste the .sql into the SQL editor.
- `SUPABASE_ANON_KEY`: optional, for the gallery's direct Supabase mode.

Until the service key is there the engineer uses the local catalog in `%LOCALAPPDATA%\PrimordiaOS\realm-asset-engineer`.

- Recipes, not meshes: a row is genre + generator + params + kernel commit + manifold version, and rebuilds
  its mesh exactly (`mesh_sha256`). Thumbnails (~5-25 KB) for kept rows; a .glb only for approved rows.
- Free plan (checked 2026-10-19 on supabase.com/pricing): 1 GB file storage, 500 MB database, 5 GB egress
  + 5 GB cached egress a month, 50 MB per upload, paused after a week idle (the 24/7 loop keeps it awake).
  Defaults stop uploads at 800 MB of files or 400 MB of database, and the keep bar rises from 60 % full.
- RLS on every table; anon gets nothing. Reviewers (emails in `realm_asset_reviewers`) may read, set
  `verdict` / `review_note`, read the private bucket (signed URLs) and queue briefs. Tested on Postgres (PGlite)
  in `test/migration.test.mjs`.

## Gallery on the phone

On the same Wi-Fi: open the `http://<laptop-ip>:8790/?t=<token>` link the engineer prints (the token is in the
env file as `RAE_GALLERY_TOKEN`). The first time, Windows may ask to allow Node through the firewall. It is plain
HTTP on the LAN, gated by the token.

## Overnight Unreal batch

`unreal/batch_import.mjs` runs only when Unreal Editor and its commandlet are closed, inside 01:00-06:00, after
20 idle minutes, with 5 GB free. It uses `UnrealEditor-Cmd -run=pythonscript`, so no editor window opens. It
marks rows `imported_to_unreal` with their `/Game/ThirdParty/<Genre>Kit/<name>` path. `--now` skips the time
and idle checks, and `--dry-run` lists what would be imported.

Register the scheduled tasks from the checkout the tasks should run (user level, no admin):

```bash
pwsh unreal/register_tasks.ps1
```
