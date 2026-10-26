"""The Lumenne Sanctum: Gothic structures around the live realm in RealmBench (docs/MATERIALS_AND_NIAGARA.md §8c).

The pieces come from the Primordia-cad pipeline (PrimordiaOS/Primordia-cad): `gothic.mjs kit` with the
preset SANCTUM_KIT below generates them, and `gothic.mjs finish` runs headless Blender (bevels, AO and
curvature bakes, LODs). This script imports the finished .glb files, builds their materials, generates
engine LODs and collision, and places them where the realm can't move them: on the base disc's outer ring
(100-118 m from the centre, outside every terrace, always at the ground's altitude) and on floating rock
islands in the cloud sea.

Run it in the full editor (set_lods refuses commandlets), with the editor otherwise closed:

    UnrealEditor.exe PrimordiaRealms.uproject -ExecutePythonScript="<plugin>/Scripts/build_realm_sanctum.py"

Environment: PRIM_SANCTUM_DIR = folder of finished .glb files (default C:/pg/sanctum/finished).
Re-running replaces every actor labelled Sanctum_*.
"""

import math
import os

import unreal

SRC = os.environ.get("PRIM_SANCTUM_DIR", "C:/pg/sanctum/finished")
DEST = "/Game/ThirdParty/LumenneSanctum"
MAP = "/Game/Primordia/Maps/RealmBench"
SCANS = "/Game/ThirdParty/LumenneScans"
PIECES = ("SM_SanctumWatchtower", "SM_SanctumShrine", "SM_SanctumButtress", "SM_SigilPylon", "SM_LumenLamp",
          "SM_MoonObservatory", "SM_SanctumPinnacle", "SM_TerraceBalustrade")
LODS = ((1.0, 1.0), (0.35, 0.3), (0.12, 0.1), (0.04, 0.03))
GLOW = unreal.LinearColor(1.0, 0.62, 0.30, 1.0)   # Lumenne amber, the realm's essence
GLOW_INTENSITY = 6.0
STONE = unreal.LinearColor(0.58, 0.54, 0.52, 1.0)
GROUND_R = 120.0  # m, Lumenne Hollow's ground radius

MEL = unreal.MaterialEditingLibrary
ACTORS = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
LEVELS = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)


def log(msg):
    unreal.log(f"Sanctum: {msg}")


def connect(a, a_out, b, b_in):
    if not MEL.connect_material_expressions(a, a_out, b, b_in):
        raise RuntimeError(f"could not connect {a.get_name()}.{a_out!r} -> {b.get_name()}.{b_in!r}")


def material(name, build):
    path = f"{DEST}/{name}"
    m = unreal.load_asset(path)
    if m:
        MEL.delete_all_material_expressions(m)
    else:
        m = unreal.AssetToolsHelpers.get_asset_tools().create_asset(name, DEST, unreal.Material, unreal.MaterialFactoryNew())
    y = [-800]

    def node(cls, x=-500, **props):
        y[0] += 100
        e = MEL.create_material_expression(m, cls, x, y[0])
        for k, v in props.items():
            e.set_editor_property(k, v)
        return e

    build(m, node)
    MEL.recompile_material(m)
    unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False)
    return m


def build_glow(m, node):
    m.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    color = node(unreal.MaterialExpressionVectorParameter, -900, parameter_name="GlowColor", default_value=GLOW)
    gain = node(unreal.MaterialExpressionScalarParameter, -900, parameter_name="GlowIntensity", default_value=GLOW_INTENSITY)
    e = node(unreal.MaterialExpressionMultiply)
    connect(color, "", e, "A")
    connect(gain, "", e, "B")
    MEL.connect_material_property(e, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)


def build_iron(m, node):
    c = node(unreal.MaterialExpressionConstant3Vector, constant=unreal.LinearColor(0.05, 0.05, 0.06, 1))
    MEL.connect_material_property(c, "", unreal.MaterialProperty.MP_BASE_COLOR)
    MEL.connect_material_property(node(unreal.MaterialExpressionConstant, r=1.0), "", unreal.MaterialProperty.MP_METALLIC)
    MEL.connect_material_property(node(unreal.MaterialExpressionConstant, r=0.45), "", unreal.MaterialProperty.MP_ROUGHNESS)


