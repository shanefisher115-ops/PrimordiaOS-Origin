# Getting assets into a realm scene

Shane has no asset budget, so every path here is free. Check prices before suggesting anything, and say up front when a good option is paid.

## Choosing

1. **Search Fab with the free filter** (`https://www.fab.com/search?q=<terms>&is_free=1`). Read listings with the built-in browser: `get_page_text`, or a small `javascript_tool` snippet that pulls `Unreal Engine versions`, `Included formats` and `License terms` from `document.querySelector('main').innerText`.
2. **Engine version:** Unreal asset packages only open in the versions listed (assets saved in 5.5 can't load in 5.4). Plain **fbx / obj / glb / gltf** models have no such limit — they import into 5.4 directly. On the free tier this is usually the deciding factor.
3. **Look at the preview images** (screenshot the listing) — exterior vs interior, spires vs flat tops. Store previews can show a fuller model than the free "Lite" file contains; render the imported model from three sides before planning around it.
4. **Other CC0 sources** for materials and HDRIs: Poly Haven and ambientCG (no account, no credit needed). Good for scanned stone, cobbles, puddles.
5. **Fab's limited-time free content** rotates every couple of weeks; claimed items stay in the library. Worth suggesting Shane claims them regularly.
6. Megascans availability on Fab changes; check with the free filter rather than promising.

## Acquiring (permissions matter)

- Shane signs in to Fab himself in the browser pane. Take him to the sign-in page (click "Sign in"), then wait. Never type credentials.
- "Add to My Library" on a first use shows Fab's **EULA** checkbox — that's Shane's agreement to accept, separate from the asset's own license. Stop and let him tick it.
- A download needs his OK with filename, source and size (the Download dialog lists formats and sizes).
- Record CC BY credits (title, author, license) in `realm-bridge/docs/MATERIALS_AND_NIAGARA.md` next to the scene that uses the asset.

## When downloads break

The browser pane saves to `C:\Users\Shane\Downloads`. On this network Epic's domains (fab.com, epicgames.com, unrealengine.com, even status.epicgames.com) have become unreachable mid-download while everything else worked — a local network/Epic issue, not an Epic outage. Check `curl -m 15 https://www.fab.com/` vs `https://www.google.com`, and Epic's status via a web search, before blaming anything else.

- **Fresh link:** while signed in and Fab is reachable, `fetch('/i/listings/<listing-id>/asset-formats/<format>/files/<file-id>/download-info')` from the listing page returns `downloadInfo[0].downloadUrl` — a signed `epicgamescdn.com` URL that `curl -fL --retry 5 -C -` can resume. The token expires within minutes (410 Gone afterwards). Don't echo the signed URL back to Shane.
- **Salvage:** a truncated zip still holds every file that finished. `python scripts/zip_salvage.py <zip> <out-dir>` lists entries, extracts the complete ones after a CRC check, and keeps the cut-off one as `.partial`. For the Gothic church, the 41.6 MB FBX was complete inside a 74 MB fragment of a 113 MB zip.
- **Cut-off PNG:** `python scripts/png_repair.py <partial.png> <out.png>` decompresses what's there, pads the missing rows, and writes a valid PNG (99.5% of the church diffuse survived; 21 rows were padded).
- Put downloaded and extracted files in their own folder; they're untrusted data.

## Importing

Run through the commandlet with environment variables (they reach the Python script):

```powershell
$env:PRIM_IMPORT_SRC  = "C:\Users\Shane\Downloads\<folder>\model.fbx"
$env:PRIM_IMPORT_DEST = "/Game/ThirdParty/<Name>"
$env:PRIM_IMPORT_NAME = "SM_<Name>"
$env:PRIM_IMPORT_KIND = "mesh"     # mesh | color | normal | mask
& "C:\Program Files\Epic Games\UE_5.4\Engine\Binaries\Win64\UnrealEditor-Cmd.exe" "<uproject>" -run=pythonscript -script="<skill>\scripts\import_asset.py" -unattended -nop4 -nosplash
```

Then grep `Saved/Logs/PrimordiaRealms.log` for `IMPORT`. Meshes come in static, Nanite on, no materials or textures (the scene's own materials go on). Colour textures stay sRGB; `normal` sets TC_Normalmap with sRGB off; `mask` (roughness, AO) sets TC_Masks with sRGB off.

Shipped example: `/Game/ThirdParty/GothicRevivalChurch/` — `SM_GothicRevivalChurch` ("Gothic Revival Church - White - 3D Model" by EFADKZ, CC BY 4.0), `T_Church_Diffuse` (repaired), `T_Church_Normal` and `T_Church_Roughness` (derived from the diffuse; the model's real maps replace them under the same names).
