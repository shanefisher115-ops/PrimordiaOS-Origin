# PrimordiaOS pipeline: Bolt and the Autobuilder

Two small Node servers (no npm dependencies, Node 20+) and the workers they drive. The Unreal side
is the `PrimordiaCognition` plugin in `../unreal/PrimordiaCognition`.

| Server | Port | What it does |
|---|---|---|
| Bolt REST | 7778 | Accepts jobs from Unreal, runs them through workers |
| Bolt events | 7780 | WebSocket at `/events`: every job change, spell, build |
| Autobuilder | 7790 | Builds and deploys the Unreal modules |
| Blender RPC | 7791 | Runs inside Blender; Bolt starts it on demand |

Bolt uses 7778 because the realm-bridge node server (`node-bridge/src/server.js`) owns 7777;
both run side by side. The Unreal side reads Project Settings > Plugins > PrimordiaOS Bolt
Pipeline > Rest Url (`http://127.0.0.1:7778`).

## Run

```bash
node bolt/server.mjs
```

```bash
node autobuilder/server.mjs
```

On this machine Node is at `C:\node\node-v24.22.1-win-x64\node.exe` (not on PATH).

## Bolt

```
POST /jobs              {id?, kind, payload, spellId?, source?}  -> 201 {job}   (same id again -> 200, same job)
GET  /jobs?status=&kind=&limit=                                   -> {jobs}
GET  /jobs/:id[?payload=1]                                        -> {job}  (with its log)
POST /jobs/:id/cancel                                             -> {job}
GET  /health  GET /workers
POST /events            {type: "build.started", ...}              re-broadcast to event clients
```

Job states: `queued -> running -> succeeded | failed | cancelled`. A finished job never changes.

| Kind | Worker | Result |
|---|---|---|
| `spell.cast` | records the spell in `data/spells.jsonl`, broadcasts `spell.cast` | `{recorded, steps}` |
| `cadcam.fabricate` | checks the G-code (G21, G90, M3, M30, no unverified arcs), writes it to the spool folder for the machine's sender | `{spoolPath, bytes, lines}` |
| `blender.*` | JSON-RPC to Blender, starting `blender -b` with `workers/blender_rpc_server.py` if needed | the method's result (`output`, `output_dir`, `path`...) |
| `davinci.*` | runs `workers/resolve_worker.py` against the running DaVinci Resolve | `{project, timeline, output...}` |
| `autobuilder.build`, `autobuilder.deploy` | hands the request to the Autobuilder and follows it | `{buildId, summary, seconds}` |

Only kinds in the allow-list are accepted (403 otherwise). The default list is the same file Jules
reads inside Unreal: `../unreal/PrimordiaCognition/Resources/Jules/bolt.allowlist.json`.

Environment: `BOLT_HOST` (127.0.0.1), `BOLT_PORT` (7778), `BOLT_EVENTS_PORT` (7780), `BOLT_KEY`
(require `X-Bolt-Key` on REST and WebSocket), `BOLT_DATA` (`./data`), `BOLT_SPOOL`
(`./data/spool`), `BOLT_ALLOWLIST` (path, or `none`), `BLENDER_EXE` (default: newest
`C:\Program Files\Blender Foundation\Blender *\blender.exe`; `none` never launches Blender),
`BLENDER_RPC_PORT` (7791), `RESOLVE_PYTHON` (`python`), `AUTOBUILDER_URL`, `AUTOBUILDER_KEY`.

## Autobuilder

```
POST /build   {reason, mode: "project" | "plugin", project?, plugin?, target?, configuration?}  -> 202 {build}
POST /deploy  {reason, project?}                                                              -> 202 {build}
GET  /status                                                                                  current, queue, recent
GET  /builds/:id                                                                              build + log tail
```

A reason is required. Builds run one at a time through the scripts below; each script's last
line is `PRIMORDIA_RESULT {json}`, which becomes the build's summary. Events `build.queued`,
`build.started` and `build.finished` go to Bolt.

- **project** builds the project's editor target, which compiles the plugin. The editor must be
  closed for that project (Windows locks loaded DLLs); the script refuses when it is open. For a
  project with no C++ of its own (PrimordiaRealms), if UBT refuses the content-only route (the
  broken VisualStudioTools engine plugin does this here), the installed plugin is compiled in a
  small host project and its binaries are copied into `<Project>/Plugins/PrimordiaCognition/Binaries`.
- **plugin** compiles the plugin standalone with `RunUAT BuildPlugin` into a temp folder. It works
  with the editor open and proves the code builds for editor and game targets. This is what the
  editor's Rebuild button asks for; load the result with Live Coding or an editor restart.

Environment: `AUTOBUILDER_PORT` (7790), `AUTOBUILDER_KEY`, `UE_ENGINE_ROOT`, `UE_PROJECT`,
`PRIMORDIA_PLUGIN_SOURCE`, `BOLT_URL`, `BOLT_KEY`, `AUTOBUILDER_POWERSHELL` (`pwsh`, else
`powershell`).

## Scripts

| Script | Does |
|---|---|
| `Build-PrimordiaModules.ps1 -Mode Project\|Plugin` | builds (see above) |
| `Install-PrimordiaModules.ps1` | mirrors the plugin into `<Project>/Plugins/PrimordiaCognition` (keeps its Binaries) and enables it in the `.uproject` (backup written first) |
| `Update-PrimordiaProject.ps1` | install, regenerate project files if the project has C++, build |
| `Watch-PrimordiaSource.ps1` | watches the plugin source and asks the Autobuilder to deploy + build on every change (`-Direct` runs the scripts itself) |

## Blender

`workers/blender_rpc_server.py` runs inside Blender (tested with Blender 5.2). Headless:

```bash
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python workers/blender_rpc_server.py -- --port 7791 --empty
```

or open it in Blender's Scripting workspace and Run Script to drive the open session. Methods:
`ping`, `scene.info`, `scene.reset`, `mesh.create`, `import`, `export`, `animate`, `render`,
`task.status`; long ones take `"async": true` and are polled. A render of a scene without a camera
or lights gets a camera framed on the meshes and a sun.

## DaVinci Resolve

`workers/resolve_worker.py --job job.json` drives the running Resolve: open or create the
project, import media (image sequences as one clip), build the timeline, apply LUT and CDL to
every clip, render. Resolve must be running, and external scripts need Preferences > System >
General > External scripting using: Local. That preference is a DaVinci Resolve **Studio**
feature; with the free edition, run `resolve_worker.py --watch <folder>` from Resolve's
Workspace > Scripts menu and drop `*.job.json` files into the folder.

## Tests

```bash
node --test test/*.test.mjs
```

They start both servers on free ports with fake Blender/Autobuilder endpoints and check the
WebSocket handshake and framing, job lifecycle and events, G-code spooling and refusal, the
allow-list, API keys, idempotent resubmission, build ordering and result parsing.
