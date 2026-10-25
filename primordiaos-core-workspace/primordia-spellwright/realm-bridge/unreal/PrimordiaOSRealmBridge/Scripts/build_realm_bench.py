"""Lights the live-realm bench map (/Game/Primordia/Maps/RealmBench, the map PlayRealm-iGPU.bat
opens) and builds the mist sea under the realm. The realm itself streams in from the node
bridge; this script owns only the scene around it, so the look is reproducible:

- Sun: low and from the side of the bench camera (it used to sit behind the camera, which lit
  every face head-on and flattened the realm), warm, with shadows reaching the far terraces.
- Manual exposure in a post-process volume: auto exposure brightened the pale realm until it
  washed out. The volume leaves exposure *bias* alone, so the realm's own grade (luminosity ->
  exposure, ARealmRootActor) still brightens and darkens it.
- Mist sea: a wide plane under the floating realm. A sky atmosphere does not draw a planet
  surface, so everything below the horizon was black. The sea is unlit translucent with fog
  off and fades to its own horizon colour by distance: the realm's height fog (essence-tinted,
  cut off at 5x the realm) either drew a seam on an opaque sea where it stopped or, without the
  cutoff, buried the whole sea in one flat colour that didn't match the sky.

- First person: the map's GameMode Override is APrimordiaExplorerGameMode (walk, sprint, jump,
  fly), starting on the outer terrace facing the spires. BenchCamera no longer takes over player 0;
  renders look through it by name (live_shot.ps1 -Camera BenchCamera, the default).

Run from the PrimordiaRealms project (Python Editor Script Plugin enabled):

    UnrealEditor-Cmd.exe PrimordiaRealms.uproject -run=pythonscript -script="<plugin>/Scripts/build_realm_bench.py"

Re-running updates the actors in place (found by label), so the camera and anything else in
the map stay as they are. Values are relative to the manual exposure: change them together.
"""

import math

import unreal

MAP = "/Game/Primordia/Maps/RealmBench"
MATERIAL_DIR = "/PrimordiaOSRealmBridge/Materials"
MIST_MATERIAL = "M_PrimordiaMistSea"

# The bench camera looks along yaw ~29 deg. The sun sits ~100 deg to its left and 34 deg up:
# side light that models the terraces and spires, with shadows falling across the frame.
SUN_PITCH, SUN_YAW = -34.0, 109.0
SUN_LUX = 5.5
SUN_COLOR = unreal.LinearColor(1.0, 0.86, 0.70, 1.0)
# Measured on the iGPU (CSV profile): 4 cascades to 600 m cost 4.8 ms of shadow depths per frame.
# 2 cascades to 400 m still reach the realm's far side from the bench camera (~320 m).
SUN_SHADOW_DISTANCE_CM = 40000.0
SUN_SHADOW_CASCADES = 2
SKY_LIGHT_INTENSITY = 1.0
# Manual exposure, physical camera exposure off: the scene is scaled by 2^bias, and the bias
# comes from the realm's grade (about +0.3 for a default realm).
# SSAO cost 1.3 ms per frame on the iGPU for a subtle darkening the layer material's height
# shade already approximates: off.
AO_INTENSITY, AO_RADIUS_CM = 0.0, 250.0
# Aerial perspective: 1 is Earth scale; the realm is a few hundred metres across, so haze
# builds over kilometres instead of tens of kilometres.
AERIAL_PERSPECTIVE_SCALE = 4.0

MIST_Z_CM = -6000.0             # 60 m under the realm's ground
MIST_SIZE_CM = 40_000_000.0     # 400 km: its edge sits a fraction of a pixel under the horizon
MIST_COLOR = unreal.LinearColor(0.30, 0.31, 0.40, 1.0)       # near the realm (emissive)
MIST_HORIZON = unreal.LinearColor(0.44, 0.36, 0.27, 1.0)     # matches the sky's horizon band
MIST_FADE_START_CM, MIST_FADE_RANGE_CM = 30000.0, 600000.0   # 300 m, then 6 km to the horizon
MIST_NOISE_CM = 30000.0
# The realm lights the clouds under it a little (a soft glow centred under the realm).
MIST_UNDERGLOW = unreal.LinearColor(0.30, 0.14, 0.16, 1.0)
MIST_UNDERGLOW_RADIUS_CM = 40000.0

# First person: on the base disc outside the outermost terrace, ~110 m from the centre, facing it.
EXPLORER_START_CM = unreal.Vector(-9500.0, -5500.0, 150.0)
EXPLORER_GAME_MODE = "/Script/PrimordiaOSRealmBridge.PrimordiaExplorerGameMode"

MEL = unreal.MaterialEditingLibrary
LEVELS = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
ACTORS = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def log(msg):
    unreal.log(f"RealmBench: {msg}")


def connect(src, src_out, dst, dst_in):
    if not MEL.connect_material_expressions(src, src_out, dst, dst_in):
        raise RuntimeError(f"could not connect {src.get_name()}.{src_out!r} -> {dst.get_name()}.{dst_in!r}")


