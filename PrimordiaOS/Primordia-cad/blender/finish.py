"""Blender finishing stage for Primordia-cad meshes (run headless; Node calls it via kernel/blender.ts).

  blender -b --factory-startup --python finish.py -- --in piece.glb --out finished/ [options]

What it does to a kernel mesh, in order:
  weld      merges the vertices the kernel split for hard edges and UV seams
  smooth    marks edges sharper than --angle as sharp and shades the rest smooth
  bevel     a small bevel on those sharp edges with hardened normals, so CSG's razor edges catch light
  normals   weighted normals (face-area weighted, sharp edges kept)
  uv        keeps the kernel's world-scale tiling UVs (UVMap) and adds a non-overlapping "Bake" UV map
  bake      ambient occlusion and curvature (edge wear) maps in the Bake UVs, with Cycles on the CPU
  lods      decimated copies for the web (--lods 0.5,0.25)
  export    <name>.glb (plain, for Unreal's Interchange), <name>.web.glb (Draco, for three.js),
            <name>.fbx (for Unreal's FBX importer), plus <name>.finish.json with stats and file names
  preview   an EEVEE render of the finished piece

Units stay metres, pivot at the base centre. Maps are written beside the meshes as PNG; the .glb files
carry both UV sets (TEXCOORD_0 tiling, TEXCOORD_1 bake), so three.js can use the AO map as aoMap.
"""
import argparse
import json
import math
import os
import sys
import time

import bmesh
import bpy
from mathutils import Vector


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(prog="finish.py")
    p.add_argument("--in", dest="src", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--name", default=None)
    p.add_argument("--bevel", type=float, default=-1.0, help="bevel width in metres; -1 = 0.4%% of the size, 0 = none")
    p.add_argument("--angle", type=float, default=35.0, help="edges sharper than this (degrees) are sharp and bevelled")
    p.add_argument("--bake", type=int, default=1024, help="AO/curvature map size; 0 = no bake")
    p.add_argument("--samples", type=int, default=16)
    p.add_argument("--lods", default="", help="decimation ratios, e.g. 0.5,0.25")
    p.add_argument("--fbx", type=int, default=1)
    p.add_argument("--draco", type=int, default=1)
    p.add_argument("--preview", type=int, default=512, help="preview size in pixels; 0 = none")
    return p.parse_args(argv)


def log(msg):
    print(f"[finish] {msg}", flush=True)


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def select_only(obj):
    for o in bpy.context.scene.objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def import_piece(path):
    bpy.ops.import_scene.gltf(filepath=path, merge_vertices=True)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"no mesh in {path}")
    for o in meshes:  # flatten any glTF node hierarchy, keeping world placement
        if o.parent:
            mw = o.matrix_world.copy()
            o.parent = None
            o.matrix_world = mw
    for o in [o for o in bpy.context.scene.objects if o.type != "MESH"]:
        bpy.data.objects.remove(o, do_unlink=True)
    select_only(meshes[0])
    for o in meshes:
        o.select_set(True)
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def tri_count(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def weld(obj):
    me = obj.data
    if me.has_custom_normals:
        select_only(obj)
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(me)
    bm.free()


def apply_modifiers(obj):
    select_only(obj)
    for m in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def shape(obj, width, angle_deg):
    select_only(obj)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle_deg))
    apply_modifiers(obj)  # shade_smooth_by_angle may add a "Smooth by Angle" modifier in 4.1+
    if width > 0:
        bev = obj.modifiers.new("Bevel", "BEVEL")
        bev.width = width
        bev.segments = 2
        bev.limit_method = "ANGLE"
        bev.angle_limit = math.radians(angle_deg)
        bev.harden_normals = True
        bev.use_clamp_overlap = True
    wn = obj.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL")
    wn.keep_sharp = True
    apply_modifiers(obj)


def bake_uvs(obj):
    me = obj.data
    if "Bake" not in me.uv_layers:
        me.uv_layers.new(name="Bake")
    me.uv_layers.active = me.uv_layers["Bake"]
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
    bpy.ops.uv.pack_islands(rotate=True, margin=0.004)  # fill the square: tall pieces leave half of it empty
    bpy.ops.object.mode_set(mode="OBJECT")
    me.uv_layers.active = me.uv_layers[0]
    me.uv_layers[0].active_render = True


