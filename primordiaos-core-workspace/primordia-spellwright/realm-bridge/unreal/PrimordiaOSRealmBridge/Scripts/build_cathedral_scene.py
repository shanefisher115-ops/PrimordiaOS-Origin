"""Builds the Neo-Gothic cathedral look-dev scene: /PrimordiaOSRealmBridge/Maps/NeoGothicCathedral
and the materials it uses, in /PrimordiaOSRealmBridge/Cathedral/.

The look follows docs/MATERIALS_AND_NIAGARA.md §9: a low-key night (indigo sky light, dim
moon, volumetric fog), cyan and magenta windows lit from rect lights, warm orange glow at
the base and on the horizon, narrow spot lights for god rays, and glowing rings over the
spires. The post process uses manual exposure, so the rings cannot change the exposure of
everything else.

  M_CathedralStone   (+ MI_CathedralStone)    dark wet stone; roughness from world-space noise.
                                              Put a Fab/Megascans albedo in StoneAlbedo on the MI.
  M_CathedralWindow  (+ MI_..._Cyan/_Magenta/_Rose)
                                              unlit glass with procedural lead lines. GlobalEmissive
                                              on the parent drives every window instance at once.
  M_CathedralRing    (+ MI_CathedralRing)     additive concentric rings drawn in the shader on a
                                              flat plane: streaks flow around each ring, and the
                                              radius wobbles so the rings seem to vibrate.

The building is a blockout made from engine basic shapes, in the Cathedral/Blockout outliner
folder, ready to be swapped for a Nanite kit. The rings are shader planes, not Niagara,
because Python cannot author Niagara emitters. §9 has the Niagara ribbon recipe for when you
want particle rings.

Run from a project that has the plugin and the Python Editor Script Plugin enabled:

    UnrealEditor-Cmd.exe <Project>.uproject -run=pythonscript -script="<plugin>/Scripts/build_cathedral_scene.py"

Re-running rebuilds the material graphs in place and repopulates the map.
"""

import math

import unreal

PACKAGE_DIR = "/PrimordiaOSRealmBridge/Cathedral"
MAP = "/PrimordiaOSRealmBridge/Maps/NeoGothicCathedral"

MEL = unreal.MaterialEditingLibrary
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()

CUBE = "/Engine/BasicShapes/Cube"
CONE = "/Engine/BasicShapes/Cone"
PLANE = "/Engine/BasicShapes/Plane"

# Optional real architecture: if this mesh exists in the project it replaces the blockout.
# The free "Gothic Revival Church - White - 3D Model" by EFADKZ on Fab (CC BY 4.0) fits; import its
# FBX here as a static Nanite mesh (see docs §9). Its twin-tower facade faces -Y in model space.
CHURCH_MESH = "/Game/ThirdParty/GothicRevivalChurch/SM_GothicRevivalChurch"
CHURCH_TEXTURE = "/Game/ThirdParty/GothicRevivalChurch/T_Church_Diffuse"  # optional: carved detail + window glow
# Optional surface maps (linear). Generated approximations work; the model's own maps drop in under the same names.
CHURCH_NORMAL = "/Game/ThirdParty/GothicRevivalChurch/T_Church_Normal"
CHURCH_ROUGHNESS = "/Game/ThirdParty/GothicRevivalChurch/T_Church_Roughness"
CHURCH_SCALE = 3.0
# Tower tops in model space (cm), measured from the mesh with the realm look-dev skill's
# measure_mesh_tops.py: (x range, y range), both ending at z 2919. (The mesh's highest point, 3024,
# is a pinnacle at the back.) The model's towers end in open belfries, so the script caps each with a spire.
CHURCH_TOWERS = (((-799, -149), (-1198, -520)), ((124, 785), (-1198, -520)))
CHURCH_TOWER_TOP = 2919
# Distant copies of the church form a Gothic city skyline: (x m, y m, yaw deg, scale). They sit in the
# frame's left and right edges as seen from the hero camera, clear of the hero church, 150-350 m out.
CITY = ((50, -103, 35, 1.4), (111, -110, 70, 1.8), (214, -118, 120, 1.6),
        (46, 134, 300, 1.5), (73, 214, 250, 1.9), (130, 206, 210, 1.4))
CITY_WINDOW = unreal.LinearColor(1.0, 0.48, 0.14, 1.0)  # amber city light, like the reference's streets

CYAN = unreal.LinearColor(0.04, 0.50, 1.00, 1.0)
MAGENTA = unreal.LinearColor(0.85, 0.15, 1.00, 1.0)
ROSE = unreal.LinearColor(1.00, 0.25, 0.55, 1.0)
WARM = unreal.LinearColor(1.00, 0.42, 0.12, 1.0)

# Exposure is manual with physical camera exposure off, so the scene is scaled by
# 2^EXPOSURE_COMPENSATION and every intensity below is relative to it. With physical camera
# exposure on, multiply emissive values by about 40 (hence the ~50 in many look guides).
EXPOSURE_COMPENSATION = 1.0
GLOBAL_EMISSIVE = 0.35
# FFT bloom is costly and needs a kernel; standard bloom with a large size gets the haze.
CONVOLUTION_BLOOM = False


# ---------------------------------------------------------------- material helpers

