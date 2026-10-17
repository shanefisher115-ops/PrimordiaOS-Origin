"""Builds /PrimordiaOSRealmBridge/Materials/M_PrimordiaSigilVolume.

The material is a thin wrapper: it computes the view ray in the glyph cube's local
space and hands everything to PrimordiaSigilVolume() in
Shaders/Private/PrimordiaSigil.ush, where the glyph is raymarched.

Run from a project that has the plugin and the Python Editor Script Plugin enabled:

    UnrealEditor-Cmd.exe <Project>.uproject -run=pythonscript -script="<plugin>/Scripts/build_sigil_material.py"

Re-running rebuilds the graph in place, so instances and references survive.
"""

import unreal

PACKAGE_DIR = "/PrimordiaOSRealmBridge/Materials"
NAME = "M_PrimordiaSigilVolume"
ASSET = f"{PACKAGE_DIR}/{NAME}"
INCLUDE = "/Plugin/PrimordiaOSRealmBridge/Private/PrimordiaSigil.ush"

MEL = unreal.MaterialEditingLibrary

# (name, default) in the order PrimordiaSigilVolume() takes them.
SCALARS_GLYPH = [("GlyphKind", 1.0), ("Symmetry", 6.0), ("Complexity", 0.5), ("Unity", 0.5), ("Spin", 0.0), ("Hue", 0.6),
                 ("SigilSeed", 0.0), ("SigilStrokes", 0.0)]
VECTORS_SCRIPT = [f"SigilPoints{i}" for i in range(6)]
SCALARS_META = [("Entropy", 0.35), ("Coherence", 0.6), ("Inversion", 0.2), ("Luminosity", 0.7), ("Resonance", 0.5), ("Lucidity", 0.55)]

CODE = """
float SceneDist = SceneDepth / max(dot(-CameraVectorWS, CameraForwardWS), 1e-4);
return PrimordiaSigilVolume(CameraLocal, -ViewLocal, SceneDist, FrontFace, Time,
    GlyphKind, Symmetry, Complexity, Unity, Spin, Hue, SigilSeed, SigilStrokes,
    SigilPoints0, SigilPoints1, SigilPoints2, SigilPoints3, SigilPoints4, SigilPoints5,
    Entropy, Coherence, Inversion, Luminosity, Resonance, Lucidity,
    Essence, RetireAlpha, Steps);
"""

CUSTOM_INPUTS = (["CameraLocal", "ViewLocal", "SceneDepth", "CameraVectorWS", "CameraForwardWS", "FrontFace", "Time"]
                 + [n for n, _ in SCALARS_GLYPH] + VECTORS_SCRIPT + [n for n, _ in SCALARS_META]
                 + ["Essence", "RetireAlpha", "Steps"])


def connect(src, src_out, dst, dst_in):
    if not MEL.connect_material_expressions(src, src_out, dst, dst_in):
        raise RuntimeError(f"could not connect {src.get_name()}.{src_out!r} -> {dst.get_name()}.{dst_in!r}")