def build_stone(m, node):
    """Pale dressed stone weathered by the scanned Lichened Rock Wall, projected by world position (the
    generated meshes have no useful UVs at realm scale). Faces that point up gather more lichen."""
    m.set_editor_property("used_with_instanced_static_meshes", True)
    rock = unreal.load_asset(f"{SCANS}/Surfaces/T_LichenedRock_BaseColor")
    rock_n = unreal.load_asset(f"{SCANS}/Surfaces/T_LichenedRock_Normal")
    world = node(unreal.MaterialExpressionWorldPosition, -1100)
    world_f = node(unreal.MaterialExpressionTruncateLWC, -1000)
    connect(world, "", world_f, "")
    tile = node(unreal.MaterialExpressionConstant, -1000, r=300.0)

    def proj(r, g, b):
        mask = node(unreal.MaterialExpressionComponentMask, -900, r=r, g=g, b=b, a=False)
        connect(world_f, "", mask, "")
        uv = node(unreal.MaterialExpressionDivide, -800)
        connect(mask, "", uv, "A")
        connect(tile, "", uv, "B")
        return uv

    n = node(unreal.MaterialExpressionVertexNormalWS, -1100)
    nx = node(unreal.MaterialExpressionComponentMask, -900, r=True, g=False, b=False, a=False)
    connect(n, "", nx, "")
    ax = node(unreal.MaterialExpressionAbs, -800)
    connect(nx, "", ax, "")
    nz = node(unreal.MaterialExpressionComponentMask, -900, r=False, g=False, b=True, a=False)
    connect(n, "", nz, "")
    up = node(unreal.MaterialExpressionSaturate, -700)
    connect(nz, "", up, "")

    def tri(tex, sampler):
        a = node(unreal.MaterialExpressionTextureSample, -600, texture=tex, sampler_type=sampler)
        connect(proj(False, True, True), "", a, "UVs")
        b = node(unreal.MaterialExpressionTextureSample, -600, texture=tex, sampler_type=sampler)
        connect(proj(True, False, True), "", b, "UVs")
        c = node(unreal.MaterialExpressionTextureSample, -600, texture=tex, sampler_type=sampler)
        connect(proj(True, True, False), "", c, "UVs")
        side = node(unreal.MaterialExpressionLinearInterpolate, -400)
        connect(b, "", side, "A")
        connect(a, "", side, "B")
        connect(ax, "", side, "Alpha")
        out = node(unreal.MaterialExpressionLinearInterpolate, -300)
        connect(side, "", out, "A")
        connect(c, "", out, "B")
        connect(up, "", out, "Alpha")
        return out

    if rock and rock_n:
        weather = tri(rock, unreal.MaterialSamplerType.SAMPLERTYPE_COLOR)
        stone = node(unreal.MaterialExpressionVectorParameter, -900, parameter_name="StoneColor", default_value=STONE)
        bright = node(unreal.MaterialExpressionMultiply, -200)
        connect(weather, "", bright, "A")
        bright.set_editor_property("const_b", 2.2)
        mix_amt = node(unreal.MaterialExpressionAdd, -300)
        connect(up, "", mix_amt, "A")
        mix_amt.set_editor_property("const_b", 0.35)
        mix_amt_s = node(unreal.MaterialExpressionSaturate, -200)
        connect(mix_amt, "", mix_amt_s, "")
        albedo = node(unreal.MaterialExpressionLinearInterpolate, -100)
        connect(stone, "", albedo, "A")
        connect(bright, "", albedo, "B")
        connect(mix_amt_s, "", albedo, "Alpha")
        MEL.connect_material_property(albedo, "", unreal.MaterialProperty.MP_BASE_COLOR)
        MEL.connect_material_property(tri(rock_n, unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL), "", unreal.MaterialProperty.MP_NORMAL)
    else:
        stone = node(unreal.MaterialExpressionVectorParameter, -900, parameter_name="StoneColor", default_value=STONE)
        MEL.connect_material_property(stone, "", unreal.MaterialProperty.MP_BASE_COLOR)
    MEL.connect_material_property(node(unreal.MaterialExpressionConstant, r=0.82), "", unreal.MaterialProperty.MP_ROUGHNESS)


