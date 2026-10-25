---
name: "primordia-realm-lookdev"
description: How to build, light, render and dress PrimordiaOS realm scenes in Unreal Engine 5.4 on Shane's machine — the realm-bridge plugin's editor-Python build scripts (like build_cathedral_scene.py), the headless build + screenshot loop in the PrimordiaRealms project, getting free Fab assets in (including salvaging broken downloads), importing FBX as static Nanite meshes, repairing textures, deriving normal/roughness maps, glowing windows, rings, fog and exposure, and the many Unreal gotchas that cost time. Use this whenever the user wants to make a realm or scene look better, recreate a reference image in Unreal, add or swap 3D assets, render or screenshot the Unreal scene, tune lighting/materials/Niagara/post-process, push toward photorealism, or mentions the cathedral scene, NeoGothicCathedral, PrimordiaRealms, Fab, Megascans, Nanite, Lumen or "look dev" — even if they just paste a reference image or say "make it look like this".
---

# PrimordiaOS realm look-dev (Unreal 5.4)

Realm visuals live in the **realm-bridge** plugin (`primordia-spellwright/realm-bridge/unreal/PrimordiaOSRealmBridge`). Scenes and materials are built by **editor Python scripts** in its `Scripts/` folder, so every look is reproducible: change the script, rebuild, render, compare. Keep it that way — hand edits in the editor are lost on the next rebuild.

The reference implementation is `Scripts/build_cathedral_scene.py` (map `/PrimordiaOSRealmBridge/Maps/NeoGothicCathedral`), documented in `realm-bridge/docs/MATERIALS_AND_NIAGARA.md` §9. Read both before building a new scene; copy its structure (material builders → `open_map` → building → windows → rings → lighting → post → camera).

## Quick start

