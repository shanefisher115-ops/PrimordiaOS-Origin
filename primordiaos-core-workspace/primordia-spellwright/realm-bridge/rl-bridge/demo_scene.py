"""
demo_scene.py: builds a scratch test level for the eco-bridge in the open editor, then starts it.

    Unreal console (Cmd):   py "C:/.../realm-bridge/rl-bridge/demo_scene.py"
    then, outside Unreal:   python agent_trainer.py --run runs/ue-scratch

Creates /Game/Scratch/EcoBridgeTest with a 60 m floor, light, 12 gold resource nodes, agents of
the three species (green Lumen-Seed spheres, red Gravemind cubes, small blue Echo-Swarm spheres),
and hidden pool actors for births. It won't leave a map with unsaved changes: if the current
map is dirty it stops and says so (save or discard yourself, then run it again).
"""

import importlib
import math
import os
import random
import sys

import unreal

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else \
    r"C:\Users\Shane\Documents\dev\primordiaos-core-workspace\primordia-spellwright\realm-bridge\rl-bridge"
LEVEL = "/Game/Scratch/EcoBridgeTest"
ARENA_CM = 3000.0
SPECIES = {
    #             mesh,                            scale, colour,             count
    "LumenSeed": ("/Engine/BasicShapes/Sphere",    0.6, (0.15, 0.9, 0.25), 10),
    "Gravemind": ("/Engine/BasicShapes/Cube",      0.7, (0.95, 0.12, 0.1), 6),
    "EchoSwarm": ("/Engine/BasicShapes/Sphere",    0.35, (0.2, 0.45, 1.0), 14),
}
POOL_PER_SPECIES = 12


def log(msg):
    unreal.log(f"[EcoDemo] {msg}")


def colour_material(name, rgb):
    """A material instance of the engine's basic shape material, in one colour."""
    path = f"/Game/Scratch/{name}"
    mi = unreal.load_asset(path)
    if mi is None:
        tools = unreal.AssetToolsHelpers.get_asset_tools()
        mi = tools.create_asset(name, "/Game/Scratch", unreal.MaterialInstanceConstant,
                                unreal.MaterialInstanceConstantFactoryNew())
        mi.set_editor_property("parent", unreal.load_asset("/Engine/BasicShapes/BasicShapeMaterial"))
    unreal.MaterialEditingLibrary.set_material_instance_vector_parameter_value(
        mi, "Color", unreal.LinearColor(rgb[0], rgb[1], rgb[2], 1.0))
    unreal.EditorAssetLibrary.save_loaded_asset(mi)
    return mi


def spawn_mesh(mesh_path, location, scale, material, label, tags, movable=True):
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    actor = actors.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(*location))
    comp = actor.static_mesh_component
    comp.set_mobility(unreal.ComponentMobility.MOVABLE if movable else unreal.ComponentMobility.STATIC)
    comp.set_static_mesh(unreal.load_asset(mesh_path))
    if material is not None:
        comp.set_material(0, material)
    actor.set_actor_scale3d(unreal.Vector(*scale))
    actor.set_actor_label(label)
    actor.set_editor_property("tags", [unreal.Name(t) for t in tags])
    return actor


def build():
    editor = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
    if editor.get_game_world() is not None:
        log("Play-In-Editor is running; stop it (Esc) and run this again.")
        return False
    dirty = [p.get_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_map_packages()]
    if dirty and not dirty[0].endswith("EcoBridgeTest"):
        log(f"the open map has unsaved changes ({dirty}); save or discard them first, then run this again.")
        return False

    levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    if unreal.EditorAssetLibrary.does_asset_exist(LEVEL):
        unreal.EditorAssetLibrary.delete_asset(LEVEL)          # rebuild the scratch level from scratch
    if not levels.new_level(LEVEL):
        log(f"could not create {LEVEL}")
        return False

    random.seed(7)
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)

    # Ground, light and sky.
    floor = colour_material("MI_Eco_Floor", (0.18, 0.17, 0.2))
    spawn_mesh("/Engine/BasicShapes/Plane", (0, 0, 0), (ARENA_CM / 40, ARENA_CM / 40, 1), floor, "Floor", [], movable=False)
    sun = actors.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 1000), unreal.Rotator(0, -50, 30))
    sun.set_actor_label("Sun")
    actors.spawn_actor_from_class(unreal.SkyAtmosphere, unreal.Vector(0, 0, 0)).set_actor_label("Sky")
    sky = actors.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 500))
    sky.light_component.set_editor_property("real_time_capture", True)
    sky.set_actor_label("SkyLight")

    # Resource nodes: gold discs, spread around the arena.
    gold = colour_material("MI_Eco_Resource", (1.0, 0.7, 0.1))
    for i in range(12):
        ang, rad = 2 * math.pi * i / 12 + random.uniform(-0.2, 0.2), random.uniform(0.25, 0.85) * ARENA_CM
        spawn_mesh("/Engine/BasicShapes/Cylinder", (math.cos(ang) * rad, math.sin(ang) * rad, 10),
                   (0.6, 0.6, 0.2), gold, f"Resource_{i}", ["Resource"])

    # Agents and their pools.
    for species, (mesh, s, rgb, count) in SPECIES.items():
        mat = colour_material(f"MI_Eco_{species}", rgb)
        for i in range(count):
            p = (random.uniform(-0.8, 0.8) * ARENA_CM, random.uniform(-0.8, 0.8) * ARENA_CM, 50 * s)
            spawn_mesh(mesh, p, (s, s, s), mat, f"{species}_{i}", [species])
        for i in range(POOL_PER_SPECIES):
            a = spawn_mesh(mesh, (0, 0, -5000), (s, s, s), mat, f"{species}_pool_{i}", [species, "RLPool"])
            a.set_is_temporarily_hidden_in_editor(True)
            a.set_actor_hidden_in_game(True)
            a.set_actor_enable_collision(False)

    levels.save_current_level()
    log(f"built {LEVEL}: {sum(v[3] for v in SPECIES.values())} agents, 12 resources, "
        f"{POOL_PER_SPECIES * len(SPECIES)} pooled")
    return True


def prepare_view():
    editor = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
    editor.set_level_viewport_camera_info(unreal.Vector(-3600, -3600, 3400), unreal.Rotator(0, -38, 45))
    # Keep the editor ticking at full rate when it isn't the focused window (this session only;
    # nothing is written to the editor preferences). The settings class isn't exposed to Python,
    # so it is reached through its default object by path.
    try:
        perf = unreal.find_object(None, "/Script/UnrealEd.Default__EditorPerformanceSettings")
        perf.set_editor_property("throttle_cpu_when_not_foreground", False)
        log("background throttling off for this session")
    except Exception as e:
        log(f"couldn't turn off background throttling ({e}); keep the editor focused, or untick "
            "Editor Preferences > Performance > Use Less CPU when in Background")


def current_map():
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    return world.get_path_name().split(".")[0] if world else ""


def start():
    if HERE not in sys.path:
        sys.path.insert(0, HERE)
    import unreal_bridge
    importlib.reload(unreal_bridge)       # pick up edits to the file
    unreal_bridge.start_bridge(realm="ue-scratch", port=9777, hz=20.0, persist=True)


REBUILD = "rebuild" in sys.argv[1:]
if (current_map() == LEVEL and not REBUILD) or build():   # `py demo_scene.py rebuild` forces a fresh level
    prepare_view()
    start()
