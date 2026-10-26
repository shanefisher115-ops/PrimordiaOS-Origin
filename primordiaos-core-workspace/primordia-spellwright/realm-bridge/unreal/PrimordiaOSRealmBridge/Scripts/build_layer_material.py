"""Builds /PrimordiaOSRealmBridge/Materials/M_PrimordiaLayer and one instance per layer kind
(MI_PrimordiaLayer_<kind>), following docs/MATERIALS_AND_NIAGARA.md §7.

The graph reads only what the generator already sets on every layer MID (Color,
SecondaryColor, Entropy, Luminosity, Coherence, Inversion, Essence) plus the four
PerInstanceCustomData floats every tier instance carries, so metaphysics react on the GPU
at no CPU cost. It has no World Position Offset on purpose: WPO on shadow-casting
instances makes virtual shadow maps re-render their pages every frame.

Run from a project that has the plugin and the Python Editor Script Plugin enabled:

    UnrealEditor-Cmd.exe <Project>.uproject -run=pythonscript -script="<plugin>/Scripts/build_layer_material.py"

Then wire the instances in Project Settings > PrimordiaOS Realm Bridge > Assets > Realm >
Layer Materials (or DefaultGame.ini, see the end of this file's log output).
Re-running rebuilds the graph in place, so instances and references survive.
"""

import unreal

PACKAGE_DIR = "/PrimordiaOSRealmBridge/Materials"
NAME = "M_PrimordiaLayer"
ASSET = f"{PACKAGE_DIR}/{NAME}"

MEL = unreal.MaterialEditingLibrary

# Per-kind look (MATERIALS_AND_NIAGARA.md §7c): emissive gain, metallic, base roughness,
# then the surface terms: macro variation (world-space noise on albedo and roughness), side
# tint (cliff faces lean to the secondary colour and darken), height shade (an instance is
# darker at its foot than its top, a cheap stand-in for occlusion that Lumen-off iGPU
# settings don't give) and tip glow (the top of an instance glows in the realm's essence).
# Rim and contact replace what SSR and SSAO gave (both are off in live play on the iGPU):
# rim = emissive Fresnel edge in the essence (glassy crystal, lit orbit metal), contact = cliff
# faces darken just above the terrace below them.
KINDS = {
    #               gain  metal rough  macro side  shade  tip  rim  contact
    "ground":      (0.15, 0.0, 0.70,  0.35, 0.65, 0.45, 0.0, 0.0, 0.35),
    "ocean":       (0.30, 0.1, 0.15,  0.20, 0.00, 0.00, 0.0, 0.4, 0.0),
    "sky":         (8.00, 0.0, 1.00,  0.00, 0.00, 0.00, 0.0, 0.0, 0.0),
    "ring":        (0.80, 0.7, 0.35,  0.10, 0.00, 0.00, 0.0, 0.8, 0.0),
    "lattice":     (1.50, 0.8, 0.25,  0.10, 0.00, 0.00, 0.0, 0.8, 0.0),
    "spire_field": (0.60, 0.6, 0.35,  0.15, 0.00, 0.65, 4.0, 1.5, 0.0),
    "void":        (0.05, 0.0, 0.90,  0.00, 0.00, 0.00, 0.0, 0.6, 0.0),
}
# Terrace step height, as PrimordiaRealmComposition.cpp computes it: 150 cm x (0.5 + roughness).
CONTACT_HEIGHT_CM = 60.0
# World-space size of the macro variation, cm (two octaves: this and a fifth of it).
MACRO_SCALE_CM = 2400.0


def connect(src, src_out, dst, dst_in):
    if not MEL.connect_material_expressions(src, src_out, dst, dst_in):
        raise RuntimeError(f"could not connect {src.get_name()}.{src_out!r} -> {dst.get_name()}.{dst_in!r}")


def load_or_create():
    # Load by path: in a commandlet the asset registry may not have scanned plugin content yet.
    material = unreal.load_asset(ASSET)
    if material:
        MEL.delete_all_material_expressions(material)
        return material
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    return tools.create_asset(NAME, PACKAGE_DIR, unreal.Material, unreal.MaterialFactoryNew())