def build_mist_material():
    path = f"{MATERIAL_DIR}/{MIST_MATERIAL}"
    m = unreal.load_asset(path)
    if m:
        MEL.delete_all_material_expressions(m)
    else:
        m = unreal.AssetToolsHelpers.get_asset_tools().create_asset(MIST_MATERIAL, MATERIAL_DIR, unreal.Material, unreal.MaterialFactoryNew())
    m.set_editor_property("blend_mode", unreal.BlendMode.BLEND_TRANSLUCENT)
    m.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    m.set_editor_property("use_translucency_vertex_fog", False)  # "Apply Fogging": the sea does its own

    y = [-600]
    def node(cls, x=-400, **props):
        y[0] += 110
        e = MEL.create_material_expression(m, cls, x, y[0])
        for k, v in props.items():
            e.set_editor_property(k, v)
        return e

    def op(cls, a, b, a_out="", b_out=""):
        e = node(cls)
        connect(a, a_out, e, "A")
        connect(b, b_out, e, "B")
        return e

    def const(v):
        return node(unreal.MaterialExpressionConstant, -900, r=v)

    def vector(name, value):
        return node(unreal.MaterialExpressionVectorParameter, -900, parameter_name=name, default_value=value)

    def scalar(name, value):
        return node(unreal.MaterialExpressionScalarParameter, -900, parameter_name=name, default_value=value)

    def saturate(a):
        e = node(unreal.MaterialExpressionSaturate)
        connect(a, "", e, "")
        return e

    color = vector("MistColor", MIST_COLOR)
    horizon = vector("HorizonColor", MIST_HORIZON)
    underglow = vector("UnderglowColor", MIST_UNDERGLOW)
    world = node(unreal.MaterialExpressionWorldPosition, -900)
    # Cloud banks: big soft noise with a finer layer on top.
    banks = node(unreal.MaterialExpressionNoise, scale=1.0 / MIST_NOISE_CM, levels=3, output_min=0.65, output_max=1.35, quality=1)
    connect(world, "", banks, "")
    near = op(unreal.MaterialExpressionMultiply, color, banks)
    # Underglow: (1 - r / R)^2 around the world origin, where the realm floats.
    xy = node(unreal.MaterialExpressionComponentMask, r=True, g=True, b=False, a=False)
    connect(world, "", xy, "")
    length = node(unreal.MaterialExpressionLength)
    connect(xy, "", length, "")
    ring = saturate(op(unreal.MaterialExpressionSubtract, const(1.0), op(unreal.MaterialExpressionDivide, length, scalar("UnderglowRadius", MIST_UNDERGLOW_RADIUS_CM))))
    near = op(unreal.MaterialExpressionAdd, near, op(unreal.MaterialExpressionMultiply, underglow, op(unreal.MaterialExpressionMultiply, ring, ring)))
    # Distance fade to the horizon colour (sqrt: most of the change happens early).
    depth = node(unreal.MaterialExpressionPixelDepth, -900)
    fade = saturate(op(unreal.MaterialExpressionDivide, op(unreal.MaterialExpressionSubtract, depth, scalar("FadeStart", MIST_FADE_START_CM)), scalar("FadeRange", MIST_FADE_RANGE_CM)))
    root = node(unreal.MaterialExpressionSquareRoot)
    connect(fade, "", root, "")
    mix = node(unreal.MaterialExpressionLinearInterpolate)
    connect(near, "", mix, "A")
    connect(horizon, "", mix, "B")
    connect(root, "", mix, "Alpha")
    MEL.connect_material_property(mix, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    MEL.connect_material_property(const(1.0), "", unreal.MaterialProperty.MP_OPACITY)

    MEL.recompile_material(m)
    if not unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False):
        raise RuntimeError(f"could not save {path}")
    log(f"built {path}")
    return m


def find(label, cls=None):
    for a in ACTORS.get_all_level_actors():
        if a.get_actor_label() == label and (cls is None or isinstance(a, cls)):
            return a
    return None


def find_or_spawn(label, cls, location):
    actor = find(label, cls)
    if not actor:
        actor = ACTORS.spawn_actor_from_class(cls, location)
        actor.set_actor_label(label)
        log(f"spawned {label}")
    actor.set_actor_location(location, False, False)
    return actor


def set_first(obj, names, value):
    """Sets the first property that exists (one of them is misspelled in the engine)."""
    for name in names:
        try:
            obj.set_editor_property(name, value)
            return name
        except Exception:
            continue
    raise RuntimeError(f"none of {names} on {obj.get_name()}")


def light_sun():
    sun = find("Sun", unreal.DirectionalLight)
    if not sun:
        sun = find_or_spawn("Sun", unreal.DirectionalLight, unreal.Vector(0, 0, 10000))
    sun.set_actor_rotation(unreal.Rotator(roll=0.0, pitch=SUN_PITCH, yaw=SUN_YAW), False)
    c = sun.get_component_by_class(unreal.DirectionalLightComponent)
    c.set_editor_property("intensity", SUN_LUX)
    c.set_editor_property("light_color", unreal.Color(r=int(255 * SUN_COLOR.r), g=int(255 * SUN_COLOR.g), b=int(255 * SUN_COLOR.b), a=255))
    c.set_editor_property("atmosphere_sun_light", True)
    c.set_editor_property("dynamic_shadow_distance_movable_light", SUN_SHADOW_DISTANCE_CM)
    c.set_editor_property("dynamic_shadow_distance_stationary_light", SUN_SHADOW_DISTANCE_CM)
    c.set_editor_property("dynamic_shadow_cascades", SUN_SHADOW_CASCADES)
    log(f"sun pitch {SUN_PITCH} yaw {SUN_YAW}, {SUN_LUX} lux")