def connect(src, src_out, dst, dst_in):
    if not MEL.connect_material_expressions(src, src_out, dst, dst_in):
        raise RuntimeError(f"could not connect {src.get_name()}.{src_out!r} -> {dst.get_name()}.{dst_in!r}")


def custom_input(name):
    i = unreal.CustomInput()
    i.set_editor_property("input_name", name)
    return i


def load_or_create(cls, name, factory):
    path = f"{PACKAGE_DIR}/{name}"
    asset = unreal.load_asset(path)
    if asset:
        if cls is unreal.Material:
            MEL.delete_all_material_expressions(asset)
        return asset
    return TOOLS.create_asset(name, PACKAGE_DIR, cls, factory)


def new_material(name):
    return load_or_create(unreal.Material, name, unreal.MaterialFactoryNew())


def save(asset):
    path = asset.get_path_name().split(".")[0]
    if not unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False):
        raise RuntimeError(f"could not save {path}")


def finish(m):
    MEL.recompile_material(m)
    save(m)


def instance(parent, name, scalars=None, vectors=None, textures=None):
    mi = load_or_create(unreal.MaterialInstanceConstant, name, unreal.MaterialInstanceConstantFactoryNew())
    MEL.set_material_instance_parent(mi, parent)
    MEL.clear_all_material_instance_parameters(mi)
    for k, v in (scalars or {}).items():
        MEL.set_material_instance_scalar_parameter_value(mi, k, v)
    for k, v in (vectors or {}).items():
        MEL.set_material_instance_vector_parameter_value(mi, k, v)
    for k, v in (textures or {}).items():
        MEL.set_material_instance_texture_parameter_value(mi, k, v)
    MEL.update_material_instance(mi)
    save(mi)
    return mi


class Graph:
    """Places parameter nodes in a column and wires them into a Custom node."""

    def __init__(self, m, custom=None):
        self.m, self.custom, self.y = m, custom, -900

    def node(self, cls, x=-700):
        self.y += 90
        return MEL.create_material_expression(self.m, cls, x, self.y)

    def scalar(self, name, default, into=None):
        e = self.node(unreal.MaterialExpressionScalarParameter)
        e.set_editor_property("parameter_name", name)
        e.set_editor_property("default_value", default)
        if into is not False and self.custom:
            connect(e, "", self.custom, into or name)
        return e

    def vector(self, name, default, into=None):
        e = self.node(unreal.MaterialExpressionVectorParameter)
        e.set_editor_property("parameter_name", name)
        e.set_editor_property("default_value", default)
        if into is not False and self.custom:
            connect(e, "", self.custom, into or name)
        return e

    def feed(self, cls, into):
        e = self.node(cls)
        connect(e, "", self.custom, into)
        return e


def custom_node(m, description, code, inputs, output=unreal.CustomMaterialOutputType.CMOT_FLOAT3):
    c = MEL.create_material_expression(m, unreal.MaterialExpressionCustom, -200, 0)
    c.set_editor_property("description", description)
    c.set_editor_property("output_type", output)
    c.set_editor_property("code", code)
    c.set_editor_property("inputs", [custom_input(n) for n in inputs])
    return c


# ---------------------------------------------------------------- materials

def linear_white():
    """A tiny linear white mask texture: the neutral default for the stone's roughness map."""
    name = "T_CathedralLinearWhite"
    tex = unreal.load_asset(f"{PACKAGE_DIR}/{name}")
    if tex:
        return tex
    import os, struct, tempfile, zlib
    def chunk(t, b):
        return struct.pack(">I", len(b)) + t + b + struct.pack(">I", zlib.crc32(t + b) & 0xFFFFFFFF)
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 4, 4, 8, 0, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(b"\x00\xff\xff\xff\xff" * 4)) + chunk(b"IEND", b""))
    path = os.path.join(tempfile.gettempdir(), f"{name}.png")
    with open(path, "wb") as f:
        f.write(png)
    task = unreal.AssetImportTask()
    for k, v in (("filename", path), ("destination_path", PACKAGE_DIR), ("destination_name", name),
                 ("automated", True), ("replace_existing", True), ("save", False)):
        task.set_editor_property(k, v)
    TOOLS.import_asset_tasks([task])
    tex = unreal.load_asset(f"{PACKAGE_DIR}/{name}")
    tex.set_editor_property("srgb", False)
    tex.set_editor_property("compression_settings", unreal.TextureCompressionSettings.TC_MASKS)
    save(tex)
    return tex


def texture_param(g, name, texture, sampler):
    e = g.node(unreal.MaterialExpressionTextureSampleParameter2D, -900)
    e.set_editor_property("parameter_name", name)
    e.set_editor_property("texture", texture)
    e.set_editor_property("sampler_type", sampler)
    return e


