"""Dresses the live realm with free Fab assets (Quixel Megascans scans and a crystal set), already
imported into /Game/ThirdParty/LumenneScans (docs/MATERIALS_AND_NIAGARA.md §7d):

- M_PrimordiaGroundScan: the terraces and base disc. Rocky Ground on surfaces that face up,
  Lichened Rock Wall on cliff faces, both projected by world position (the terraces are scaled
  cylinders, so their UVs are useless), with soft macro variation and a light tint from the
  layer's palette colour so each realm keeps its hue. It reads the same parameters as
  M_PrimordiaLayer, so the generator drives it unchanged.
- LayerArt in Config/DefaultGame.ini: monoliths become the forest cliff scan (turned so its
  face is the slab's broad side), rubble becomes the beach and tundra rock scans (uniform fit),
  spires become the crystal clusters and their skirts the crystal ground shards, in the layer
  material. Every rock scan keeps its own scanned material (bUseMeshMaterials); all are fitted to the tier's box from its
  bounds (Fit), so no re-authoring is needed.

The third-party assets live in the project, not the plugin. Without them the script stops and
the realm keeps its engine shapes and M_PrimordiaLayer.

    UnrealEditor-Cmd.exe PrimordiaRealms.uproject -run=pythonscript -script="<plugin>/Scripts/build_realm_scans.py"
"""

import os
import re

import unreal

SCANS = "/Game/ThirdParty/LumenneScans"
MATERIAL = f"{SCANS}/M_PrimordiaGroundScan"
# The realm is ~240 m across and usually seen from ~200 m: a 4 m repeat averaged to flat brown.
TOP_TILE_CM = 1200.0   # Rocky Ground repeats every 12 m on terrace tops
SIDE_TILE_CM = 800.0   # Lichened Rock Wall every 8 m on cliff faces
TINT = 0.25            # how much the layer's palette colour tints the scans
BRIGHTNESS = 1.6       # the scans' albedo is dark (~0.15) next to the realm's pale palette
MACRO_CM = 3000.0

MEL = unreal.MaterialEditingLibrary


def log(msg):
    unreal.log(f"RealmScans: {msg}")


def need(path):
    asset = unreal.load_asset(path)
    if not asset:
        raise RuntimeError(f"missing {path}: import the Fab scans first (docs/MATERIALS_AND_NIAGARA.md §7d)")
    return asset


def connect(src, src_out, dst, dst_in):
    if not MEL.connect_material_expressions(src, src_out, dst, dst_in):
        raise RuntimeError(f"could not connect {src.get_name()}.{src_out!r} -> {dst.get_name()}.{dst_in!r}")


