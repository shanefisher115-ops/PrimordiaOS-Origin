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

# Per-kind look (MATERIALS_AND_NIAGARA.md §7c): emissive gain, metallic, base roughness.
KINDS = {
    "ground":      (0.15, 0.0, 0.70),
    "ocean":       (0.30, 0.1, 0.15),
    "sky":         (8.00, 0.0, 1.00),
    "ring":        (0.80, 0.7, 0.35),
    "lattice":     (1.50, 0.8, 0.25),
    "spire_field": (0.60, 0.6, 0.35),
    "void":        (0.05, 0.0, 0.90),
}


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
    cd = [node(unreal.MaterialExpressionPerInstanceCustomData, -900, data_index=i) for i in range(4)]
    seed, size, _radial, special = cd

    # Base colour: secondary -> primary by size and the stable random; inversion darkens.
    t = unary(unreal.MaterialExpressionSaturate, add(add(mul(size, k=0.5), k=0.2), mul(seed, k=0.3)))
    lerp = node(unreal.MaterialExpressionLinearInterpolate)
    connect(secondary, "", lerp, "A")
    connect(color, "", lerp, "B")
    connect(t, "", lerp, "Alpha")
    base = mul(lerp, unary(unreal.MaterialExpressionOneMinus, mul(inversion, k=0.5)))
    MEL.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)

    # Emissive: crowns, circle stones, band stars and big pieces glow with coherence and light;
    # entropy makes the glow flicker per instance (an emissive effect, so no shadow invalidation).
    glow = mul(mul(add(add(mul(mul(special, coherence), k=2.0), size), k=0.15), luminosity), gain)
    time = node(unreal.MaterialExpressionTime)
    phase = add(mul(time, add(mul(seed, k=6.0), k=2.0)), mul(seed, k=40.0))
    flicker = add(mul(mul(unary(unreal.MaterialExpressionSine, phase), entropy), k=0.5), k=1.0)
    emissive = mul(mul(color, essence), mul(glow, flicker))
    MEL.connect_material_property(emissive, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)

    MEL.connect_material_property(unary(unreal.MaterialExpressionSaturate, add(roughness, mul(seed, k=0.3))), "", unreal.MaterialProperty.MP_ROUGHNESS)
    MEL.connect_material_property(metallic, "", unreal.MaterialProperty.MP_METALLIC)

    MEL.recompile_material(m)
    if not unreal.EditorAssetLibrary.save_asset(ASSET, only_if_is_dirty=False):
        raise RuntimeError(f"could not save {ASSET}")
    unreal.log(f"PrimordiaLayer: built {ASSET}")
    return m


def build_instances(parent):
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    entries = []
    for kind, (gain, metal, rough) in KINDS.items():
        name = f"MI_PrimordiaLayer_{kind}"
        path = f"{PACKAGE_DIR}/{name}"
        mi = unreal.load_asset(path)
        if not mi:
            mi = tools.create_asset(name, PACKAGE_DIR, unreal.MaterialInstanceConstant, unreal.MaterialInstanceConstantFactoryNew())
        MEL.set_material_instance_parent(mi, parent)
        MEL.set_material_instance_scalar_parameter_value(mi, "EmissiveGain", gain)
        MEL.set_material_instance_scalar_parameter_value(mi, "Metallic", metal)
        MEL.set_material_instance_scalar_parameter_value(mi, "RoughnessBase", rough)
        MEL.update_material_instance(mi)
        if not unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False):
            raise RuntimeError(f"could not save {path}")
        entries.append(f'("{kind}", "{path}.{name}")')
    unreal.log("PrimordiaLayer: DefaultGame.ini [/Script/PrimordiaOSRealmBridge.PrimordiaBridgeSettings]")
    unreal.log("PrimordiaLayer: LayerMaterials=(" + ",".join(entries) + ")")


build_instances(build())