def custom_input(name):
    i = unreal.CustomInput()
    i.set_editor_property("input_name", name)
    return i


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
    m.set_editor_property("blend_mode", unreal.BlendMode.BLEND_ALPHA_COMPOSITE)
    m.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    m.set_editor_property("two_sided", True)
    m.set_editor_property("output_translucent_velocity", False)

    custom = MEL.create_material_expression(m, unreal.MaterialExpressionCustom, 0, 0)
    custom.set_editor_property("description", "PrimordiaSigilVolume")
    custom.set_editor_property("output_type", unreal.CustomMaterialOutputType.CMOT_FLOAT4)
    custom.set_editor_property("include_file_paths", [INCLUDE])
    custom.set_editor_property("code", CODE)
    custom.set_editor_property("inputs", [custom_input(n) for n in CUSTOM_INPUTS])

    y = -1200
    def place():
        nonlocal y
        y += 90
        return y

    # View ray in the cube's local space (LWC-safe: the engine does the world -> local transform).
    cam = MEL.create_material_expression(m, unreal.MaterialExpressionCameraPositionWS, -900, place())
    cam_local = MEL.create_material_expression(m, unreal.MaterialExpressionTransformPosition, -600, y)
    cam_local.set_editor_property("transform_source_type", unreal.MaterialPositionTransformSource.TRANSFORMPOSSOURCE_WORLD)
    cam_local.set_editor_property("transform_type", unreal.MaterialPositionTransformSource.TRANSFORMPOSSOURCE_LOCAL)
    connect(cam, "", cam_local, "")
    connect(cam_local, "", custom, "CameraLocal")

    view_ws = MEL.create_material_expression(m, unreal.MaterialExpressionCameraVectorWS, -900, place())
    view_local = MEL.create_material_expression(m, unreal.MaterialExpressionTransform, -600, y)
    view_local.set_editor_property("transform_source_type", unreal.MaterialVectorCoordTransformSource.TRANSFORMSOURCE_WORLD)
    view_local.set_editor_property("transform_type", unreal.MaterialVectorCoordTransform.TRANSFORM_LOCAL)
    connect(view_ws, "", view_local, "")
    connect(view_local, "", custom, "ViewLocal")
    connect(view_ws, "", custom, "CameraVectorWS")

    forward = MEL.create_material_expression(m, unreal.MaterialExpressionConstant3Vector, -900, place())
    forward.set_editor_property("constant", unreal.LinearColor(0.0, 0.0, 1.0, 0.0))
    forward_ws = MEL.create_material_expression(m, unreal.MaterialExpressionTransform, -600, y)
    forward_ws.set_editor_property("transform_source_type", unreal.MaterialVectorCoordTransformSource.TRANSFORMSOURCE_VIEW)
    forward_ws.set_editor_property("transform_type", unreal.MaterialVectorCoordTransform.TRANSFORM_WORLD)
    connect(forward, "", forward_ws, "")
    connect(forward_ws, "", custom, "CameraForwardWS")

    depth = MEL.create_material_expression(m, unreal.MaterialExpressionSceneDepth, -600, place())
    connect(depth, "", custom, "SceneDepth")
    side = MEL.create_material_expression(m, unreal.MaterialExpressionTwoSidedSign, -600, place())
    connect(side, "", custom, "FrontFace")
    time = MEL.create_material_expression(m, unreal.MaterialExpressionTime, -600, place())
    connect(time, "", custom, "Time")

    def scalar(name, default):
        e = MEL.create_material_expression(m, unreal.MaterialExpressionScalarParameter, -600, place())
        e.set_editor_property("parameter_name", name)
        e.set_editor_property("default_value", default)
        connect(e, "", custom, name)

    def vector(name, default):
        e = MEL.create_material_expression(m, unreal.MaterialExpressionVectorParameter, -600, place())
        e.set_editor_property("parameter_name", name)
        e.set_editor_property("default_value", default)
        return e

    for name, default in SCALARS_GLYPH:
        scalar(name, default)
    for name in VECTORS_SCRIPT:
        # Two wheel points per vector, so all four channels are needed: RGB appended with A.
        v = vector(name, unreal.LinearColor(0, 0, 0, 0))
        rgba = MEL.create_material_expression(m, unreal.MaterialExpressionAppendVector, -300, y)
        connect(v, "", rgba, "A")
        connect(v, "A", rgba, "B")
        connect(rgba, "", custom, name)
    for name, default in SCALARS_META:
        scalar(name, default)
    connect(vector("Essence", unreal.LinearColor(1.0, 0.42, 0.28, 1.0)), "", custom, "Essence")
    scalar("RetireAlpha", 1.0)
    scalar("Steps", 48.0)

    rgb = MEL.create_material_expression(m, unreal.MaterialExpressionComponentMask, 300, -60)
    for c in ("r", "g", "b"):
        rgb.set_editor_property(c, True)
    alpha = MEL.create_material_expression(m, unreal.MaterialExpressionComponentMask, 300, 60)
    alpha.set_editor_property("a", True)
    connect(custom, "", rgb, "")
    connect(custom, "", alpha, "")
    MEL.connect_material_property(rgb, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    MEL.connect_material_property(alpha, "", unreal.MaterialProperty.MP_OPACITY)

    MEL.recompile_material(m)
    if not unreal.EditorAssetLibrary.save_asset(ASSET, only_if_is_dirty=False):
        raise RuntimeError(f"could not save {ASSET}")
    unreal.log(f"PrimordiaSigil: built {ASSET}")


build()