def light_sky(mist_color):
    sky = find("SkyLight", unreal.SkyLight) or find_or_spawn("SkyLight", unreal.SkyLight, unreal.Vector(0, 0, 500))
    c = sky.get_component_by_class(unreal.SkyLightComponent)
    c.set_editor_property("intensity", SKY_LIGHT_INTENSITY)
    # Captured once at load: real-time capture re-renders the sky into a cubemap every frame.
    c.set_editor_property("real_time_capture", False)
    # Below the horizon the sky light now sees the mist sea, not black.
    c.set_editor_property("lower_hemisphere_is_black", False)
    c.set_editor_property("lower_hemisphere_color", unreal.LinearColor(mist_color.r * 0.35, mist_color.g * 0.35, mist_color.b * 0.35, 1.0))

    atmo = find("SkyAtmosphere", unreal.SkyAtmosphere) or find_or_spawn("SkyAtmosphere", unreal.SkyAtmosphere, unreal.Vector(0, 0, 0))
    ac = atmo.get_component_by_class(unreal.SkyAtmosphereComponent)
    name = set_first(ac, ["aerial_pespective_view_distance_scale", "aerial_perspective_view_distance_scale"], AERIAL_PERSPECTIVE_SCALE)
    log(f"sky light {SKY_LIGHT_INTENSITY}, {name} {AERIAL_PERSPECTIVE_SCALE}")


def grade():
    ppv = find_or_spawn("BenchLook", unreal.PostProcessVolume, unreal.Vector(0, 0, 0))
    ppv.set_editor_property("unbound", True)
    ppv.set_editor_property("priority", 0.0)
    s = ppv.get_editor_property("settings")
    for key, value in {
        "auto_exposure_method": unreal.AutoExposureMethod.AEM_MANUAL,
        "auto_exposure_apply_physical_camera_exposure": False,
        "ambient_occlusion_intensity": AO_INTENSITY,
        "ambient_occlusion_radius": AO_RADIUS_CM,
    }.items():
        s.set_editor_property("override_" + key, True)
        s.set_editor_property(key, value)
    ppv.set_editor_property("settings", s)
    log("manual exposure (bias left to the realm grade)")


def mist_sea(material):
    plane = unreal.load_asset("/Engine/BasicShapes/Plane.Plane")
    actor = find_or_spawn("MistSea", unreal.StaticMeshActor, unreal.Vector(0, 0, MIST_Z_CM))
    actor.set_actor_scale3d(unreal.Vector(MIST_SIZE_CM / 100.0, MIST_SIZE_CM / 100.0, 1.0))
    c = actor.static_mesh_component
    c.set_mobility(unreal.ComponentMobility.STATIC)
    c.set_static_mesh(plane)
    c.set_material(0, material)
    c.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
    c.set_editor_property("cast_shadow", False)
    # Translucent and 400 km wide: drawn after the realm, never written to velocity.
    c.set_editor_property("translucency_sort_priority", -10)
    log(f"mist sea at z {MIST_Z_CM / 100:.0f} m")


def explorer():
    cam = find("BenchCamera", unreal.CameraActor)
    if cam:
        cam.set_editor_property("auto_activate_for_player", unreal.AutoReceiveInput.DISABLED)
    start = find("ExplorerStart", unreal.PlayerStart) or find_or_spawn("ExplorerStart", unreal.PlayerStart, EXPLORER_START_CM)
    start.set_actor_location(EXPLORER_START_CM, False, False)
    yaw = math.degrees(math.atan2(-EXPLORER_START_CM.y, -EXPLORER_START_CM.x))
    start.set_actor_rotation(unreal.Rotator(roll=0.0, pitch=0.0, yaw=yaw), False)
    mode = unreal.load_class(None, EXPLORER_GAME_MODE)
    if not mode:
        raise RuntimeError(f"{EXPLORER_GAME_MODE} not found: build the plugin first")
    world = unreal.EditorLevelLibrary.get_editor_world()
    world.get_world_settings().set_editor_property("default_game_mode", mode)
    log(f"first person: {EXPLORER_GAME_MODE}, start at {EXPLORER_START_CM.x / 100:.0f}, {EXPLORER_START_CM.y / 100:.0f} m facing yaw {yaw:.0f}")


def main():
    material = build_mist_material()
    if not LEVELS.load_level(MAP):
        raise RuntimeError(f"could not load {MAP}")
    light_sun()
    light_sky(MIST_COLOR)
    grade()
    mist_sea(material)
    explorer()
    if not LEVELS.save_current_level():
        raise RuntimeError(f"could not save {MAP}")
    log(f"saved {MAP}")


main()
