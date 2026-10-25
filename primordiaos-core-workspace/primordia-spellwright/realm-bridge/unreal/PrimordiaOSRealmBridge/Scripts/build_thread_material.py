"""Builds /PrimordiaOSRealmBridge/Materials/M_PrimordiaThreadGlow.

AFateWeaveActor's built-in thread renderer (used while no NS_PrimordiaFateWeave is
assigned) draws every thread as tube segments of one instanced static mesh. This
material lights each instance from its custom data: PerInstanceCustomData 0..2 =
thread colour, already multiplied by the thread's fade. Unlit and opaque, so a
whole loom is one draw call and bloom does the glowing.

Run like build_sigil_material.py:
    UnrealEditor-Cmd.exe <Project>.uproject -run=pythonscript -script="<plugin>/Scripts/build_thread_material.py"
"""

import unreal

PACKAGE_DIR = "/PrimordiaOSRealmBridge/Materials"
NAME = "M_PrimordiaThreadGlow"
ASSET = f"{PACKAGE_DIR}/{NAME}"

MEL = unreal.MaterialEditingLibrary


def connect(src, src_out, dst, dst_in):
    if not MEL.connect_material_expressions(src, src_out, dst, dst_in):
        raise RuntimeError(f"could not connect {src.get_name()}.{src_out!r} -> {dst.get_name()}.{dst_in!r}")


def load_or_create():
    material = unreal.load_asset(ASSET)
    if material:
        MEL.delete_all_material_expressions(material)
        return material
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    return tools.create_asset(NAME, PACKAGE_DIR, unreal.Material, unreal.MaterialFactoryNew())


def build():
    m = load_or_create()
    m.set_editor_property("blend_mode", unreal.BlendMode.BLEND_OPAQUE)
    m.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    m.set_editor_property("used_with_instanced_static_meshes", True)

    channels = []
    for i in range(3):
        e = MEL.create_material_expression(m, unreal.MaterialExpressionPerInstanceCustomData, -700, -120 + i * 120)
        e.set_editor_property("data_index", i)
        channels.append(e)
    rg = MEL.create_material_expression(m, unreal.MaterialExpressionAppendVector, -450, -60)
    connect(channels[0], "", rg, "A")
    connect(channels[1], "", rg, "B")
    rgb = MEL.create_material_expression(m, unreal.MaterialExpressionAppendVector, -300, 0)
    connect(rg, "", rgb, "A")
    connect(channels[2], "", rgb, "B")

    intensity = MEL.create_material_expression(m, unreal.MaterialExpressionScalarParameter, -300, 140)
    intensity.set_editor_property("parameter_name", "Intensity")
    intensity.set_editor_property("default_value", 3.0)
    glow = MEL.create_material_expression(m, unreal.MaterialExpressionMultiply, -100, 40)
    connect(rgb, "", glow, "A")
    connect(intensity, "", glow, "B")
    MEL.connect_material_property(glow, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)

    MEL.recompile_material(m)
    if not unreal.EditorAssetLibrary.save_asset(ASSET, only_if_is_dirty=False):
        raise RuntimeError(f"could not save {ASSET}")
    unreal.log(f"PrimordiaThread: built {ASSET}")


build()
