"""PrimordiaOS Blender RPC server: JSON-RPC 2.0 over HTTP, run inside Blender.

Headless:   blender -b --factory-startup --python blender_rpc_server.py -- --port 7791
In the UI:  Scripting workspace > open this file > Run Script (keeps serving while Blender runs)

Methods
  ping                                   -> {blender, file}
  scene.info                             -> objects, frame range, engine, resolution
  scene.reset                            empty scene
  mesh.create  {name, vertices[], uvs[], triangles[]}   flat arrays, Blender axes (m, Z up)
  import       {path, format?}           glb/gltf/fbx/obj/usd -> {objects}
  export       {path, format?, objects?} -> {path}
  animate      {object, keyframes[] | turntable, frame_start, frame_end, fps}
  render       {output, animation, frame_start, frame_end, engine, resolution[2], samples}
  task.status  {task}                    -> {state, progress, message, result, error}

Every method takes optional "scene" (a .blend to open first, or "current") and "save" (save the
.blend afterwards). With "async": true a method runs as a background task and the call returns
{"task": id} at once; poll task.status. Blender's data may only be touched on its main thread, so
the HTTP server runs on a thread and hands work to the main thread through a queue.
"""

import json
import math
import os
import queue
import sys
import threading
import time
import traceback
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import bpy
from mathutils import Vector

WORK = queue.Queue()
TASKS = {}
TASKS_LOCK = threading.Lock()
SYNC_TIMEOUT = 120.0


class RpcError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


# ------------------------------------------------------------------ helpers

def _scene():
    return bpy.context.scene


def _open_scene(params):
    scene = params.get("scene") or "current"
    if scene != "current":
        if not os.path.isfile(scene):
            raise RpcError(-32602, f"scene file {scene} does not exist")
        if os.path.normcase(os.path.abspath(bpy.data.filepath or "")) != os.path.normcase(os.path.abspath(scene)):
            bpy.ops.wm.open_mainfile(filepath=scene)


def _save(params):
    path = params.get("save")
    if path:
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(path))


def _object(name):
    if name:
        obj = bpy.data.objects.get(name)
        if obj is None:
            raise RpcError(-32602, f"no object named {name}")
        return obj
    meshes = [o for o in _scene().objects if o.type == "MESH"]
    if not meshes:
        raise RpcError(-32602, "the scene has no mesh objects")
    return meshes[0]


def _scene_bounds():
    lo = Vector((math.inf,) * 3)
    hi = Vector((-math.inf,) * 3)
    found = False
    for obj in _scene().objects:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            p = obj.matrix_world @ Vector(corner)
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
            found = True
    if not found:
        return Vector((-1, -1, 0)), Vector((1, 1, 2))
    return lo, hi


def _ensure_camera_and_light():
    """Renders of a bare scene would be black: add a framing camera and a sun if missing."""
    scene = _scene()
    lo, hi = _scene_bounds()
    center = (lo + hi) / 2
    radius = max((hi - lo).length / 2, 0.5)
    if scene.camera is None:
        cam_data = bpy.data.cameras.new("PrimordiaCamera")
        cam = bpy.data.objects.new("PrimordiaCamera", cam_data)
        scene.collection.objects.link(cam)
        # Fit the bounding sphere inside the narrower field of view (vertical, for landscape frames).
        r = scene.render
        aspect = min(r.resolution_x, r.resolution_y) / max(r.resolution_x, r.resolution_y)
        half_fov = math.atan(math.tan(cam_data.angle / 2) * aspect)
        distance = radius / math.sin(half_fov) * 1.15
        direction = Vector((1.0, -1.2, 0.7)).normalized()
        cam.location = center + direction * distance
        track = cam.constraints.new(type="TRACK_TO")
        target = bpy.data.objects.new("PrimordiaCameraTarget", None)
        target.location = center
        scene.collection.objects.link(target)
        track.target = target
        track.track_axis = "TRACK_NEGATIVE_Z"
        track.up_axis = "UP_Y"
        cam_data.clip_end = max(1000.0, distance * 10)
        scene.camera = cam
    if not any(o.type == "LIGHT" for o in scene.objects):
        sun_data = bpy.data.lights.new("PrimordiaSun", type="SUN")
        sun_data.energy = 3.0
        sun = bpy.data.objects.new("PrimordiaSun", sun_data)
        sun.rotation_euler = (math.radians(50), 0, math.radians(30))
        scene.collection.objects.link(sun)