def build():
    m = load_or_create()
    m.set_editor_property("blend_mode", unreal.BlendMode.BLEND_OPAQUE)
    m.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_DEFAULT_LIT)
    m.set_editor_property("used_with_instanced_static_meshes", True)

    y = -1200
    def place():
        nonlocal y
        y += 110
        return y

    def node(cls, x=-400, **props):
        e = MEL.create_material_expression(m, cls, x, place())
        for k, v in props.items():
            e.set_editor_property(k, v)
        return e

    def scalar(name, default):
        return node(unreal.MaterialExpressionScalarParameter, -900, parameter_name=name, default_value=default)

    def vector(name, default):
        return node(unreal.MaterialExpressionVectorParameter, -900, parameter_name=name, default_value=default)

    def op(cls, a, b=None, const_b=None, a_out="", b_out=""):
        e = node(cls)
        connect(a, a_out, e, "A")
        if b is not None:
            connect(b, b_out, e, "B")
        elif const_b is not None:
            e.set_editor_property("const_b", const_b)
        return e

    def mul(a, b=None, k=None): return op(unreal.MaterialExpressionMultiply, a, b, k)
    def add(a, b=None, k=None): return op(unreal.MaterialExpressionAdd, a, b, k)
    def unary(cls, a):
        e = node(cls)
        connect(a, "", e, "")
        return e

    # Inputs: the layer MID parameters and the tier instance's custom data (§7b).
    color = vector("Color", unreal.LinearColor(0.5, 0.5, 0.55, 1.0))
    secondary = vector("SecondaryColor", unreal.LinearColor(0.05, 0.05, 0.08, 1.0))
    essence = vector("Essence", unreal.LinearColor(1.0, 0.42, 0.28, 1.0))
    luminosity = scalar("Luminosity", 0.7)
    coherence = scalar("Coherence", 0.6)
    inversion = scalar("Inversion", 0.2)
    entropy = scalar("Entropy", 0.35)
    gain = scalar("EmissiveGain", 0.3)
    metallic = scalar("Metallic", 0.1)
    roughness = scalar("RoughnessBase", 0.55)
    macro_amount = scalar("MacroVariation", 0.0)
    side_tint = scalar("SideTint", 0.0)
    height_shade = scalar("HeightShade", 0.0)
    tip_glow = scalar("TipGlow", 0.0)
    cd = [node(unreal.MaterialExpressionPerInstanceCustomData, -900, data_index=i) for i in range(4)]
    seed, size, _radial, special = cd

    def lerp3(a, b, alpha):
        e = node(unreal.MaterialExpressionLinearInterpolate)
        connect(a, "", e, "A")
        connect(b, "", e, "B")
        connect(alpha, "", e, "Alpha")
        return e

    def noise(scale_cm):
        # 0..1 simplex noise over world position, two levels; tiling off.
        return node(unreal.MaterialExpressionNoise, scale=1.0 / scale_cm, levels=2, output_min=0.0, output_max=1.0,
                    quality=1, turbulence=False)

    # Surface terms. The macro noise breaks up the flat discs; n is centred on 0.
    world = node(unreal.MaterialExpressionWorldPosition, -900)
    n_big = noise(MACRO_SCALE_CM)
    n_small = noise(MACRO_SCALE_CM / 5.0)
    connect(world, "", n_big, "")
    connect(world, "", n_small, "")
    n = add(add(mul(n_big, k=0.7), mul(n_small, k=0.3)), k=-0.5)
    # Height along the instance (0 at its foot, 1 at its top): the engine shapes span -50..50 cm
    # in their own space, and instance space undoes each instance's scale and lean.
    local = node(unreal.MaterialExpressionTransformPosition, transform_source_type=unreal.MaterialPositionTransformSource.TRANSFORMPOSSOURCE_WORLD,
                 transform_type=unreal.MaterialPositionTransformSource.TRANSFORMPOSSOURCE_INSTANCE)
    connect(world, "", local, "")
    local_z = node(unreal.MaterialExpressionComponentMask, r=False, g=False, b=True, a=False)
    connect(local, "", local_z, "")
    h01 = unary(unreal.MaterialExpressionSaturate, add(mul(local_z, k=0.01), k=0.5))
    # Faces that point up (terrace tops) vs. cliff faces.
    normal = node(unreal.MaterialExpressionVertexNormalWS, -900)
    normal_z = node(unreal.MaterialExpressionComponentMask, r=False, g=False, b=True, a=False)
    connect(normal, "", normal_z, "")
    top = unary(unreal.MaterialExpressionSaturate, mul(add(normal_z, k=-0.55), k=4.0))

    # Base colour: secondary -> primary by size, the stable random and the macro noise; cliff
    # faces lean back to the secondary colour; the foot of an instance is darker; inversion darkens.
    t = unary(unreal.MaterialExpressionSaturate, add(add(add(mul(size, k=0.5), k=0.2), mul(seed, k=0.3)), mul(n, macro_amount)))
    albedo = lerp3(secondary, color, t)
    side = mul(lerp3(albedo, secondary, side_tint), unary(unreal.MaterialExpressionOneMinus, mul(side_tint, k=0.35)))
    albedo = lerp3(side, albedo, add(mul(top, side_tint), unary(unreal.MaterialExpressionOneMinus, side_tint)))
    albedo = mul(albedo, add(mul(n, mul(macro_amount, k=0.8)), k=1.0))
    foot = unary(unreal.MaterialExpressionOneMinus, mul(height_shade, unary(unreal.MaterialExpressionOneMinus, unary(unreal.MaterialExpressionSquareRoot, h01))))
    # Contact shade on cliff faces: height above the terrace top below, from the layer's own
    # "roughness" param (the generator's step formula), darkened over the first 60 cm.
    contact = scalar("ContactShade", 0.0)
    step = mul(add(unary(unreal.MaterialExpressionSaturate, scalar("roughness", 0.5)), k=0.5), k=150.0)
    # Frac of the large-world (double) position broke the instanced permutations: truncate to float
    # first (exact enough: realms sit near the origin).
    world_f = node(unreal.MaterialExpressionTruncateLWC, -900)
    connect(world, "", world_f, "")
    wz = node(unreal.MaterialExpressionComponentMask, r=False, g=False, b=True, a=False)
    connect(world_f, "", wz, "")
    above = mul(unary(unreal.MaterialExpressionFrac, op(unreal.MaterialExpressionDivide, wz, step)), step)
    near_foot = unary(unreal.MaterialExpressionOneMinus, unary(unreal.MaterialExpressionSaturate, mul(above, k=1.0 / CONTACT_HEIGHT_CM)))
    cliff = unary(unreal.MaterialExpressionOneMinus, top)
    contact_dark = unary(unreal.MaterialExpressionOneMinus, mul(mul(near_foot, cliff), contact))
    base = mul(mul(mul(albedo, foot), contact_dark), unary(unreal.MaterialExpressionOneMinus, mul(inversion, k=0.5)))
    MEL.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    # Emissive: crowns, circle stones, band stars and big pieces glow with coherence and light;
    # entropy makes the glow flicker per instance (an emissive effect, so no shadow invalidation).
    glow = mul(mul(add(add(mul(mul(special, coherence), k=2.0), size), k=0.15), luminosity), gain)
    time = node(unreal.MaterialExpressionTime)
    phase = add(mul(time, add(mul(seed, k=6.0), k=2.0)), mul(seed, k=40.0))
    flicker = add(mul(mul(unary(unreal.MaterialExpressionSine, phase), entropy), k=0.5), k=1.0)
    emissive = mul(mul(color, essence), mul(glow, flicker))
    # Tip glow: the top tenth of an instance burns in the essence (spire crowns light up).
    h2 = mul(h01, h01)
    tip = mul(mul(mul(mul(h2, h2), h2), tip_glow), luminosity)
    emissive = add(emissive, mul(mul(add(color, essence), k=0.5), mul(tip, flicker)))
    # Rim: an emissive Fresnel edge in the essence, scaled by light (stands in for reflections).
    fresnel = node(unreal.MaterialExpressionFresnel, exponent=4.0, base_reflect_fraction=0.0)
    rim = mul(mul(fresnel, scalar("RimGlow", 0.0)), luminosity)
    emissive = add(emissive, mul(mul(add(color, essence), k=0.5), rim))
    MEL.connect_material_property(emissive, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)

    rough = add(add(roughness, mul(seed, k=0.3)), mul(n, mul(macro_amount, k=0.6)))
    MEL.connect_material_property(unary(unreal.MaterialExpressionSaturate, rough), "", unreal.MaterialProperty.MP_ROUGHNESS)
    MEL.connect_material_property(metallic, "", unreal.MaterialProperty.MP_METALLIC)

    MEL.recompile_material(m)
    if not unreal.EditorAssetLibrary.save_asset(ASSET, only_if_is_dirty=False):
        raise RuntimeError(f"could not save {ASSET}")
    unreal.log(f"PrimordiaLayer: built {ASSET}")
    return m