def build_stone():
    m = new_material("M_CathedralStone")
    m.set_editor_property("blend_mode", unreal.BlendMode.BLEND_OPAQUE)
    m.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_DEFAULT_LIT)
    g = Graph(m)

    albedo = g.node(unreal.MaterialExpressionTextureSampleParameter2D, -900)
    albedo.set_editor_property("parameter_name", "StoneAlbedo")
    albedo.set_editor_property("texture", unreal.load_asset("/Engine/EngineResources/WhiteSquareTexture"))
    tint = g.vector("BaseColor", unreal.LinearColor(0.035, 0.037, 0.042, 1.0))
    base = g.node(unreal.MaterialExpressionMultiply, -500)
    connect(albedo, "RGB", base, "A")
    connect(tint, "", base, "B")

    # Wet patches: low-frequency world-space noise. Wet stone is darker and shinier.
    world = g.node(unreal.MaterialExpressionWorldPosition, -900)
    noise = g.node(unreal.MaterialExpressionNoise, -700)
    noise.set_editor_property("scale", 0.0005)
    noise.set_editor_property("levels", 4)
    noise.set_editor_property("output_min", 0.0)
    noise.set_editor_property("output_max", 1.0)
    connect(world, "", noise, "")
    wet = g.node(unreal.MaterialExpressionSaturate, -500)
    connect(noise, "", wet, "")

    # Surface maps: flat and neutral by default, so untextured surfaces keep the procedural look.
    normal = texture_param(g, "StoneNormal", unreal.load_asset("/Engine/EngineMaterials/DefaultNormal"),
                           unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL)
    rough_map = texture_param(g, "StoneRoughness", linear_white(), unreal.MaterialSamplerType.SAMPLERTYPE_MASKS)

    dry_rough = g.scalar("RoughnessDry", 0.80)
    dry = g.node(unreal.MaterialExpressionMultiply, -500)
    connect(rough_map, "R", dry, "A")
    connect(dry_rough, "", dry, "B")
    wet_rough = g.scalar("RoughnessWet", 0.2)
    rough = g.node(unreal.MaterialExpressionLinearInterpolate, -300)
    connect(dry, "", rough, "A")
    connect(wet_rough, "", rough, "B")
    connect(wet, "", rough, "Alpha")

    darken = g.scalar("WetDarkening", 0.85)
    wet_base = g.node(unreal.MaterialExpressionMultiply, -300)
    connect(base, "", wet_base, "A")
    connect(darken, "", wet_base, "B")
    color = g.node(unreal.MaterialExpressionLinearInterpolate, -100)
    connect(base, "", color, "A")
    connect(wet_base, "", color, "B")
    connect(wet, "", color, "Alpha")

    # Window glow, off by default (WindowEmissive 0). On a textured building, glass is the dark part
    # of the albedo; requiring a near-vertical surface keeps dark roofs from lighting up.
    glow = custom_node(m, "StoneWindowGlow", STONE_GLOW_CODE,
                       ["Albedo", "NormalWS", "WorldPos", "Time", "WindowEmissive", "WindowThreshold",
                        "WindowSoftness", "WindowVertical", "WindowColorA", "WindowColorB", "WindowColorMix", "LeadSize"])
    glow.set_editor_property("material_expression_editor_y", 400)
    gg = Graph(m, glow)
    gg.y = 300
    connect(albedo, "RGB", glow, "Albedo")
    gg.feed(unreal.MaterialExpressionVertexNormalWS, "NormalWS")
    connect(world, "", glow, "WorldPos")
    gg.feed(unreal.MaterialExpressionTime, "Time")
    gg.scalar("WindowEmissive", 0.0)
    gg.scalar("WindowThreshold", 0.22)
    gg.scalar("WindowSoftness", 0.08)
    gg.scalar("WindowVertical", 0.35)
    gg.vector("WindowColorA", CYAN)
    gg.vector("WindowColorB", MAGENTA)
    gg.scalar("WindowColorMix", 0.3)
    gg.scalar("LeadSize", 120.0)

    MEL.connect_material_property(color, "", unreal.MaterialProperty.MP_BASE_COLOR)
    MEL.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)
    MEL.connect_material_property(normal, "RGB", unreal.MaterialProperty.MP_NORMAL)
    MEL.connect_material_property(glow, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    finish(m)
    return m


STONE_GLOW_CODE = """
float lum = dot(Albedo, float3(0.299, 0.587, 0.114));
float glass = saturate((WindowThreshold - lum) / WindowSoftness);
float vertical = saturate((WindowVertical - abs(NormalWS.z)) / 0.1);
// Leaded panes: diamonds laid out across the wall (along the wall's horizontal tangent and up).
float2 t = normalize(float2(-NormalWS.y, NormalWS.x) + 1e-5);
float2 d = float2(dot(WorldPos.xy, t) + WorldPos.z, dot(WorldPos.xy, t) - WorldPos.z) / LeadSize;
float2 f = abs(frac(d) - 0.5);
float lead = smoothstep(0.42, 0.48, max(f.x, f.y));
float pane = frac(sin(dot(floor(d), float2(12.9898, 78.233))) * 43758.5453);
// One colour per 24 m column of the building, so a window (or a whole tower face) is a single colour.
float h = frac(sin(dot(floor(WorldPos.xy / 2400.0), float2(12.9898, 78.233))) * 43758.5453);
float3 col = (h < WindowColorMix) ? WindowColorB : WindowColorA;
float flicker = 0.92 + 0.08 * sin(Time * 1.3 + h * 40.0 + pane * 6.0);
return col * WindowEmissive * glass * vertical * (1.0 - lead) * lerp(0.5, 1.0, pane) * flicker;
"""


WINDOW_CODE = """
float2 p = float2(UV.y * 2.0 - 1.0, UV.x);   // x: -1..1 across, y: 0 bottom .. 1 top
float inside, lead, cell;
if (Rose > 0.5)
{
    float2 q = float2(p.x, p.y * 2.0 - 1.0);
    float r = length(q);
    float a = atan2(q.y, q.x);
    float petal = abs(sin(a * Petals * 0.5));
    inside = 1.0 - smoothstep(0.92, 0.95, r);
    float rings = min(abs(r - 0.28), abs(r - 0.62));
    lead = max(1.0 - smoothstep(0.0, 0.025, rings), (1.0 - smoothstep(0.0, 0.06, petal)) * step(0.28, r));
    lead = max(lead, 1.0 - smoothstep(0.0, 0.05, r));
    cell = frac(sin(floor(a * Petals / 6.2831853) * 12.9898 + floor(r * 3.0) * 78.233) * 43758.5453);
}
else
{
    // Lancet: straight sides, pointed arch above y = 0.62, one central mullion.
    float arch = 0.62 + 0.38 * pow(saturate(1.0 - abs(p.x)), 0.55);
    inside = step(abs(p.x), 0.9) * (1.0 - smoothstep(arch - 0.01, arch, p.y)) * step(0.02, p.y);
    float2 d = float2(p.x * 3.0 + p.y * 7.0, p.x * 3.0 - p.y * 7.0);
    float2 f = abs(frac(d) - 0.5);
    lead = max(1.0 - smoothstep(0.0, 0.05, abs(p.x)), smoothstep(0.42, 0.48, max(f.x, f.y)));
    cell = frac(sin(dot(floor(d), float2(12.9898, 78.233))) * 43758.5453);
}
float glass = inside * (1.0 - lead) * lerp(0.55, 1.0, cell);
float flicker = 0.92 + 0.08 * sin(Time * 1.7 + cell * 40.0) * sin(Time * 0.63 + cell * 17.0);
return WindowColor * GlobalEmissive * glass * flicker;
"""


def build_window():
    m = new_material("M_CathedralWindow")
    # Additive: outside the glass the window adds nothing, so the plane leaves no square on the wall
    # and the stone shows through the leading.
    m.set_editor_property("blend_mode", unreal.BlendMode.BLEND_ADDITIVE)
    m.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    m.set_editor_property("two_sided", True)
    c = custom_node(m, "CathedralWindow", WINDOW_CODE, ["UV", "Time", "WindowColor", "GlobalEmissive", "Rose", "Petals"])
    g = Graph(m, c)
    g.feed(unreal.MaterialExpressionTextureCoordinate, "UV")
    g.feed(unreal.MaterialExpressionTime, "Time")
    g.vector("WindowColor", CYAN)
    g.scalar("GlobalEmissive", GLOBAL_EMISSIVE)
    g.scalar("Rose", 0.0)
    g.scalar("Petals", 16.0)
    MEL.connect_material_property(c, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    finish(m)
    return m


RING_CODE = """
float2 p = UV * 2.0 - 1.0;
float r = length(p);
float a = atan2(p.y, p.x);
float t = Time * FlowSpeed;
float glow = 0.0;
for (int i = 0; i < 6; i++)
{
    if (i >= (int)RingCount) break;
    float fi = i;
    float dir = (i % 2 == 0) ? 1.0 : -1.0;
    float radius = RadiusOuter - fi * RingSpacing;
    // Integer angular frequencies keep the pattern seamless where atan2 wraps.
    float wobble = Wobble * (0.6 * sin(a * 3.0 + t * 1.7 + fi * 2.1) + 0.4 * sin(a * 7.0 - t * 2.3 + fi));
    float d = abs(r - radius - wobble);
    float core = exp(-(d * d) / (Width * Width));
    // Soft halo: a wide, faint gaussian around each line, so the rings sit in their own haze.
    float halo = exp(-(d * d) / (HaloWidth * HaloWidth)) * Halo;
    float u = a * floor(Streaks) + dir * t * (1.0 + fi * 0.35);
    float s = 0.5 + 0.5 * sin(u + 1.5 * sin(a * 3.0 - dir * t * 0.6 + fi * 1.3));
    s = lerp(1.0 - Breakup, 1.0, smoothstep(0.15, 0.85, s));
    glow += core * s + halo * (0.6 + 0.4 * s);
}
float edge = 1.0 - smoothstep(0.96, 1.0, r);
float3 c = lerp(RingColor, float3(1.0, 1.0, 1.0), saturate(glow - 0.8) * CoreWhite);
return c * glow * Intensity * edge;
"""


def build_ring():
    m = new_material("M_CathedralRing")
    m.set_editor_property("blend_mode", unreal.BlendMode.BLEND_ADDITIVE)
    m.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    m.set_editor_property("two_sided", True)
    inputs = ["UV", "Time", "RingColor", "Intensity", "RingCount", "RadiusOuter", "RingSpacing",
              "Width", "Wobble", "Streaks", "Breakup", "FlowSpeed", "CoreWhite", "Halo", "HaloWidth"]
    c = custom_node(m, "CathedralRings", RING_CODE, inputs)
    g = Graph(m, c)
    g.feed(unreal.MaterialExpressionTextureCoordinate, "UV")
    g.feed(unreal.MaterialExpressionTime, "Time")
    g.vector("RingColor", unreal.LinearColor(0.20, 0.80, 1.00, 1.0))
    g.scalar("Intensity", 4.0)
    g.scalar("RingCount", 5.0)
    g.scalar("RadiusOuter", 0.88)
    g.scalar("RingSpacing", 0.12)
    g.scalar("Width", 0.025)
    g.scalar("Wobble", 0.012)
    g.scalar("Streaks", 5.0)
    g.scalar("Breakup", 0.75)
    g.scalar("FlowSpeed", 0.6)
    g.scalar("CoreWhite", 0.6)
    g.scalar("Halo", 0.09)
    g.scalar("HaloWidth", 0.045)

    MEL.connect_material_property(c, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    finish(m)
    return m


# ---------------------------------------------------------------- level helpers

ACTORS = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
LEVELS = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)


def m_to_cm(x, y, z):
    return unreal.Vector(x * 100.0, y * 100.0, z * 100.0)


def rot(pitch=0.0, yaw=0.0, roll=0.0):
    return unreal.Rotator(roll=roll, pitch=pitch, yaw=yaw)


def props(obj, values):
    for k, v in values.items():
        obj.set_editor_property(k, v)


def spawn(cls, loc, rotation=None, folder="Cathedral", label=None):
    actor = ACTORS.spawn_actor_from_class(cls, loc, rotation or rot())
    actor.set_folder_path(folder)
    if label:
        actor.set_actor_label(label)
    return actor


def shape(mesh_path, loc_m, size_m, material, rotation=None, label=None, folder="Cathedral/Blockout", shadows=True):
    """Engine basic shapes are 1 m across, so scale is the size in metres."""
    actor = spawn(unreal.StaticMeshActor, m_to_cm(*loc_m), rotation, folder, label)
    comp = actor.static_mesh_component
    comp.set_mobility(unreal.ComponentMobility.STATIC)
    comp.set_static_mesh(unreal.load_asset(mesh_path))
    comp.set_material(0, material)
    comp.set_cast_shadow(shadows)
    actor.set_actor_scale3d(unreal.Vector(*size_m))
    return actor


def light(cls, loc_m, rotation, color, intensity, folder, label, radius_m=None, scatter=1.0, shadows=False):
    actor = spawn(cls, m_to_cm(*loc_m), rotation, folder, label)
    comp = actor.get_component_by_class(unreal.LightComponent)
    comp.set_mobility(unreal.ComponentMobility.MOVABLE)
    if isinstance(comp, unreal.LocalLightComponent):
        comp.set_editor_property("intensity_units", unreal.LightUnits.CANDELAS)
        if radius_m:
            comp.set_attenuation_radius(radius_m * 100.0)
    comp.set_intensity(intensity)
    comp.set_light_color(color)
    comp.set_editor_property("volumetric_scattering_intensity", scatter)
    comp.set_cast_shadows(shadows)
    return actor, comp


def look_at(src_m, dst_m):
    return unreal.MathLibrary.find_look_at_rotation(m_to_cm(*src_m), m_to_cm(*dst_m))


def open_map():
    # Load by path: in a commandlet the asset registry may not have scanned plugin content yet.
    if unreal.load_asset(MAP):
        if not LEVELS.load_level(MAP):
            raise RuntimeError(f"could not load {MAP}")
        for actor in ACTORS.get_all_level_actors():
            if not isinstance(actor, (unreal.WorldSettings, unreal.Brush)):
                ACTORS.destroy_actor(actor)
    elif not LEVELS.new_level(MAP):
        raise RuntimeError(f"could not create {MAP}")


# ---------------------------------------------------------------- scene

def place_centered(mesh, material, x_m, y_m, yaw, scale, label, folder):
    """Places a mesh with its footprint centred on (x, y) metres, turned by yaw, base on the plaza."""
    box = mesh.get_bounding_box()
    cx, cy = (box.min.x + box.max.x) * 0.5 * scale, (box.min.y + box.max.y) * 0.5 * scale
    a = math.radians(yaw)
    loc = unreal.Vector(x_m * 100.0 - (cx * math.cos(a) - cy * math.sin(a)),
                        y_m * 100.0 - (cx * math.sin(a) + cy * math.cos(a)), -box.min.z * scale)
    actor = spawn(unreal.StaticMeshActor, loc, rot(yaw=yaw), folder, label)
    comp = actor.static_mesh_component
    comp.set_mobility(unreal.ComponentMobility.STATIC)
    comp.set_static_mesh(mesh)
    for i in range(comp.get_num_materials()):
        comp.set_material(i, material)
    actor.set_actor_scale3d(unreal.Vector(scale, scale, scale))
    return actor


def place_church(mesh, material, spire_material):
    """Turns the church so its facade faces -X, then puts the facade at x = 0 and the base on the plaza."""
    box = mesh.get_bounding_box()
    s = CHURCH_SCALE
    # Yaw -90 maps model (x, y) to world (y, -x): the model's -Y facade ends up facing -X.
    loc = unreal.Vector(-box.min.y * s, (box.min.x + box.max.x) * 0.5 * s, -box.min.z * s)
    actor = spawn(unreal.StaticMeshActor, loc, rot(yaw=-90.0), "Cathedral/Church", "GothicRevivalChurch")
    comp = actor.static_mesh_component
    comp.set_mobility(unreal.ComponentMobility.STATIC)
    comp.set_static_mesh(mesh)
    for i in range(comp.get_num_materials()):
        comp.set_material(i, material)
    actor.set_actor_scale3d(unreal.Vector(s, s, s))

    # Spires on the belfries, using the same model -> world mapping: (x, y) -> (y, -x) * s + loc.
    top = (CHURCH_TOWER_TOP * s + loc.z) / 100.0
    for (x0, x1), (y0, y1) in CHURCH_TOWERS:
        cx = ((y0 + y1) * 0.5 * s + loc.x) / 100.0
        cy = (-(x0 + x1) * 0.5 * s + loc.y) / 100.0
        w = min(x1 - x0, y1 - y0) * s / 100.0
        h = w * 2.4
        shape(CONE, (cx, cy, top + h * 0.5), (w * 0.82, w * 0.82, h), spire_material, label="Spire",
              folder="Cathedral/Church")
        for dx in (-0.38, 0.38):
            for dy in (-0.38, 0.38):
                shape(CONE, (cx + dx * w, cy + dy * w, top + w * 0.3), (w * 0.12, w * 0.12, w * 0.6), spire_material,
                      label="SpirePinnacle", folder="Cathedral/Church")


def build_building(stone, win, church=None, church_stone=None, church_glows=False, plaza=None, city_stone=None):
    """Facade faces -X at x = 0. Units are metres."""
    shape(PLANE, (40, 0, 0), (600, 600, 1), plaza or stone, label="Plaza")
    if church:
        place_church(church, church_stone, stone)
        if city_stone:
            for i, (x, y, yaw, scale) in enumerate(CITY):
                place_centered(church, city_stone, x, y, yaw, scale, f"CityChurch{i}", "Cathedral/City")
    else:
        build_blockout(stone)
    # A textured church lights its own windows through the stone material.
    if not church_glows:
        build_windows(win, facade_only=church is not None)


def build_blockout(stone):
    shape(CUBE, (40, 0, 20), (80, 34, 40), stone, label="Nave")
    shape(CUBE, (40, 0, 40), (80, 24, 24), stone, rot(roll=45), label="NaveRoof")
    shape(CUBE, (1, 0, 40), (2, 24, 24), stone, rot(roll=45), label="Gable")

    for side in (-1, 1):
        y = side * 22
        shape(CUBE, (0, y, 35), (14, 14, 70), stone, label=f"WestTower{side:+d}")
        shape(CONE, (0, y, 85), (14, 14, 30), stone, label=f"WestSpire{side:+d}")
        for dx, dy in ((-6, -6), (-6, 6), (6, -6), (6, 6)):
            shape(CONE, (dx, y + dy, 74), (2.5, 2.5, 9), stone, label="TowerPinnacle")
        # Flying buttresses and pinnacles along the nave.
        for x in range(10, 80, 10):
            shape(CUBE, (x, side * 19, 15), (2.5, 4, 30), stone, label="Buttress")
            shape(CONE, (x, side * 19, 35), (2.5, 2.5, 10), stone, label="Pinnacle")
            shape(CONE, (x, side * 17, 45), (1.8, 1.8, 8), stone, label="RoofPinnacle")

    shape(CUBE, (50, 0, 45), (16, 16, 90), stone, label="CrossingTower")
    shape(CONE, (50, 0, 115), (16, 16, 50), stone, label="CrossingSpire")
    for dx, dy in ((-7, -7), (-7, 7), (7, -7), (7, 7)):
        shape(CONE, (50 + dx, dy, 96), (3, 3, 12), stone, label="CrossingPinnacle")


def build_windows(win, facade_only=False):
    # Windows: (centre, width, height, facing yaw, (instance, light colour))
    windows = [((-0.05, 0, 27), 14, 14, 180, win["Rose"]),
               ((-0.05, 0, 5), 6, 10, 180, win["Cyan"]),
               ((-0.05, -7, 11), 3, 10, 180, win["Magenta"]),
               ((-0.05, 7, 11), 3, 10, 180, win["Magenta"])]
    # A real mesh has its own window openings; only the centre group, which fills the gap
    # between the church's towers, is kept.
    for side in (() if facade_only else (-1, 1)):
        y = side * 22
        windows += [((-7.05, y, 30), 4, 12, 180, win["Magenta"]),
                    ((-7.05, y, 52), 4, 12, 180, win["Cyan"]),
                    ((-7.05, y, 5), 5, 9, 180, win["Cyan"])]
        for x in range(15, 80, 10):
            windows.append(((x, side * 17.05, 18), 4, 16, 90 * side, win["Cyan"]))
        windows.append(((50, side * 8.05, 70), 5, 14, 90 * side, win["Magenta"]))
    if not facade_only:
        windows += [((41.95, 0, 70), 5, 14, 180, win["Cyan"])]

    for (x, y, z), w, h, yaw, (mi, color) in windows:
        # Plane faces +Z; pitch 90 turns it to face +X, then yaw aims it.
        # After the pitch the plane's X runs up the wall, so X is the height.
        shape(PLANE, (x, y, z), (h, w, 1), mi, rot(pitch=90, yaw=yaw + 180), label="Window",
              folder="Cathedral/Windows", shadows=False)
        normal = (math.cos(math.radians(yaw)), math.sin(math.radians(yaw)))
        lx, ly = x + normal[0] * 0.8, y + normal[1] * 0.8
        _, comp = light(unreal.RectLight, (lx, ly, z), rot(yaw=yaw), color, 6.0 * w * h / 40.0,
                        "Cathedral/Lights/Windows", "WindowLight", radius_m=max(w, h) * 4, scatter=2.0)
        comp.set_editor_property("source_width", w * 100.0)
        comp.set_editor_property("source_height", h * 100.0)
        comp.set_editor_property("barn_door_angle", 70.0)


RINGS = [  # centre (m), diameter (m), tilt, ring count, intensity
    ((50, 0, 138), 82, rot(pitch=8, roll=-6), 6, 5.0),
    ((8, -55, 86), 58, rot(pitch=16, roll=14), 5, 4.0),
    ((14, 56, 82), 48, rot(pitch=-14, roll=-12), 5, 4.0),
    ((-6, -42, 52), 24, rot(pitch=10, roll=8), 3, 3.0),
]


def build_rings(parent):
    for i, (centre, diameter, tilt, count, intensity) in enumerate(RINGS):
        # Two stacked layers so each cluster has depth when seen at an angle.
        for layer, (dz, scale, spacing) in enumerate(((0.0, 1.0, 0.12), (diameter * 0.08, 0.78, 0.15))):
            mi = instance(parent, f"MI_CathedralRing_{i}{layer}",
                          scalars={"RingCount": float(count - layer), "Intensity": intensity * (1.0 - 0.25 * layer),
                                   "RingSpacing": spacing, "FlowSpeed": 0.5 + 0.15 * i * (-1) ** layer})
            x, y, z = centre
            # Roll 180 turns the plane's front face down, toward viewers on the ground.
            face_down = rot(pitch=tilt.pitch, yaw=tilt.yaw, roll=tilt.roll + 180.0)
            shape(PLANE, (x, y, z + dz), (diameter * scale, diameter * scale, 1), mi, face_down,
                  label=f"Ring{i}", folder="Cathedral/Rings", shadows=False)
        # God ray: a narrow, bright spot under each ring.
        light(unreal.SpotLight, (centre[0], centre[1], centre[2] - 2), rot(pitch=-90), unreal.LinearColor(0.35, 0.8, 1.0),
              3.0e5 * (diameter / 60.0) ** 2, "Cathedral/Lights/GodRays", "GodRay", radius_m=centre[2] * 1.6, scatter=6.0)
    for comp in [a.get_component_by_class(unreal.SpotLightComponent) for a in ACTORS.get_all_level_actors()
                 if a.get_folder_path() == "Cathedral/Lights/GodRays"]:
        comp.set_inner_cone_angle(2.0)
        comp.set_outer_cone_angle(7.0)


def build_lighting():
    folder = "Cathedral/Lights"
    moon, mc = light(unreal.DirectionalLight, (0, 0, 200), rot(pitch=-22, yaw=-35), unreal.LinearColor(0.55, 0.65, 1.0),
                     0.6, folder, "Moon", scatter=1.0, shadows=True)
    mc.set_editor_property("atmosphere_sun_light", True)

    spawn(unreal.SkyAtmosphere, m_to_cm(0, 0, 0), folder="Cathedral/Sky", label="SkyAtmosphere")
    spawn(unreal.VolumetricCloud, m_to_cm(0, 0, 0), folder="Cathedral/Sky", label="StormClouds")

    sky = spawn(unreal.SkyLight, m_to_cm(0, 0, 150), folder=folder, label="IndigoSkyLight")
    sc = sky.get_component_by_class(unreal.SkyLightComponent)
    sc.set_mobility(unreal.ComponentMobility.MOVABLE)
    props(sc, {"real_time_capture": True, "lower_hemisphere_is_black": True})
    sc.set_intensity(1.5)
    sc.set_light_color(unreal.LinearColor(0.22, 0.25, 0.55))

    fog = spawn(unreal.ExponentialHeightFog, m_to_cm(0, 0, 0), folder="Cathedral/Sky", label="VolumetricFog")
    fc = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
    fc.set_fog_density(0.006)
    fc.set_fog_height_falloff(0.05)
    fc.set_fog_inscattering_color(unreal.LinearColor(0.006, 0.009, 0.02))
    fc.set_volumetric_fog(True)
    # Bright albedo scatters the beams; darken the fog with extinction instead.
    fc.set_volumetric_fog_albedo(unreal.Color(r=215, g=220, b=230, a=255))
    fc.set_volumetric_fog_extinction_scale(1.0)
    fc.set_volumetric_fog_distance(40000.0)

    # Warm ground glow at the base of the facade.
    for y in range(-30, 31, 10):
        light(unreal.PointLight, (-6, y, 1.2), rot(), WARM, 450.0, f"{folder}/Ground", "GroundGlow", radius_m=30, scatter=3.0)
    # Distant city: big warm lights on the horizon tint the fog orange. They sit 35 m up so the
    # glow lands in a camera that looks up at the spires, not below the frame.
    for x, y in ((-40, -170), (80, -180), (-40, 170), (80, 180), (220, -110), (240, 0), (220, 120)):
        light(unreal.PointLight, (x, y, 35), rot(), WARM, 7.0e4, f"{folder}/Horizon", "CityGlow", radius_m=260, scatter=4.0)


def build_post():
    ppv = spawn(unreal.PostProcessVolume, m_to_cm(0, 0, 0), folder="Cathedral", label="CathedralLook")
    props(ppv, {"unbound": True, "priority": 1.0})
    s = ppv.get_editor_property("settings")
    values = {
        "dynamic_global_illumination_method": unreal.DynamicGlobalIlluminationMethod.LUMEN,
        "reflection_method": unreal.ReflectionMethod.LUMEN,
        "auto_exposure_method": unreal.AutoExposureMethod.AEM_MANUAL,
        "auto_exposure_apply_physical_camera_exposure": False,
        "auto_exposure_bias": EXPOSURE_COMPENSATION,
        "bloom_method": unreal.BloomMethod.BM_FFT if CONVOLUTION_BLOOM else unreal.BloomMethod.BM_SOG,
        "bloom_intensity": 2.6,
        "bloom_size_scale": 6.0,
        "vignette_intensity": 0.75,
        "scene_fringe_intensity": 0.2,
        "color_contrast": unreal.Vector4(1.18, 1.18, 1.18, 1.0),
        "color_gain_shadows": unreal.Vector4(0.80, 0.95, 1.20, 1.0),
        "color_offset_shadows": unreal.Vector4(0.0, 0.002, 0.006, 0.0),
        "color_saturation_highlights": unreal.Vector4(1.0, 1.0, 1.0, 1.2),
        "film_grain_intensity": 0.15,
    }
    for k, v in values.items():
        s.set_editor_property(k, v)
        s.set_editor_property(f"override_{k}", True)
    ppv.set_editor_property("settings", s)


def build_camera():
    # Pitched up ~23 degrees: the plaza and skyline stay in frame, the rings still crown the shot.
    eye, target = (-95, -35, 1.7), (25, 0, 55)
    cam = spawn(unreal.CameraActor, m_to_cm(*eye), look_at(eye, target), label="HeroCamera")
    props(cam.camera_component, {"field_of_view": 86.0})
    cam.set_editor_property("auto_activate_for_player", unreal.AutoReceiveInput.PLAYER0)
    spawn(unreal.PlayerStart, m_to_cm(*eye), look_at(eye, target), label="PlayerStart")


def two_sided(mi):
    """Downloaded meshes often have faces pointing inward; a two-sided instance hides that."""
    overrides = mi.get_editor_property("base_property_overrides")
    overrides.set_editor_property("override_two_sided", True)
    overrides.set_editor_property("two_sided", True)
    mi.set_editor_property("base_property_overrides", overrides)
    MEL.update_material_instance(mi)
    save(mi)
    return mi


def build():
    stone = build_stone()
    stone_mi = instance(stone, "MI_CathedralStone")
    window = build_window()
    win = {
        "Cyan": (instance(window, "MI_CathedralWindow_Cyan", vectors={"WindowColor": CYAN}), CYAN),
        "Magenta": (instance(window, "MI_CathedralWindow_Magenta", vectors={"WindowColor": MAGENTA}), MAGENTA),
        "Rose": (instance(window, "MI_CathedralWindow_Rose", scalars={"Rose": 1.0, "Petals": 16.0},
                          vectors={"WindowColor": ROSE}), ROSE),
    }
    ring = build_ring()

    church = unreal.load_asset(CHURCH_MESH)
    church_stone = city_stone = None
    if church:
        texture = unreal.load_asset(CHURCH_TEXTURE)
        maps = {k: t for k, t in (("StoneAlbedo", texture), ("StoneNormal", unreal.load_asset(CHURCH_NORMAL)),
                                  ("StoneRoughness", unreal.load_asset(CHURCH_ROUGHNESS))) if t}
        # Buildings stay satin when wet: glossier stone mirrors the orange footlights and reads as brass.
        scalars = {"WindowEmissive": 0.4 if texture else 0.0, "RoughnessWet": 0.38}
        if "StoneRoughness" in maps:
            scalars["RoughnessDry"] = 1.0  # the map carries the dry roughness itself
        # The church texture is light beige, so the tint is lifted to keep the stone's value.
        tint = unreal.LinearColor(0.07, 0.072, 0.08, 1.0)
        church_stone = two_sided(instance(stone, "MI_CathedralStone_TwoSided", scalars=scalars,
                                          vectors={"BaseColor": tint} if texture else None, textures=maps))
        if texture:
            # The skyline: same stone, dimmer windows lit mostly amber like a city at night.
            city_stone = two_sided(instance(stone, "MI_CathedralStone_City", textures=maps,
                                            scalars=dict(scalars, WindowEmissive=0.34, WindowColorMix=0.1),
                                            vectors={"BaseColor": tint, "WindowColorA": CITY_WINDOW, "WindowColorB": CYAN}))
    # Wet plaza: glossy puddles so the windows, rings and city glow reflect in the ground.
    plaza = instance(stone, "MI_CathedralPlaza", scalars={"RoughnessDry": 0.65, "RoughnessWet": 0.04, "WetDarkening": 0.5},
                     vectors={"BaseColor": unreal.LinearColor(0.03, 0.032, 0.036, 1.0)})

    open_map()
    build_building(stone_mi, win, church, church_stone, church_glows=bool(church and unreal.load_asset(CHURCH_TEXTURE)),
                   plaza=plaza, city_stone=city_stone)
    build_rings(ring)
    build_lighting()
    build_post()
    build_camera()
    if not LEVELS.save_current_level():
        raise RuntimeError(f"could not save {MAP}")
    unreal.log(f"PrimordiaCathedral: built {MAP} and {PACKAGE_DIR}")
    unreal.log("PrimordiaCathedral: for hardware ray traced Lumen, set Project Settings > Rendering > "
               "Support Hardware Ray Tracing and Lumen > Use Hardware Ray Tracing when available (DX12).")


build()