| Task | Do this |
|---|---|
| Rebuild + render the hero shot | `pwsh scripts/ue_run.ps1 -BuildScript <repo Scripts/build_x.py> -Map <map> -Out <png>` then Read the PNG |
| Render only (no rebuild) | `pwsh scripts/ue_run.ps1 -Map <map> -Out <png>` |
| Render the **live** realm (bridge connected, PrimordiaGPU crowd + aura on top) | start the realm server with `--gpu-quality 1`, then `pwsh scripts/live_shot.ps1 -Out <png> [-Port 7777] [-Delay 25]` (uses PrimordiaRealmGPU's `-PrimordiaShot` hook; console `primordia.Shot <png>` does the same in a running game) |
| Relight the live bench (sun, exposure, mist sea below the realm) or change the realm's surfaces | edit and run `Scripts/build_realm_bench.py` / `Scripts/build_layer_material.py` (commandlet, from the project's plugin copy), then a live shot; values and reasons are in `realm-bridge/docs/MATERIALS_AND_NIAGARA.md` §7 and §8b. Copy the rebuilt `.uasset`s back to the repo |
| Import an FBX as a static Nanite mesh | `scripts/import_asset.py` (kind `mesh`) via the commandlet — see "Importing" |
| Make Gothic architecture (spires, pinnacles, windows, buttresses, balustrades, lamps) to measure | `node gothic.mjs kit --out kit` (or one piece: `node gothic.mjs spire --height 40 --out spire.glb`) in `PrimordiaOS/Primordia-cad`, then import each `.glb` with `import_asset.py` into `/Game/ThirdParty/PrimordiaGothicKit/` |
| Finish generated pieces (bevels, AO + curvature bakes, LODs, Draco .glb, .fbx) | `node gothic.mjs finish <file.glb\|dir>` in `PrimordiaOS/Primordia-cad` (headless Blender; see its README) |
| Import a texture (colour / normal / mask) | `scripts/import_asset.py` (kind `color`, `normal` or `mask`) |
| Find features on a mesh (tower tops etc.) | `scripts/measure_mesh_tops.py` via the commandlet |
| Pull complete files out of a broken zip | `python scripts/zip_salvage.py <zip> <out-dir>` |
| Fix a truncated PNG | `python scripts/png_repair.py <in.png> <out.png>` |
| Normal + roughness from a diffuse | `realm-bridge/unreal/PrimordiaOSRealmBridge/Scripts/derive_surface_maps.py` (needs numpy + pillow; make a venv in the scratchpad, don't touch system Python) |
| Is a normal map DirectX or OpenGL? | `python scripts/normal_convention.py <normal.png>` (needs numpy + pillow). OpenGL — Blender's default — imports with `PRIM_FLIP_GREEN=1` |

Paths in `scripts/` are relative to this skill's directory. `ue_run.ps1` holds the machine paths (engine, project) at the top; check them if anything moved.

## The machine and project (verify, don't assume)

- **Engine:** `C:\Program Files\Epic Games\UE_5.4`. **Project:** `C:\Users\Shane\Documents\Unreal Projects\PrimordiaRealms`.
- The project's `Plugins/PrimordiaOSRealmBridge` is a **copy**, not a link. The loop is: edit in the repo → copy the script into the project → build → copy built `.uasset`/`.umap` files from the project back into the repo `Content/` → commit. `ue_run.ps1` does the first copy; the copy back is yours.
- **Hardware:** Ryzen 3 4300U laptop with integrated Radeon — no hardware ray tracing (no path tracer, no HW Lumen), slow real time. Offline quality comes from Movie Render Queue, not real-time settings. About 35 GB free disk; UE 5.4 alone is 37 GB, so side-by-side engine upgrades don't fit.
- **Third-party assets** go in the project's `/Game/ThirdParty/<Name>/`, never the plugin repo. Scripts treat them as optional (`unreal.load_asset(path)` returns None → fall back), and the committed map stays the fallback version.

## The build → render loop, and why it's shaped this way

1. **Build headless:** `UnrealEditor-Cmd.exe <uproject> -run=pythonscript -script=<script>`. `unreal.log` output goes to `Saved/Logs/PrimordiaRealms.log`, **not** stdout — grep the log for your prefix. "Unable to Check Out From Revision Control" dialogs during imports are harmless (revision control is disabled; `-unattended` dismisses them).
2. **Render with the full editor** (`UnrealEditor.exe ... -ExecCmds="py render_shot.py"`), because commandlets don't render. `render_shot.py` does three things that each fixed a real failure:
   - runs `RecompileShaders material <name>` for each scene material, which **blocks until shaders exist** — otherwise translucent materials are silently skipped while compiling;
   - moves the editor viewport to the camera (`set_level_viewport_camera_info`) — high-res shots through a camera cull by the *viewport's* view, and additive planes high in the sky vanished until this was done;
   - guards its Slate tick callback against re-entry (the capture ticks Slate and re-enters the callback → RecursionError).
3. **Launch with `-ini:Game:[/Script/PrimordiaOSRealmBridge.PrimordiaBridgeSettings]:bAutoConnect=False`** so a stray Play session doesn't connect to the node bridge (ws://127.0.0.1:7777) and stream a live realm over the shot. It's a one-launch override; project settings are untouched.
4. **Tell Shane before a render** that an Unreal window will open and close by itself. He watches it and has pressed Play mid-render before, which switches the editor to PIE and changes what gets captured.
5. **Never kill the editor mid shader compile** if you can avoid it — nothing gets cached, so the next run compiles from scratch again. Rebuilding a material graph always forces a recompile; budget 5–8 minutes for a rebuild+render.

Always look at the PNG yourself (Read it) and compare against the reference before claiming a change worked. Send renders to Shane with SendUserFile; before/after pairs land best.

## Gotchas that cost hours

- `EditorAssetLibrary.does_asset_exist` is false in a commandlet for content the registry hasn't scanned — use `unreal.load_asset(path)`.
- `ExponentialHeightFogComponent` volumetric settings need the setter methods (`set_volumetric_fog`, `set_volumetric_fog_albedo`, …); `set_editor_property("volumetric_fog")` fails.
- Material `Noise` input pin is `""`, not `"Position"`.
- `LevelEditorSubsystem.editor_request_begin_play` doesn't exist in 5.4 Python.
- `-ExecutePythonScript` quits the editor when the script returns; use `-ExecCmds="py <script>"` for anything that waits.
- Automated FBX import re-detects the mesh type and picks **skeletal** if the file has a rig. Set `automated_import_should_detect_type = False` and `original_import_type = FBXIT_STATIC_MESH`.
- `.glb`/`.gltf` and `.obj` go through **Interchange**, not the FBX importer. glTF comes in right (metres → cm, Y up → Z up, slots named after the glTF materials, Nanite on in this project). Interchange's OBJ translator reads the file as **Z up** (it only flips Y; see `InterchangeOBJTranslator.cpp`), so a Y-up OBJ (Blender's default, and Primordia-cad's) would come in on its side — the `.glb` is the tested path.
- **Masked** emissive window planes rendered nothing in editor captures; **additive** works (and leaves no square on the wall). Prefer additive for glow decals.
- In manual exposure with physical camera exposure off, `auto_exposure_bias` is plain exposure compensation (+1 = twice as bright). Negative values made the first renders black.
- When editing a Python file that contains `\x..` escapes from a shell heredoc, the escapes can land as raw bytes (null bytes broke the script). Read/write with `newline=""` and verify with `ast.parse`.
- Files in the repo are sometimes held open by another process (Codex runs here too): plain writes fail with `OSError [Errno 22]`, and an in-place rewrite can succeed but fail to truncate, leaving the old file's tail after your new text. Write a temp file next to the target and `os.replace` it (retry a few times), then `ast.parse` the result.
- The repo often has other people's/agents' uncommitted work in the same docs. Stage only your hunks (build the staged blob from `git show HEAD:` + your edit, `git hash-object -w`, `git update-index --cacheinfo`), commit, and say so.

## Getting assets (Fab, for free)

Read `references/assets.md` before acquiring anything. The short version:
- **Version gating:** Unreal asset packages need a matching engine version (most new kits are 5.5+). **Plain FBX/OBJ/glTF models ignore that** — they import into 5.4 fine. Search Fab with the free filter and prefer listings whose formats are fbx/glb.
- Shane signs in and accepts Fab's EULA himself; never enter credentials. CC BY assets need credit — record author + license in the docs.
- Downloads from Fab are flaky on this network (Epic's domains have gone unreachable mid-download). Zips store files sequentially, so **a truncated zip usually still holds complete files** — salvage them with `zip_salvage.py` (CRC-checked) and repair a cut-off PNG with `png_repair.py` before giving up.

## Importing and fitting a model

1. Static Nanite import with no materials/textures (`import_asset.py`, kind `mesh`); it logs bounds and material slots.
2. Render it from three sides with daylight to learn which way the facade faces and what's missing (models are often lighter than their store preview).
3. Place it from its bounding box (scale, yaw, facade at the scene's origin line) — see `place_church` in the cathedral script for the model→world mapping.
4. Measure features you need to attach to (`measure_mesh_tops.py`) instead of eyeballing renders; store the measurements as constants in the build script with a comment saying where they came from.
5. Use a two-sided material instance for downloaded meshes (some faces point inward).

## Look recipes

`references/look_recipes.md` has the values that worked for the night cathedral (exposure, emissive scale, fog, horizon glow placement, ring shader, window glow) and the photoreal plan. Highlights:
- Windows on a textured building: emit where the albedo is dark **and** the surface is near-vertical (skips dark roofs), cut into leaded panes in world space. One colour per 12 m column so a window doesn't change colour halfway.
- Warm horizon glow must sit **in frame**: a camera looking up 30° never sees lights at 10 m on the horizon — raise them (35 m worked).
- Derived normal/roughness maps from the diffuse are a good stopgap for missing maps; import them under the names the real maps will use so they swap in later.
