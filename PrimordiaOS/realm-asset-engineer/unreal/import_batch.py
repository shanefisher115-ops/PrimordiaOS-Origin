"""Commandlet script: imports a batch of approved realm assets in one editor session.

Runs the look-dev skill's import_asset.py unchanged once per item (it reads its PRIM_IMPORT_* environment at
module level, so each run_path is a fresh import). One commandlet launch for the whole batch instead of one
per mesh: the engine start-up is most of the time on this machine.

Environment:
  PRIM_BATCH_MANIFEST   JSON { "items": [ { "src", "dest", "name", "kind" } ] }
  PRIM_BATCH_RESULTS    JSON written after every item: { "items": [ { "name", "ok", "path", ... } ] }
  PRIM_IMPORT_ASSET_PY  path to the skill's scripts/import_asset.py
Log lines start with "BATCH" in Saved/Logs/<Project>.log.
"""
import json
import os
import runpy
import traceback

import unreal

MANIFEST = os.environ["PRIM_BATCH_MANIFEST"]
RESULTS = os.environ["PRIM_BATCH_RESULTS"]
IMPORT_ASSET = os.environ["PRIM_IMPORT_ASSET_PY"]

with open(MANIFEST, encoding="utf-8") as f:
    items = json.load(f)["items"]

results = []


def save():
    tmp = RESULTS + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"items": results, "done": len(results) == len(items)}, f, indent=1)
    os.replace(tmp, RESULTS)


unreal.log(f"BATCH start: {len(items)} items")
for item in items:
    os.environ["PRIM_IMPORT_SRC"] = item["src"]
    os.environ["PRIM_IMPORT_DEST"] = item["dest"]
    os.environ["PRIM_IMPORT_NAME"] = item["name"]
    os.environ["PRIM_IMPORT_KIND"] = item.get("kind", "mesh")
    path = f"{item['dest']}/{item['name']}"
    try:
        runpy.run_path(IMPORT_ASSET, run_name="__main__")
        asset = unreal.load_asset(path)
        box = asset.get_bounding_box()
        size = box.max - box.min
        results.append({
            "name": item["name"], "ok": True, "path": path,
            "class": asset.get_class().get_name(),
            "nanite": bool(asset.get_editor_property("nanite_settings").enabled),
            "slots": [str(m.material_slot_name) for m in asset.get_editor_property("static_materials")],
            "size_m": [round(size.x / 100, 3), round(size.y / 100, 3), round(size.z / 100, 3)],
        })
        unreal.log(f"BATCH ok {path}")
    except Exception as e:  # keep going: one bad mesh must not sink the batch
        results.append({"name": item["name"], "ok": False, "path": path, "error": str(e), "trace": traceback.format_exc()[-800:]})
        unreal.log_error(f"BATCH fail {path}: {e}")
    save()
unreal.log(f"BATCH done: {sum(r['ok'] for r in results)}/{len(items)} imported")