def build_instances(parent):
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    entries = []
    for kind, (gain, metal, rough, macro, side, shade, tip, rim, contact) in KINDS.items():
        name = f"MI_PrimordiaLayer_{kind}"
        path = f"{PACKAGE_DIR}/{name}"
        mi = unreal.load_asset(path)
        if not mi:
            mi = tools.create_asset(name, PACKAGE_DIR, unreal.MaterialInstanceConstant, unreal.MaterialInstanceConstantFactoryNew())
        MEL.set_material_instance_parent(mi, parent)
        MEL.set_material_instance_scalar_parameter_value(mi, "EmissiveGain", gain)
        MEL.set_material_instance_scalar_parameter_value(mi, "Metallic", metal)
        MEL.set_material_instance_scalar_parameter_value(mi, "RoughnessBase", rough)
        MEL.set_material_instance_scalar_parameter_value(mi, "MacroVariation", macro)
        MEL.set_material_instance_scalar_parameter_value(mi, "SideTint", side)
        MEL.set_material_instance_scalar_parameter_value(mi, "HeightShade", shade)
        MEL.set_material_instance_scalar_parameter_value(mi, "TipGlow", tip)
        MEL.set_material_instance_scalar_parameter_value(mi, "RimGlow", rim)
        MEL.set_material_instance_scalar_parameter_value(mi, "ContactShade", contact)
        MEL.update_material_instance(mi)
        if not unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False):
            raise RuntimeError(f"could not save {path}")
        entries.append(f'("{kind}", "{path}.{name}")')
    unreal.log("PrimordiaLayer: DefaultGame.ini [/Script/PrimordiaOSRealmBridge.PrimordiaBridgeSettings]")
    unreal.log("PrimordiaLayer: LayerMaterials=(" + ",".join(entries) + ")")


build_instances(build())