def build_ground_material():
    tex = {k: need(f"{SCANS}/Surfaces/{k}") for k in (
        "T_RockyGround_BaseColor", "T_RockyGround_Normal", "T_RockyGround_Roughness", "T_RockyGround_AO",
        "T_LichenedRock_BaseColor", "T_LichenedRock_Normal", "T_LichenedRock_Roughness")}
    m = unreal.load_asset(MATERIAL)
    if m:
        MEL.delete_all_material_expressions(m)
    else:
        m = unreal.AssetToolsHelpers.get_asset_tools().create_asset("M_PrimordiaGroundScan", SCANS, unreal.Material, unreal.MaterialFactoryNew())
    m.set_editor_property("used_with_instanced_static_meshes", True)

    y = [-1400]
    def node(cls, x=-500, **props):
        y[0] += 100
        e = MEL.create_material_expression(m, cls, x, y[0])
        for k, v in props.items():
            e.set_editor_property(k, v)
        return e

    def op(cls, a, b=None, k=None, a_out="", b_out=""):
        e = node(cls)
        connect(a, a_out, e, "A")
        if b is not None:
            connect(b, b_out, e, "B")
        elif k is not None:
            e.set_editor_property("const_b", k)
        return e

    def unary(cls, a, out=""):
        e = node(cls)
        connect(a, out, e, "")
        return e

    def lerp(a, b, alpha):
        e = node(unreal.MaterialExpressionLinearInterpolate)
        connect(a, "", e, "A")
        connect(b, "", e, "B")
        connect(alpha, "", e, "Alpha")
        return e

    def mask(src, r, g, b):
        e = node(unreal.MaterialExpressionComponentMask, r=r, g=g, b=b, a=False)
        connect(src, "", e, "")
        return e

    def sample(texture, uv, kind):
        sampler = {"color": unreal.MaterialSamplerType.SAMPLERTYPE_COLOR, "normal": unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL,
                   "mask": unreal.MaterialSamplerType.SAMPLERTYPE_MASKS}[kind]
        e = node(unreal.MaterialExpressionTextureSample, -200, texture=texture, sampler_type=sampler)
        connect(uv, "", e, "UVs")
        return e

    def scalar(name, v):
        return node(unreal.MaterialExpressionScalarParameter, -1100, parameter_name=name, default_value=v)

    color = node(unreal.MaterialExpressionVectorParameter, -1100, parameter_name="Color", default_value=unreal.LinearColor(0.5, 0.5, 0.55, 1))
    tint_amount = scalar("ScanTint", TINT)
    brightness = scalar("ScanBrightness", BRIGHTNESS)
    inversion = scalar("Inversion", 0.2)
    world = node(unreal.MaterialExpressionWorldPosition, -1100)
    top_uv = op(unreal.MaterialExpressionDivide, mask(world, True, True, False), scalar("TopTileCm", TOP_TILE_CM))
    side_tile = scalar("SideTileCm", SIDE_TILE_CM)
    side_a_uv = op(unreal.MaterialExpressionDivide, mask(world, False, True, True), side_tile)  # faces whose normal is along X
    side_b_uv = op(unreal.MaterialExpressionDivide, mask(world, True, False, True), side_tile)  # faces whose normal is along Y

    normal_ws = node(unreal.MaterialExpressionVertexNormalWS, -1100)
    nz = mask(normal_ws, False, False, True)
    top_w = unary(unreal.MaterialExpressionSaturate, op(unreal.MaterialExpressionMultiply, op(unreal.MaterialExpressionAdd, nz, k=-0.55), k=4.0))
    ax = unary(unreal.MaterialExpressionAbs, mask(normal_ws, True, False, False))
    ay = unary(unreal.MaterialExpressionAbs, mask(normal_ws, False, True, False))
    side_mix = unary(unreal.MaterialExpressionSaturate, op(unreal.MaterialExpressionDivide, ax, op(unreal.MaterialExpressionAdd, op(unreal.MaterialExpressionAdd, ax, ay), k=0.001)))

    def channel(e, kind):
        return mask(e, True, False, False) if kind == "mask" else e  # masks carry one value, in R

    def triplanar(top_tex, side_tex, kind):
        side = lerp(channel(sample(side_tex, side_b_uv, kind), kind), channel(sample(side_tex, side_a_uv, kind), kind), side_mix)
        return lerp(side, channel(sample(top_tex, top_uv, kind), kind), top_w)

    albedo = triplanar(tex["T_RockyGround_BaseColor"], tex["T_LichenedRock_BaseColor"], "color")
    rough = triplanar(tex["T_RockyGround_Roughness"], tex["T_LichenedRock_Roughness"], "mask")
    normal = triplanar(tex["T_RockyGround_Normal"], tex["T_LichenedRock_Normal"], "normal")
    ao = lerp(node(unreal.MaterialExpressionConstant, -1100, r=1.0), channel(sample(tex["T_RockyGround_AO"], top_uv, "mask"), "mask"), top_w)

    # Macro variation breaks the tiling over the big terraces.
    macro = node(unreal.MaterialExpressionNoise, scale=1.0 / MACRO_CM, levels=2, output_min=0.8, output_max=1.15, quality=1)
    connect(world, "", macro, "")
    # Palette tint: lerp(1, Color * 1.8, ScanTint); inversion darkens, as in M_PrimordiaLayer.
    tint = lerp(node(unreal.MaterialExpressionConstant3Vector, -1100, constant=unreal.LinearColor(1, 1, 1, 1)), op(unreal.MaterialExpressionMultiply, color, k=1.8), tint_amount)
    base = op(unreal.MaterialExpressionMultiply, op(unreal.MaterialExpressionMultiply, albedo, tint), op(unreal.MaterialExpressionMultiply, macro, ao))
    base = op(unreal.MaterialExpressionMultiply, base, unary(unreal.MaterialExpressionOneMinus, op(unreal.MaterialExpressionMultiply, inversion, k=0.5)))
    base = op(unreal.MaterialExpressionMultiply, base, brightness)
    MEL.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)
    MEL.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)
    MEL.connect_material_property(normal, "", unreal.MaterialProperty.MP_NORMAL)
    MEL.recompile_material(m)
    if not unreal.EditorAssetLibrary.save_asset(MATERIAL, only_if_is_dirty=False):
        raise RuntimeError(f"could not save {MATERIAL}")
    log(f"built {MATERIAL}")


def soft(path):
    need(path)
    name = path.rsplit("/", 1)[-1]
    return f'"{path}.{name}"'


def tier(meshes, fit, turns=0, cull=0.0, own=True):
    return (f"(Meshes=({','.join(soft(p) for p in meshes)}),Fit={fit},QuarterTurns={turns},"
            f"bUseMeshMaterials={own},CullDistance={cull:.1f})")


def write_config():
    crystals = [f"{SCANS}/CrystalClusterSet/CrystalCluster_0{i}_Crystals" for i in (1, 2, 3)]
    shards = [f"{SCANS}/CrystalClusterSet/CrystalCluster_0{i}_GroundShards" for i in (1, 2, 3)]
    art = (
        '(("ground",(Hero=' + tier([f"{SCANS}/ForestCliffLarge/ForestCliffLarge"], "Stretch", 1)
        + ',Detail=' + tier([f"{SCANS}/BeachRockFormation/BeachRockFormation", f"{SCANS}/TundraFormation/TundraFormation"], "Uniform") + ')),'
        # The crystals' own glass materials use glTF transmission, which renders near black with the
        # iGPU settings (no translucency volume): the spires take the layer material (palette, tip glow).
        + '("spire_field",(Hero=' + tier(crystals, "Stretch", own=False) + ',Detail=' + tier(shards, "Uniform", own=False) + ')))'
    )
    ini = os.path.join(unreal.Paths.project_config_dir(), "DefaultGame.ini")
    with open(ini, encoding="utf-8") as f:
        text = f.read()
    section = "[/Script/PrimordiaOSRealmBridge.PrimordiaBridgeSettings]"
    if section not in text:
        text += f"\n{section}\n"
    head, rest = text.split(section, 1)
    body, sep, tail = rest.partition("\n[")
    lines = [l for l in body.split("\n") if not l.startswith(("LayerArt=", "; Fab scans for the live realm"))]
    body = "\n".join(lines)
    ground_mat = f'("ground", "{MATERIAL}.M_PrimordiaGroundScan")'
    if "LayerMaterials=" in body:
        body = re.sub(r'\("ground", "[^"]*"\)', ground_mat, body, count=1)
    body = body.rstrip("\n") + "\n; Fab scans for the live realm (Scripts/build_realm_scans.py)\nLayerArt=" + art + "\n"
    with open(ini, "w", encoding="utf-8") as f:
        f.write(head + section + body + (sep + tail if sep else ""))
    log(f"wrote LayerArt and the ground material to {ini}")


build_ground_material()
write_config()
