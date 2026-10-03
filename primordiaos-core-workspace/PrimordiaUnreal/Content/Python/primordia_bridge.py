import unreal
import socket
import json
import threading
import queue

class PrimordiaServerBridge:
    def __init__(self, host="localhost", port=3000):
        self.host = host
        self.port = port
        self.running = True
        self.command_queue = queue.Queue()
        
        self.start_server()
        self.register_tick()

    def start_server(self):
        def server_loop():
            server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                server.bind((self.host, self.port))
                server.listen(5)
                unreal.log(f"[PrimordiaBridge] Server online and listening on {self.host}:{self.port}")
                
                while self.running:
                    client, addr = server.accept()
                    try:
                        data = client.recv(8192).decode('utf-8')
                        if data:
                            if "\r\n\r\n" in data:
                                data = data.split("\r\n\r\n", 1)[1]
                            self.command_queue.put(data)
                        client.sendall(b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\":\"manifested\"}")
                    except Exception as e:
                        unreal.log_error(f"[PrimordiaBridge] Client read error: {e}")
                    finally:
                        client.close()
            except Exception as e:
                unreal.log_error(f"[PrimordiaBridge] Server bind error: {e}")
            finally:
                server.close()

        threading.Thread(target=server_loop, daemon=True).start()

    def register_tick(self):
        def on_tick(delta_time):
            while not self.command_queue.empty():
                try:
                    raw_data = self.command_queue.get_nowait()
                    self.execute_main_thread_command(raw_data)
                except queue.Empty:
                    break
                except Exception as e:
                    unreal.log_error(f"[PrimordiaBridge] Tick queue error: {e}")

        self.tick_handle = unreal.register_slate_post_tick_callback(on_tick)

    def execute_main_thread_command(self, raw_data):
        """Executed strictly on the Unreal main thread using safe world coordinates."""
        try:
            msg = json.loads(raw_data)
            action = msg.get("action", "Unknown")
            unreal.log(f"[PrimordiaBridge] Processing command: {action}")
            
            actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
            
            if action == "TextToWorld":
                prompt = msg.get("prompt", "").lower()
                unreal.log(f"[TextToWorld] Manifesting: '{prompt}'")
                
                mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube.Cube")
                base_mat = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial")
                
                # Deterministic world anchor (No viewport queries = zero crashes)
                scale_val = 2.0
                spawn_loc = unreal.Vector(0.0, 400.0, 0.0) # Sits on ground plane, in front of origin
                    
                if mesh:
                    actor = actor_subsystem.spawn_actor_from_object(mesh, spawn_loc, unreal.Rotator(0, 0, 0))
                    if actor:
                        actor.set_actor_scale3d(unreal.Vector(scale_val, scale_val, scale_val))
                        if base_mat:
                            dmi = unreal.MaterialInstanceDynamic.create(base_mat, actor)
                            if "red" in prompt:
                                dmi.set_vector_parameter_value("Color", unreal.LinearColor(1.0, 0.0, 0.0, 1.0))
                            if "metal" in prompt or "metallic" in prompt:
                                dmi.set_scalar_parameter_value("Metallic", 1.0)
                                dmi.set_scalar_parameter_value("Roughness", 0.2)
                            actor.static_mesh_component.set_material(0, dmi)
                            
                        actor_subsystem.set_selected_level_actors([actor])
                        unreal.log("[TextToWorld] Cube manifested at fixed world coordinates!")
                else:
                    unreal.log_error("[TextToWorld] Failed to load base cube mesh.")
                    
            elif action == "SwarmConstruct":
                blueprint = msg.get("blueprint", [])
                unreal.log(f"[SwarmConstruct] Building {len(blueprint)} components...")
                
                mesh = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube.Cube")
                base_mat = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial")
                
                bbox = mesh.get_bounding_box() if mesh else None
                mesh_min_z = bbox.min.z if bbox else -50.0

                # Fixed world origin anchor for swarms
                origin = unreal.Vector(0.0, 600.0, 0.0)
                
                spawned = []
                for item in blueprint:
                    loc_d = item.get("location", {"x":0,"y":0,"z":0})
                    scl_d = item.get("scale", {"x":1,"y":1,"z":1})
                    
                    scale_z = scl_d.get("z", 1)
                    z_clearance = (-mesh_min_z) * scale_z
                    
                    loc = unreal.Vector(
                        origin.x + loc_d.get("x", 0), 
                        origin.y + loc_d.get("y", 0), 
                        origin.z + loc_d.get("z", 0) + z_clearance
                    )
                    
                    if item.get("type") == "light":
                        light = actor_subsystem.spawn_actor_from_class(unreal.PointLight.static_class(), loc, unreal.Rotator(0,0,0))
                        if light: spawned.append(light)
                        continue
                        
                    if mesh:
                        actor = actor_subsystem.spawn_actor_from_object(mesh, loc, unreal.Rotator(0,0,0))
                        if actor:
                            actor.set_actor_scale3d(unreal.Vector(scl_d.get("x",1), scl_d.get("y",1), scale_z))
                            if base_mat:
                                dmi = unreal.MaterialInstanceDynamic.create(base_mat, actor)
                                if item.get("color") == "gold":
                                    dmi.set_vector_parameter_value("Color", unreal.LinearColor(1.0, 0.84, 0.0, 1.0))
                                    dmi.set_scalar_parameter_value("Metallic", 1.0)
                                actor.static_mesh_component.set_material(0, dmi)
                            spawned.append(actor)
                            
                if spawned:
                    actor_subsystem.set_selected_level_actors(spawned)
                    unreal.log("[SwarmConstruct] Architectural swarm built safely at fixed origin!")
                            
        except Exception as e:
            unreal.log_error(f"[PrimordiaBridge] Execution error: {e}")

# Auto-instantiate server bridge
bridge = PrimordiaServerBridge()