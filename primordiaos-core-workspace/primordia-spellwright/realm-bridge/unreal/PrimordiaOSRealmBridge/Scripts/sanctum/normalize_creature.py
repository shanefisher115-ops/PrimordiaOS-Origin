"""Headless Blender: normalize a creature .glb for ASpeciesActor.
  blender -b --python normalize.py -- <in.glb> <out.glb> <preview.png> [max_tris]
Joins every mesh, applies transforms, turns the longest horizontal axis to +X (forward), centres the
pivot, scales the length to 1 m, decimates above max_tris, and renders a preview."""
import math
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
src, dst, preview = args[0], args[1], args[2]
max_tris = int(args[3]) if len(args) > 3 else 6000

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
for o in bpy.context.scene.objects:
    o.select_set(o in meshes)
bpy.context.view_layer.objects.active = meshes[0]
# Drop armatures/animation parents: keep the meshes in their current pose.
for o in meshes:
    for m in [m for m in o.modifiers if m.type == "ARMATURE"]:
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=m.name)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
if len(meshes) > 1:
    bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
for o in list(bpy.context.scene.objects):
    if o is not obj:
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def bounds():
    vs = [obj.matrix_world @ v.co for v in obj.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return lo, hi

lo, hi = bounds()
size = hi - lo
if size.y > size.x:  # longest horizontal axis -> +X
    obj.rotation_euler = (0, 0, math.radians(90))
    bpy.ops.object.transform_apply(rotation=True)
lo, hi = bounds()
centre = (lo + hi) / 2
obj.location -= centre
bpy.ops.object.transform_apply(location=True)
lo, hi = bounds()
s = 1.0 / max(hi.x - lo.x, 1e-6)
obj.scale = (s, s, s)
bpy.ops.object.transform_apply(scale=True)
tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
if tris > max_tris:
    d = obj.modifiers.new("decimate", "DECIMATE")
    d.ratio = max_tris / tris
    bpy.ops.object.modifier_apply(modifier=d.name)
tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
lo, hi = bounds()
print(f"NORMALIZE {src} -> {dst}: {tris} tris, size {tuple(round(v, 3) for v in (hi - lo))} m, materials {[m.name for m in obj.data.materials]}")
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=False)

# Preview: three-quarter view, soft light.
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
bpy.context.scene.collection.objects.link(cam)
cam.location = (1.1, -1.3, 0.6)
cam.rotation_euler = (math.radians(70), 0, math.radians(40))
bpy.context.scene.camera = cam
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
sun.data.energy = 4
sun.rotation_euler = (math.radians(45), 0, math.radians(30))
bpy.context.scene.collection.objects.link(sun)
world = bpy.data.worlds.new("w")
world.color = (0.25, 0.25, 0.3)
bpy.context.scene.world = world
sc = bpy.context.scene
sc.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items} else "BLENDER_EEVEE"
sc.render.resolution_x = sc.render.resolution_y = 512
sc.render.filepath = preview
bpy.ops.render.render(write_still=True)