def _engine_id(name):
    items = {i.identifier for i in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    wanted = (name or "eevee").lower()
    if wanted == "cycles":
        return "CYCLES"
    if wanted == "workbench":
        return "BLENDER_WORKBENCH"
    for candidate in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        if candidate in items:
            return candidate
    raise RpcError(-32602, f"no EEVEE engine in this Blender ({sorted(items)})")


def _set_progress(task, progress, message=""):
    if task is None:
        return
    with TASKS_LOCK:
        t = TASKS.get(task)
        if t:
            t["progress"] = max(0.0, min(1.0, float(progress)))
            if message:
                t["message"] = message


# ------------------------------------------------------------------ methods

def m_ping(params, task):
    return {"blender": bpy.app.version_string, "file": bpy.data.filepath, "background": bpy.app.background}


def m_scene_info(params, task):
    _open_scene(params)
    s = _scene()
    return {
        "file": bpy.data.filepath,
        "objects": [{"name": o.name, "type": o.type, "location": list(o.location)} for o in s.objects],
        "frame_start": s.frame_start,
        "frame_end": s.frame_end,
        "fps": s.render.fps,
        "engine": s.render.engine,
        "resolution": [s.render.resolution_x, s.render.resolution_y],
    }


def m_scene_reset(params, task):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return {"objects": 0}


def m_mesh_create(params, task):
    name = params.get("name") or "PrimordiaMesh"
    flat_v = params.get("vertices") or []
    flat_t = params.get("triangles") or []
    flat_uv = params.get("uvs") or []
    if len(flat_v) % 3 or len(flat_t) % 3 or not flat_v:
        raise RpcError(-32602, "vertices and triangles must be non-empty flat arrays of triples")
    verts = [tuple(flat_v[i:i + 3]) for i in range(0, len(flat_v), 3)]
    faces = [tuple(flat_t[i:i + 3]) for i in range(0, len(flat_t), 3)]
    if any(i < 0 or i >= len(verts) for f in faces for i in f):
        raise RpcError(-32602, "a triangle index is out of range")
    _open_scene(params)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    if len(flat_uv) == len(verts) * 2:
        layer = mesh.uv_layers.new(name="UVMap")
        for loop in mesh.loops:
            v = loop.vertex_index
            layer.data[loop.index].uv = (flat_uv[2 * v], flat_uv[2 * v + 1])
    mesh.validate()
    mesh.update()
    old = bpy.data.objects.get(name)
    if old is not None:
        bpy.data.objects.remove(old, do_unlink=True)
    obj = bpy.data.objects.new(name, mesh)
    _scene().collection.objects.link(obj)
    _save(params)
    return {"object": obj.name, "vertices": len(verts), "triangles": len(faces)}


def _format(params, path):
    fmt = (params.get("format") or os.path.splitext(path)[1].lstrip(".")).lower()
    if fmt not in ("glb", "gltf", "fbx", "obj", "usd", "usda", "usdc", "usdz"):
        raise RpcError(-32602, f"unsupported format {fmt}")
    return fmt


def m_import(params, task):
    path = params.get("path") or ""
    if not os.path.isfile(path):
        raise RpcError(-32602, f"{path} does not exist")
    _open_scene(params)
    fmt = _format(params, path)
    before = set(bpy.data.objects.keys())
    if fmt in ("glb", "gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif fmt == "fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    elif fmt == "obj":
        # Files written by the Unreal subsystem are already in Blender axes.
        bpy.ops.wm.obj_import(filepath=path, forward_axis="Y", up_axis="Z")
    else:
        bpy.ops.wm.usd_import(filepath=path)
    new = sorted(set(bpy.data.objects.keys()) - before)
    _save(params)
    return {"objects": new, "path": path}


def m_export(params, task):
    path = os.path.abspath(params.get("path") or "")
    if not params.get("path"):
        raise RpcError(-32602, "export needs a path")
    _open_scene(params)
    fmt = _format(params, path)
    names = [n for n in (params.get("objects") or []) if n]
    selection = bool(names)
    if selection:
        bpy.ops.object.select_all(action="DESELECT")
        for n in names:
            _object(n).select_set(True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if fmt in ("glb", "gltf"):
        bpy.ops.export_scene.gltf(filepath=path, export_format="GLB" if fmt == "glb" else "GLTF_SEPARATE", use_selection=selection)
    elif fmt == "fbx":
        bpy.ops.export_scene.fbx(filepath=path, use_selection=selection)
    elif fmt == "obj":
        bpy.ops.wm.obj_export(filepath=path, export_selected_objects=selection)
    else:
        bpy.ops.wm.usd_export(filepath=path, selected_objects_only=selection)
    _save(params)
    return {"path": path, "format": fmt, "objects": names or [o.name for o in _scene().objects]}


def m_animate(params, task):
    _open_scene(params)
    scene = _scene()
    obj = _object(params.get("object"))
    start = int(params.get("frame_start", 1))
    end = max(start, int(params.get("frame_end", start + 119)))
    scene.frame_start, scene.frame_end = start, end
    scene.render.fps = int(params.get("fps", scene.render.fps))

    prefs = bpy.context.preferences.edit
    previous = prefs.keyframe_new_interpolation_type
    prefs.keyframe_new_interpolation_type = "LINEAR" if params.get("turntable") else "BEZIER"
    try:
        keys = params.get("keyframes") or []
        if params.get("turntable") and not keys:
            obj.rotation_mode = "XYZ"
            base = obj.rotation_euler.z
            obj.rotation_euler.z = base
            obj.keyframe_insert(data_path="rotation_euler", index=2, frame=start)
            # Ending one frame past the range makes the loop seamless.
            obj.rotation_euler.z = base + 2 * math.pi
            obj.keyframe_insert(data_path="rotation_euler", index=2, frame=end + 1)
            obj.rotation_euler.z = base
        for i, k in enumerate(keys):
            frame = int(k.get("frame", start))
            if "location" in k:
                obj.location = k["location"]
                obj.keyframe_insert(data_path="location", frame=frame)
            if "rotation" in k:
                obj.rotation_mode = "XYZ"
                obj.rotation_euler = [math.radians(a) for a in k["rotation"]]
                obj.keyframe_insert(data_path="rotation_euler", frame=frame)
            if "scale" in k:
                obj.scale = k["scale"]
                obj.keyframe_insert(data_path="scale", frame=frame)
            _set_progress(task, (i + 1) / max(1, len(keys)))
    finally:
        prefs.keyframe_new_interpolation_type = previous
    scene.frame_set(start)
    _save(params)
    return {"object": obj.name, "frame_start": start, "frame_end": end, "keys": len(params.get("keyframes") or []) or 2}


def m_render(params, task):
    _open_scene(params)
    scene = _scene()
    r = scene.render
    r.engine = _engine_id(params.get("engine"))
    res = params.get("resolution") or [r.resolution_x, r.resolution_y]
    r.resolution_x, r.resolution_y = int(res[0]), int(res[1])
    r.resolution_percentage = 100
    samples = int(params.get("samples", 32))
    if r.engine == "CYCLES":
        scene.cycles.samples = samples
        scene.cycles.device = "CPU"
    elif r.engine.startswith("BLENDER_EEVEE"):
        scene.eevee.taa_render_samples = samples
    r.image_settings.file_format = "PNG"
    _ensure_camera_and_light()

    raw_output = params.get("output") or os.path.join(bpy.app.tempdir, "primordia_render.png")
    output = os.path.abspath(raw_output)
    animation = bool(params.get("animation"))
    if animation:
        start = int(params.get("frame_start", scene.frame_start))
        end = max(start, int(params.get("frame_end", scene.frame_end)))
        scene.frame_start, scene.frame_end = start, end
        # A trailing separator (or an existing folder) means "this folder"; abspath drops the separator.
        is_dir = raw_output.endswith(("/", "\\")) or os.path.isdir(output) or not os.path.splitext(output)[1]
        out_dir = output if is_dir else os.path.dirname(output)
        os.makedirs(out_dir, exist_ok=True)
        r.filepath = os.path.join(out_dir, "frame_")
        total = end - start + 1

        def on_frame(scn, *_):
            _set_progress(task, (scn.frame_current - start + 1) / total, f"frame {scn.frame_current}/{end}")

        bpy.app.handlers.render_post.append(on_frame)
        try:
            bpy.ops.render.render(animation=True)
        finally:
            bpy.app.handlers.render_post.remove(on_frame)
        first = os.path.join(out_dir, f"frame_{start:04d}.png")
        result = {"output": first, "output_dir": out_dir, "frames": total, "engine": r.engine}
    else:
        os.makedirs(os.path.dirname(output), exist_ok=True)
        r.filepath = output
        bpy.ops.render.render(write_still=True)
        result = {"output": output, "output_dir": os.path.dirname(output), "frames": 1, "engine": r.engine}
    _save(params)
    return result


METHODS = {
    "ping": m_ping,
    "scene.info": m_scene_info,
    "scene.reset": m_scene_reset,
    "mesh.create": m_mesh_create,
    "import": m_import,
    "export": m_export,
    "animate": m_animate,
    "render": m_render,
}


# ------------------------------------------------------------------ dispatch

def run_on_main(method, params, task=None):
    """Runs on Blender's main thread."""
    fn = METHODS.get(method)
    if fn is None:
        raise RpcError(-32601, f"unknown method {method}")
    return fn(params, task)


def pump_once(timeout):
    try:
        item = WORK.get(timeout=timeout)
    except queue.Empty:
        return
    method, params, task, done = item
    if task:
        with TASKS_LOCK:
            TASKS[task]["state"] = "running"
    try:
        result = run_on_main(method, params, task)
        if task:
            with TASKS_LOCK:
                TASKS[task].update(state="done", progress=1.0, result=result, finished=time.time())
        if done:
            done["result"] = result
    except Exception as exc:  # report every failure to the caller, never crash the server
        message = str(exc) if isinstance(exc, RpcError) else f"{type(exc).__name__}: {exc}"
        if not isinstance(exc, RpcError):
            traceback.print_exc()
        if task:
            with TASKS_LOCK:
                TASKS[task].update(state="failed", error=message, finished=time.time())
        if done:
            done["error"] = (getattr(exc, "code", -32000), message)
    finally:
        if done:
            done["event"].set()


def prune_tasks():
    cutoff = time.time() - 3600
    with TASKS_LOCK:
        for k in [k for k, t in TASKS.items() if t.get("finished", time.time()) < cutoff]:
            del TASKS[k]


class Handler(BaseHTTPRequestHandler):
    server_version = "PrimordiaBlenderRPC/1.0"

    def log_message(self, fmt, *args):
        pass

    def _reply(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path.rstrip("/") != "/rpc":
            return self._reply(404, {"error": "POST /rpc"})
        rid = None
        try:
            length = int(self.headers.get("Content-Length") or 0)
            req = json.loads(self.rfile.read(length) or b"{}")
            rid = req.get("id")
            method = req.get("method")
            params = req.get("params") or {}
            if not isinstance(method, str) or not isinstance(params, dict):
                raise RpcError(-32600, "invalid request")
            if method == "ping":
                # Answered here, not on the main thread, so a long render never looks like a dead server.
                with TASKS_LOCK:
                    busy = sum(1 for t in TASKS.values() if t["state"] in ("queued", "running"))
                return self._reply(200, {"jsonrpc": "2.0", "id": rid, "result": {
                    "blender": bpy.app.version_string, "background": bpy.app.background, "busy": busy}})
            if method == "task.status":
                with TASKS_LOCK:
                    t = TASKS.get(params.get("task"))
                    snapshot = dict(t) if t else None
                if snapshot is None:
                    raise RpcError(-32602, "unknown task")
                snapshot.pop("finished", None)
                return self._reply(200, {"jsonrpc": "2.0", "id": rid, "result": snapshot})
            if method not in METHODS:
                raise RpcError(-32601, f"unknown method {method}")
            if params.pop("async", False):
                task = uuid.uuid4().hex[:12]
                with TASKS_LOCK:
                    TASKS[task] = {"state": "queued", "progress": 0.0, "message": "", "result": None, "error": "", "method": method}
                WORK.put((method, params, task, None))
                prune_tasks()
                return self._reply(200, {"jsonrpc": "2.0", "id": rid, "result": {"task": task}})
            done = {"event": threading.Event()}
            WORK.put((method, params, None, done))
            if not done["event"].wait(SYNC_TIMEOUT):
                raise RpcError(-32000, f"{method} did not finish within {SYNC_TIMEOUT:.0f} s; call it with async")
            if "error" in done:
                code, message = done["error"]
                raise RpcError(code, message)
            return self._reply(200, {"jsonrpc": "2.0", "id": rid, "result": done["result"]})
        except RpcError as exc:
            return self._reply(200, {"jsonrpc": "2.0", "id": rid, "error": {"code": exc.code, "message": str(exc)}})
        except Exception as exc:
            return self._reply(200, {"jsonrpc": "2.0", "id": rid, "error": {"code": -32700, "message": f"{type(exc).__name__}: {exc}"}})


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    port, host = 7791, "127.0.0.1"
    empty = "--empty" in argv
    for i, a in enumerate(argv):
        if a == "--port" and i + 1 < len(argv):
            port = int(argv[i + 1])
        if a == "--host" and i + 1 < len(argv):
            host = argv[i + 1]
    return host, port, empty


def main():
    host, port, empty = parse_args()
    if empty:
        # Start from nothing, not the factory cube, camera and light.
        bpy.ops.wm.read_factory_settings(use_empty=True)
    httpd = ThreadingHTTPServer((host, port), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    print(f"[primordia] Blender {bpy.app.version_string} RPC listening on http://{host}:{port}/rpc", flush=True)
    if bpy.app.background:
        # No event loop in background mode: this script is the main loop.
        try:
            while True:
                pump_once(0.2)
        except KeyboardInterrupt:
            pass
        finally:
            httpd.shutdown()
    else:
        def timer():
            pump_once(0.0)
            return 0.05

        bpy.app.timers.register(timer, persistent=True)


if __name__ == "__main__":
    main()
