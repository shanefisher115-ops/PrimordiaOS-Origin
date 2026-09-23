import json
import socket
import unreal

HOST = "127.0.0.1"
PORT = 7777

def spawn_actor(class_name, location):
    actor_class = unreal.load_object(None, class_name)
    world = unreal.EditorLevelLibrary.get_editor_world()
    actor = unreal.Actor.spawn_actor(actor_class, location)
    return str(actor)

def set_camera(location, rotation):
    cam = unreal.CineCameraActor()
    cam.set_actor_location(location)
    cam.set_actor_rotation(rotation)
    return "camera_updated"

def render_frame():
    unreal.SequencerTools.render_movie()
    return "frame_rendered"

def handle_request(data):
    req = json.loads(data)
    cmd = req["cmd"]

    if cmd == "spawn_actor":
        return spawn_actor(req["class"], unreal.Vector(*req["location"]))

    if cmd == "set_camera":
        return set_camera(unreal.Vector(*req["location"]), unreal.Rotator(*req["rotation"]))

    if cmd == "render_frame":
        return render_frame()

    return "unknown_command"

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind((HOST, PORT))
    s.listen()
    print("Unreal RPC Server running...")

    while True:
        conn, addr = s.accept()
        with conn:
            data = conn.recv(4096).decode("utf-8")
            result = handle_request(data)
            conn.sendall(json.dumps({"result": result}).encode("utf-8"))