def import_piece(name, mats):
    src = os.path.join(SRC, f"{name}.glb")
    t = unreal.AssetImportTask()
    for k, v in (("filename", src), ("destination_path", f"{DEST}/{name}"), ("destination_name", name),
                 ("automated", True), ("replace_existing", True), ("save", True)):
        t.set_editor_property(k, v)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([t])
    mesh = next((unreal.load_asset(p) for p in t.get_editor_property("imported_object_paths")
                 if isinstance(unreal.load_asset(p), unreal.StaticMesh)), None)
    if not mesh:
        raise RuntimeError(f"import failed: {src}")
    # Slots by name (Primordia-cad convention): Stone, Glass, Iron.
    slots = mesh.get_editor_property("static_materials")
    for i, s in enumerate(slots):
        key = str(s.material_slot_name).lower()
        mesh.set_material(i, mats["glass"] if "glass" in key else mats["iron"] if "iron" in key else mats["stone"])
    # LODs (engine reduction) and complex-as-simple collision so the explorer can't walk through.
    o = unreal.StaticMeshReductionOptions()
    o.set_editor_property("auto_compute_lod_screen_size", False)
    settings = []
    for f, sc in LODS:
        s = unreal.StaticMeshReductionSettings()
        s.set_editor_property("percent_triangles", f)
        s.set_editor_property("screen_size", sc)
        settings.append(s)
    o.set_editor_property("reduction_settings", settings)
    sub = getattr(unreal, "StaticMeshEditorSubsystem", None)
    (unreal.get_editor_subsystem(sub) if sub else unreal.EditorStaticMeshLibrary).set_lods(mesh, o)
    body = mesh.get_editor_property("body_setup")
    if body:
        body.set_editor_property("collision_trace_flag", unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
    unreal.EditorAssetLibrary.save_asset(mesh.get_path_name().split(".")[0], only_if_is_dirty=False)
    log(f"{name}: {mesh.get_num_lods()} LODs, {mesh.get_num_triangles(0)} triangles, slots {[str(s.material_slot_name) for s in slots]}")
    return mesh


def polar(r_m, deg, z_m=0.0):
    a = math.radians(deg)
    return unreal.Vector(r_m * 100.0 * math.cos(a), r_m * 100.0 * math.sin(a), z_m * 100.0)


def clear():
    for a in ACTORS.get_all_level_actors():
        if a.get_actor_label().startswith("Sanctum_"):  # includes islands placed by earlier versions
            ACTORS.destroy_actor(a)


def place(mesh, label, loc, yaw, scale=1.0, shadow=True):
    a = ACTORS.spawn_actor_from_class(unreal.StaticMeshActor, loc, unreal.Rotator(roll=0.0, pitch=0.0, yaw=yaw))
    a.set_actor_label(label)
    a.set_actor_scale3d(unreal.Vector(scale, scale, scale))
    c = a.static_mesh_component
    c.set_mobility(unreal.ComponentMobility.STATIC)
    c.set_static_mesh(mesh)
    c.set_editor_property("cast_shadow", shadow)
    a.set_folder_path("Sanctum")
    return a


def ring(mesh, label, transforms, shadow=False, collide=False):
    """Repeated pieces as one instanced mesh (APrimordiaInstanceSet): one draw call per material slot."""
    cls = unreal.load_class(None, "/Script/PrimordiaOSRealmBridge.PrimordiaInstanceSet")
    a = ACTORS.spawn_actor_from_class(cls, unreal.Vector(0, 0, 0))
    a.set_actor_label(label)
    a.set_folder_path("Sanctum")
    ism = a.get_component_by_class(unreal.InstancedStaticMeshComponent)
    ism.set_static_mesh(mesh)
    ism.set_editor_property("cast_shadow", shadow)
    ism.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS if collide else unreal.CollisionEnabled.NO_COLLISION)
    for t in transforms:
        ism.add_instance(t)
    return a


def facing_centre(deg):
    """Yaw for a piece whose front faces -Y (Primordia-cad windows and gables) to face the realm's centre.
    Yawing by psi turns -Y toward (psi - 90) degrees; the centre lies at (deg + 180)."""
    return deg - 90.0


CREATURE_SRC = os.environ.get("PRIM_CREATURE_DIR", "C:/pg/creatures")
CREATURES = ("SM_SkyWhale", "SM_SpectralJelly")  # free Fab models, normalized to 1 m long in Blender


def import_creature(name):
    src = os.path.join(CREATURE_SRC, f"{name}.glb")
    if not os.path.exists(src):
        log(f"{name}: no {src}, species keep their engine shapes")
        return
    t = unreal.AssetImportTask()
    for k, v in (("filename", src), ("destination_path", f"/Game/ThirdParty/LumenneCreatures/{name}"), ("destination_name", name),
                 ("automated", True), ("replace_existing", True), ("save", True)):
        t.set_editor_property(k, v)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([t])
    mesh = next((unreal.load_asset(p) for p in t.get_editor_property("imported_object_paths")
                 if isinstance(unreal.load_asset(p), unreal.StaticMesh)), None)
    if mesh:
        log(f"{name}: {mesh.get_num_triangles(0)} triangles at {mesh.get_path_name()}")