def bake_maps(obj, size, samples, out_dir, name):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    me = obj.data
    me.uv_layers.active = me.uv_layers["Bake"]
    files = {}
    dims = obj.dimensions
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    scene.world.light_settings.distance = max(0.5, 0.15 * max(dims))

    def bake_into(kind, bake_type, materials):
        img = bpy.data.images.new(f"{name}_{kind}", size, size, alpha=False)
        nodes_added = []
        for mat in materials:
            mat.use_nodes = True
            node = mat.node_tree.nodes.new("ShaderNodeTexImage")
            node.image = img
            mat.node_tree.nodes.active = node
            nodes_added.append((mat, node))
        select_only(obj)
        bpy.ops.object.bake(type=bake_type, margin=4, use_clear=True)
        path = os.path.join(out_dir, f"{name}_{kind}.png")
        img.filepath_raw = path
        img.file_format = "PNG"
        img.save()
        for mat, node in nodes_added:
            mat.node_tree.nodes.remove(node)
        files[kind] = os.path.basename(path)

    originals = list(me.materials)
    if not originals:
        me.materials.append(bpy.data.materials.new("Stone"))
        originals = list(me.materials)
    t = time.time()
    bake_into("AO", "AO", {m for m in originals if m})
    log(f"baked AO {size}px in {time.time() - t:.1f}s")

    # Curvature: Cycles' pointiness, stretched around 0.5 so edges go light and crevices dark.
    curv = bpy.data.materials.new("CurvatureBake")
    curv.use_nodes = True
    nt = curv.node_tree
    nt.nodes.clear()
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    rng = nt.nodes.new("ShaderNodeMapRange")
    rng.inputs["From Min"].default_value = 0.44
    rng.inputs["From Max"].default_value = 0.56
    emit = nt.nodes.new("ShaderNodeEmission")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(geo.outputs["Pointiness"], rng.inputs["Value"])
    nt.links.new(rng.outputs["Result"], emit.inputs["Color"])
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    for i in range(len(me.materials)):
        me.materials[i] = curv
    t = time.time()
    bake_into("Curvature", "EMIT", [curv])
    log(f"baked curvature {size}px in {time.time() - t:.1f}s")
    for i, m in enumerate(originals):
        me.materials[i] = m
    bpy.data.materials.remove(curv)
    me.uv_layers.active = me.uv_layers[0]
    return files


def export_glb(obj, path, draco):
    select_only(obj)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True,
                              export_texcoords=True, export_normals=True, export_materials="EXPORT",
                              export_draco_mesh_compression_enable=bool(draco))


def export_fbx(obj, path):
    select_only(obj)
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, apply_unit_scale=True, use_mesh_modifiers=True,
                             mesh_smooth_type="OFF")


def make_lods(obj, ratios, out_dir, name):
    files = []
    for i, r in enumerate(ratios, start=1):
        dup = obj.copy()
        dup.data = obj.data.copy()
        bpy.context.scene.collection.objects.link(dup)
        dec = dup.modifiers.new("Decimate", "DECIMATE")
        dec.ratio = r
        apply_modifiers(dup)
        path = os.path.join(out_dir, f"{name}_LOD{i}.glb")
        export_glb(dup, path, draco=False)
        files.append({"file": os.path.basename(path), "ratio": r, "triangles": tri_count(dup)})
        bpy.data.objects.remove(dup, do_unlink=True)
    return files


