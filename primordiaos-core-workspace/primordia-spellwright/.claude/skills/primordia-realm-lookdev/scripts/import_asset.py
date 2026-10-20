"""Commandlet script: imports one mesh or texture into the project.

Environment: PRIM_IMPORT_SRC (file), PRIM_IMPORT_DEST (/Game/ThirdParty/<Name>), PRIM_IMPORT_NAME (asset name),
PRIM_IMPORT_KIND: mesh | color | normal | mask.

mesh   -> static mesh, Nanite on, no materials, no textures. Type detection is off because automated imports
          otherwise pick skeletal for any FBX that carries a rig. Logs bounds (m) and material slots.
color  -> sRGB texture, default compression.
normal -> sRGB off, TC_Normalmap. Unreal wants DirectX (green down); set PRIM_FLIP_GREEN=1 for OpenGL maps,
          which Blender exports by default. Not sure? A height-derived normal field has no curl in its true
          convention: compare mean |d(nx)/drow -/+ d(ny)/dcol| (lower wins; scripts/normal_convention.py does this).
mask   -> sRGB off, TC_Masks (roughness, AO, any linear data).
Output lines start with "IMPORT" in Saved/Logs/<Project>.log.
"""
import os

import unreal

SRC = os.environ["PRIM_IMPORT_SRC"]
DEST = os.environ["PRIM_IMPORT_DEST"]
NAME = os.environ["PRIM_IMPORT_NAME"]
KIND = os.environ.get("PRIM_IMPORT_KIND", "mesh")

task = unreal.AssetImportTask()
for k, v in (("filename", SRC), ("destination_path", DEST), ("destination_name", NAME),
             ("automated", True), ("replace_existing", True), ("save", KIND == "mesh")):
    task.set_editor_property(k, v)

if KIND == "mesh":
    ui = unreal.FbxImportUI()
    for k, v in (("import_mesh", True), ("import_as_skeletal", False), ("import_materials", False),
                 ("import_textures", False), ("import_animations", False),
                 ("mesh_type_to_import", unreal.FBXImportType.FBXIT_STATIC_MESH),
                 ("original_import_type", unreal.FBXImportType.FBXIT_STATIC_MESH),
                 ("automated_import_should_detect_type", False)):
        ui.set_editor_property(k, v)
    sm = ui.get_editor_property("static_mesh_import_data")
    for k, v in (("combine_meshes", True), ("build_nanite", True), ("generate_lightmap_u_vs", False),
                 ("auto_generate_collision", False)):
        sm.set_editor_property(k, v)
    task.set_editor_property("options", ui)

unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
path = f"{DEST}/{NAME}"
asset = unreal.load_asset(path)
if asset is None:
    raise RuntimeError(f"IMPORT failed: {SRC} -> {path}")

if KIND == "mesh":
    box = asset.get_bounding_box()
    size = box.max - box.min
    unreal.log(f"IMPORT {path} class={asset.get_class().get_name()} nanite={asset.get_editor_property('nanite_settings').enabled}")
    unreal.log(f"IMPORT bounds_cm min={box.min} max={box.max} size_m=({size.x/100:.1f}, {size.y/100:.1f}, {size.z/100:.1f})")
    for i, m in enumerate(asset.get_editor_property("static_materials")):
        unreal.log(f"IMPORT slot {i}: {m.material_slot_name}")
else:
    if KIND in ("normal", "mask"):
        asset.set_editor_property("srgb", False)
        asset.set_editor_property("compression_settings", unreal.TextureCompressionSettings.TC_NORMALMAP if KIND == "normal"
                                  else unreal.TextureCompressionSettings.TC_MASKS)
        if KIND == "normal":
            asset.set_editor_property("flip_green_channel", os.environ.get("PRIM_FLIP_GREEN", "0") == "1")
    unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False)
    unreal.log(f"IMPORT {path} {asset.blueprint_get_size_x()}x{asset.blueprint_get_size_y()} "
               f"srgb={asset.get_editor_property('srgb')} compression={asset.get_editor_property('compression_settings')}")