def main():
    for c in CREATURES:
        import_creature(c)
    mats = {"glass": material("M_SanctumGlow", build_glow), "iron": material("M_SanctumIron", build_iron),
            "stone": material("M_SanctumStone", build_stone)}
    meshes = {n: import_piece(n, mats) for n in PIECES}
    if not LEVELS.load_level(MAP):
        raise RuntimeError(f"could not load {MAP}")
    clear()
    # Watchtowers on the diagonals; shrine facades on the cardinals, facing the spire citadel,
    # each flanked by two flying buttresses bracing outward.
    for i, deg in enumerate((45, 135, 225, 315)):
        place(meshes["SM_SanctumWatchtower"], f"Sanctum_Watchtower_{i}", polar(112, deg), deg)
    for i, deg in enumerate((0, 90, 180, 270)):
        place(meshes["SM_SanctumShrine"], f"Sanctum_Shrine_{i}", polar(108, deg), facing_centre(deg))
        for side in (-1, 1):
            place(meshes["SM_SanctumButtress"], f"Sanctum_Buttress_{i}_{'L' if side < 0 else 'R'}",
                  polar(110, deg + side * 4.2), deg + 180.0)
    place(meshes["SM_MoonObservatory"], "Sanctum_Observatory", polar(111, 160), 160)
    # Repeated pieces: one instanced component each.
    t = unreal.Transform
    ring(meshes["SM_SigilPylon"], "Sanctum_Pylons", [t(polar(104, 22.5 + 45 * k), unreal.Rotator(0, 0, 22.5 + 45 * k), unreal.Vector(1, 1, 1)) for k in range(8)], shadow=True, collide=True)
    ring(meshes["SM_LumenLamp"], "Sanctum_Lamps", [t(polar(101.5, 7.5 + 15 * k), unreal.Rotator(0, 0, 7.5 + 15 * k + 90), unreal.Vector(1, 1, 1)) for k in range(24)])
    ring(meshes["SM_SanctumPinnacle"], "Sanctum_Pinnacles", [t(polar(116.5, 11.25 + 22.5 * k), unreal.Rotator(0, 0, 0), unreal.Vector(1, 1, 1)) for k in range(16)], shadow=True)
    seg = 4.0
    edge = GROUND_R - 0.45
    n = int(2 * math.pi * edge / seg)
    ring(meshes["SM_TerraceBalustrade"], "Sanctum_Balustrade",
         [t(polar(edge, 360.0 * k / n), unreal.Rotator(0, 0, 360.0 * k / n + 90), unreal.Vector(2 * math.pi * edge / n / seg, 1, 1)) for k in range(n)],
         collide=False)  # decorative: the archipelago's sky-bridges leave the realm across the rim
    # Floating islands in the cloud sea; the Gothic Revival church on the largest.
    tundra = unreal.load_asset(f"{SCANS}/TundraFormation/TundraFormation")
    church = unreal.load_asset("/Game/ThirdParty/GothicRevivalChurch/SM_GothicRevivalChurch")
    if tundra:
        # One rock island for the church; the archipelago's procedural islands fill the rest of the sea.
        for i, (r, deg, z, s, yaw) in enumerate(((330, 70, -18, 1.6, 20),)):
            place(tundra, f"Sanctum_Island_{i}", polar(r, deg, z), yaw, s)
        if church:
            box = church.get_bounding_box()
            fit = 36.0 * 100.0 / max(1.0, (box.max - box.min).z)
            place(church, "Sanctum_IslandChurch", polar(330, 70, -18 + 12.37 * 1.6 - 0.5), 70 + 180, fit)
    # A high vantage over the archipelago (renders: live_shot.ps1 -Camera Sanctum_ArchipelagoCamera).
    cam = ACTORS.spawn_actor_from_class(unreal.CameraActor, unreal.Vector(-62000.0, -78000.0, 30000.0), unreal.Rotator(roll=0.0, pitch=-15.0, yaw=51.5))
    cam.set_actor_label("Sanctum_ArchipelagoCamera")
    cam.set_folder_path("Sanctum")
    cam.get_component_by_class(unreal.CameraComponent).set_editor_property("field_of_view", 80.0)
    # Eye height on the home -> Sorok Vigil sky-bridge, a fifth of the way across, facing Sorok Vigil.
    # Only right for the default world seed (0x5eed1e55); the bridge runs (-101,-57) -> (-395,-223) m.
    cam = ACTORS.spawn_actor_from_class(unreal.CameraActor, unreal.Vector(-16000.0, -9040.0, 1040.0), unreal.Rotator(roll=0.0, pitch=-2.0, yaw=-150.5))
    cam.set_actor_label("Sanctum_BridgeCamera")
    cam.set_folder_path("Sanctum")
    cam.get_component_by_class(unreal.CameraComponent).set_editor_property("field_of_view", 80.0)
    if not LEVELS.save_current_level():
        raise RuntimeError(f"could not save {MAP}")
    log(f"placed the Sanctum in {MAP}: 4 watchtowers, 4 shrines, 8 buttresses, observatory, 8 pylons, 24 lamps, 16 pinnacles, {n} balustrade segments, the church island")


main()