def show_maps(obj, out_dir, name):
    """Preview only (after export): darken crevices with the AO map and lighten worn edges with curvature."""
    imgs = {}
    for kind in ("AO", "Curvature"):
        f = os.path.join(out_dir, f"{name}_{kind}.png")
        if os.path.exists(f):
            imgs[kind] = bpy.data.images.load(f)
            imgs[kind].colorspace_settings.name = "Non-Color"
    if not imgs:
        return
    for mat in obj.data.materials:
        if not mat or "glass" in mat.name.lower():
            continue
        mat.use_nodes = True
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf is None:
            continue
        base = bsdf.inputs["Base Color"]
        color = tuple(base.default_value)
        uv = nt.nodes.new("ShaderNodeUVMap")
        uv.uv_map = "Bake"
        rgb = nt.nodes.new("ShaderNodeRGB")
        rgb.outputs[0].default_value = color
        result = rgb.outputs[0]
        if "AO" in imgs:
            ao = nt.nodes.new("ShaderNodeTexImage")
            ao.image = imgs["AO"]
            nt.links.new(uv.outputs["UV"], ao.inputs["Vector"])
            mul = nt.nodes.new("ShaderNodeMix")
            mul.data_type = "RGBA"
            mul.blend_type = "MULTIPLY"
            mul.inputs["Factor"].default_value = 1.0
            nt.links.new(result, mul.inputs["A"])
            nt.links.new(ao.outputs["Color"], mul.inputs["B"])
            result = mul.outputs["Result"]
        if "Curvature" in imgs:
            cv = nt.nodes.new("ShaderNodeTexImage")
            cv.image = imgs["Curvature"]
            nt.links.new(uv.outputs["UV"], cv.inputs["Vector"])
            wear = nt.nodes.new("ShaderNodeMix")
            wear.data_type = "RGBA"
            wear.blend_type = "SCREEN"
            nt.links.new(cv.outputs["Color"], wear.inputs["Factor"])
            nt.links.new(result, wear.inputs["A"])
            wear.inputs["B"].default_value = (0.35, 0.33, 0.30, 1.0)
            result = wear.outputs["Result"]
        nt.links.new(result, base)


def preview(obj, size, path):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.16, 0.17, 0.22, 1.0)
        bg.inputs[1].default_value = 1.0
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
    hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
    centre, radius = (lo + hi) / 2, (hi - lo).length / 2
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    scene.collection.objects.link(cam)
    yaw, pitch = math.radians(-35), math.radians(15)
    direction = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
    fov = 2 * math.atan(18 / cam_data.lens)  # 36 mm sensor
    cam.location = centre + direction * (radius / math.sin(fov / 2)) * 1.05
    cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    sun_data = bpy.data.lights.new("Key", "SUN")
    sun_data.energy = 3.5
    sun = bpy.data.objects.new("Key", sun_data)
    sun.rotation_euler = (math.radians(62), 0, math.radians(-75))  # low and raking, so relief reads
    scene.collection.objects.link(sun)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    args = parse_args()
    started = time.time()
    os.makedirs(args.out, exist_ok=True)
    name = args.name or os.path.splitext(os.path.basename(args.src))[0]
    clear_scene()
    obj = import_piece(args.src)
    obj.name = name
    stats = {"name": name, "source": os.path.abspath(args.src), "triangles_in": tri_count(obj)}
    weld(obj)
    size = max(obj.dimensions)
    width = args.bevel if args.bevel >= 0 else min(0.05, max(0.005, 0.004 * size))
    shape(obj, width, args.angle)
    bake_uvs(obj)
    stats.update(bevel_m=round(width, 4), angle_deg=args.angle, triangles_out=tri_count(obj),
                 dimensions_m=[round(d, 3) for d in obj.dimensions])
    files = {}
    if args.bake > 0:
        files.update(bake_maps(obj, args.bake, args.samples, args.out, name))
    glb = os.path.join(args.out, f"{name}.glb")
    export_glb(obj, glb, draco=False)
    files["glb"] = os.path.basename(glb)
    if args.draco:
        web = os.path.join(args.out, f"{name}.web.glb")
        export_glb(obj, web, draco=True)
        files["web_glb"] = os.path.basename(web)
    if args.fbx:
        fbx = os.path.join(args.out, f"{name}.fbx")
        export_fbx(obj, fbx)
        files["fbx"] = os.path.basename(fbx)
    ratios = [float(r) for r in args.lods.split(",") if r.strip()]
    if ratios:
        files["lods"] = make_lods(obj, ratios, args.out, name)
    if args.preview > 0:
        path = os.path.join(args.out, f"{name}_preview.png")
        try:
            show_maps(obj, args.out, name)
            preview(obj, args.preview, path)
            files["preview"] = os.path.basename(path)
        except Exception as e:  # EEVEE needs a GPU context; a missing preview shouldn't fail the stage
            log(f"preview skipped: {e}")
    stats.update(files=files, seconds=round(time.time() - started, 1))
    with open(os.path.join(args.out, f"{name}.finish.json"), "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
    log(f"done {name}: {stats['triangles_in']} -> {stats['triangles_out']} tris in {stats['seconds']}s")


try:
    main()
except Exception as exc:  # make failures visible to the Node caller and exit non-zero
    import traceback
    traceback.print_exc()
    print(f"[finish] FAILED: {exc}", flush=True)
    sys.exit(1)
