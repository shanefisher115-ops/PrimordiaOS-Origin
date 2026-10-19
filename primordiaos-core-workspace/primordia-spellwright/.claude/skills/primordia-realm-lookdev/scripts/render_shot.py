"""Editor script: renders one high-res screenshot of a map through a camera, then quits.

Run inside the full editor (UnrealEditor.exe -ExecCmds="py render_shot.py"); ue_run.ps1 does this.
Environment: PRIM_MAP (map path), PRIM_OUT (png path), PRIM_CAMERA (actor label, default HeroCamera),
PRIM_SHOT_DELAY (seconds after load, default 75), PRIM_SIZE (default 1600x900).

Each step below fixed a real failure: shaders are compiled before the shot (translucent materials are
skipped while compiling), the editor viewport is moved to the camera (captures through a camera cull by
the viewport's own view), and the tick callback guards against re-entry (the capture ticks Slate).
"""
import os

import unreal

MAP = os.environ["PRIM_MAP"]
OUT = os.environ["PRIM_OUT"]
CAMERA = os.environ.get("PRIM_CAMERA", "HeroCamera")
DELAY = float(os.environ.get("PRIM_SHOT_DELAY", "75"))
W, H = (int(v) for v in os.environ.get("PRIM_SIZE", "1600x900").split("x"))

actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).load_level(MAP)

# Block until every material on the map's meshes has shaders.
names = set()
for actor in actors.get_all_level_actors():
    for comp in actor.get_components_by_class(unreal.PrimitiveComponent):
        for i in range(comp.get_num_materials()):
            mat = comp.get_material(i)
            if mat:
                names.add(mat.get_base_material().get_name())
for name in sorted(names):
    unreal.SystemLibrary.execute_console_command(None, f"RecompileShaders material {name}")
unreal.log(f"RenderShot: compiled {len(names)} materials")

cam = next((a for a in actors.get_all_level_actors() if a.get_actor_label() == CAMERA), None)
if cam is None:
    raise RuntimeError(f"no actor labelled {CAMERA} in {MAP}")
unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(
    cam.get_actor_location(), cam.get_actor_rotation())

state = {"t": 0.0, "shot": False, "busy": False, "handle": None}


def tick(dt):
    if state["busy"]:
        return
    state["busy"] = True
    try:
        state["t"] += dt
        if not state["shot"] and state["t"] > DELAY:
            state["shot"] = True
            unreal.AutomationLibrary.take_high_res_screenshot(W, H, OUT, camera=cam)
            unreal.log(f"RenderShot: requested {OUT}")
        elif state["shot"] and state["t"] > DELAY + 20.0:
            unreal.unregister_slate_post_tick_callback(state["handle"])
            unreal.SystemLibrary.quit_editor()
    finally:
        state["busy"] = False


state["handle"] = unreal.register_slate_post_tick_callback(tick)
