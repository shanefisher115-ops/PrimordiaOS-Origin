"""
headless_realm.py: run unreal_bridge.py WITHOUT Unreal, on a stand-in for Unreal's Python API.

For testing the protocol, the trainer and the evolution loop quickly (and in CI), not for real
training: there is no physics, no navigation and no rendering. Agents are points, resource nodes
are points, and raycasts hit a circular wall at --world-radius.

    python headless_realm.py --port 9777 --agents 20 --resources 12
    python headless_realm.py --port 9778 --realm realm-b --speed 4     # 4x faster than real time
    python agent_trainer.py --realm 127.0.0.1:9777

The same unreal_bridge.py file runs here and in the editor; only the `unreal` module differs.
"""

import argparse
import json
import math
import os
import random
import sys
import tempfile
import time
import types


# ----------------------------------------------------------------------------------------------
# A minimal stand-in for the parts of Unreal's Python API that unreal_bridge.py uses
# ----------------------------------------------------------------------------------------------

def make_fake_unreal(world_radius, saved_dir):
    u = types.ModuleType("unreal")
    u.log = lambda m: print(m)
    u.log_warning = lambda m: print("WARNING:", m)
    u.log_error = lambda m: print("ERROR:", m)

    class Name(str):
        pass

    class Vector:
        def __init__(self, x=0.0, y=0.0, z=0.0):
            self.x, self.y, self.z = float(x), float(y), float(z)

        def __sub__(self, o):
            return Vector(self.x - o.x, self.y - o.y, self.z - o.z)

        def __add__(self, o):
            return Vector(self.x + o.x, self.y + o.y, self.z + o.z)

    class Rotator:
        def __init__(self, roll=0.0, pitch=0.0, yaw=0.0):
            self.roll, self.pitch, self.yaw = float(roll), float(pitch), float(yaw % 360.0)

    class Transform:
        def __init__(self, translation, rotation, scale):
            self.translation, self.rotation, self.scale3d = translation, rotation, scale

    class FakeClass:
        def __init__(self, name):
            self._name = name

        def get_name(self):
            return self._name

    class Actor:
        _count = 0

        def __init__(self, label, location, tags=(), cls="StaticMeshActor"):
            Actor._count += 1
            self._name = f"{cls}_{Actor._count}"
            self._label = label
            self._loc = Vector(*location)
            self._rot = Rotator(0, 0, random.uniform(0, 360))
            self._scale = Vector(1, 1, 1)
            self.tags = [Name(t) for t in tags]
            self._valid = True
            self._hidden = False
            self._cls = FakeClass(cls)

        def get_path_name(self):
            return f"/Game/Headless.Headless:PersistentLevel.{self._name}"

        def get_name(self):
            return self._name

        def get_actor_label(self):
            return self._label

        def get_class(self):
            return self._cls

        def get_editor_property(self, name):
            if name == "tags":
                return list(self.tags)
            raise Exception(f"no property {name}")

        def set_editor_property(self, name, value):
            if name != "tags":
                raise Exception(f"no property {name}")
            self.tags = [Name(str(v)) for v in value]

        def get_actor_location(self):
            return Vector(self._loc.x, self._loc.y, self._loc.z)

        def get_actor_rotation(self):
            return Rotator(self._rot.roll, self._rot.pitch, self._rot.yaw)

        def get_actor_scale3d(self):
            return Vector(self._scale.x, self._scale.y, self._scale.z)

        def get_actor_transform(self):
            return Transform(self.get_actor_location(), self.get_actor_rotation(), self.get_actor_scale3d())

        def set_actor_location(self, v, sweep, teleport):
            # Keep agents inside the world's wall.
            r = math.hypot(v.x, v.y)
            if r > world_radius:
                v = Vector(v.x * world_radius / r, v.y * world_radius / r, v.z)
            self._loc = Vector(v.x, v.y, v.z)
            return None

        def set_actor_rotation(self, r, teleport):
            self._rot = Rotator(r.roll, r.pitch, r.yaw)
            return True

        def set_actor_scale3d(self, v):
            self._scale = Vector(v.x, v.y, v.z)

        def set_actor_transform(self, t, sweep, teleport):
            self._loc, self._rot, self._scale = t.translation, t.rotation, t.scale3d
            return None

        def set_is_temporarily_hidden_in_editor(self, hidden):
            self._hidden = hidden

        def set_actor_hidden_in_game(self, hidden):
            self._hidden = hidden

        def set_actor_enable_collision(self, enabled):
            pass

        def destroy_actor(self):
            self._valid = False
            WORLD.actors.remove(self)

    class World:
        def __init__(self):
            self.actors = []

        def get_path_name(self):
            return "/Game/Headless.Headless"

    WORLD = World()

    class UnrealEditorSubsystem:
        def get_game_world(self):
            return None

        def get_editor_world(self):
            return WORLD

    class EditorActorSubsystem:
        def destroy_actor(self, actor):
            actor.destroy_actor()
            return True

        def duplicate_actor(self, actor, world=None, offset=Vector()):
            loc = actor.get_actor_location() + offset
            dup = Actor(actor._label + "_copy", (loc.x, loc.y, loc.z), actor.tags)
            WORLD.actors.append(dup)
            return dup

    subsystems = {UnrealEditorSubsystem: UnrealEditorSubsystem(), EditorActorSubsystem: EditorActorSubsystem()}

    class GameplayStatics:
        @staticmethod
        def get_all_actors_with_tag(world, tag):
            return [a for a in world.actors if tag in a.tags]

        @staticmethod
        def break_hit_result(hit):
            return (True, False, hit["time"])

    class SystemLibrary:
        @staticmethod
        def is_valid(obj):
            return getattr(obj, "_valid", False)

        @staticmethod
        def line_trace_single(world, start, end, channel, complex_, ignore, debug, ignore_self):
            # Hit the circular wall at world_radius, if the ray reaches it.
            dx, dy = end.x - start.x, end.y - start.y
            a = dx * dx + dy * dy
            b = 2 * (start.x * dx + start.y * dy)
            c = start.x ** 2 + start.y ** 2 - world_radius ** 2
            disc = b * b - 4 * a * c
            if a == 0 or disc < 0:
                return None
            t = (-b + math.sqrt(disc)) / (2 * a)
            return {"time": t} if 0.0 <= t <= 1.0 else None

    class Paths:
        @staticmethod
        def project_saved_dir():
            return saved_dir

    callbacks = {}

    def register_slate_post_tick_callback(fn):
        handle = len(callbacks) + 1
        callbacks[handle] = fn
        return handle

    def unregister_slate_post_tick_callback(handle):
        callbacks.pop(handle, None)

    u.Name, u.Vector, u.Rotator, u.Transform, u.Actor = Name, Vector, Rotator, Transform, Actor
    u.UnrealEditorSubsystem, u.EditorActorSubsystem = UnrealEditorSubsystem, EditorActorSubsystem
    u.get_editor_subsystem = lambda cls: subsystems[cls]
    u.GameplayStatics, u.SystemLibrary, u.Paths = GameplayStatics, SystemLibrary, Paths
    u.TraceTypeQuery = types.SimpleNamespace(TRACE_TYPE_QUERY1=1)
    u.DrawDebugTrace = types.SimpleNamespace(NONE=0)
    u.register_slate_post_tick_callback = register_slate_post_tick_callback
    u.unregister_slate_post_tick_callback = unregister_slate_post_tick_callback
    u._world, u._callbacks = WORLD, callbacks
    return u


def populate(u, agents, resources, pool, radius, species):
    rnd = lambda: (random.uniform(-0.8, 0.8) * radius, random.uniform(-0.8, 0.8) * radius, 0.0)
    for s in species:
        for i in range(agents):
            u._world.actors.append(u.Actor(f"{s}_{i}", rnd(), [s]))
        for i in range(pool):
            pooled = u.Actor(f"{s}_pool_{i}", (0, 0, -10000), [s, "RLPool"])
            pooled._hidden = True
            u._world.actors.append(pooled)
    for i in range(resources):
        u._world.actors.append(u.Actor(f"Resource_{i}", rnd(), ["Resource"]))


def main(argv=None):
    p = argparse.ArgumentParser(description="unreal_bridge.py on a fake Unreal (no physics, no rendering)")
    p.add_argument("--port", type=int, default=9777)
    p.add_argument("--realm", default="headless-0")
    p.add_argument("--hz", type=float, default=20.0)
    p.add_argument("--agents", type=int, default=16, help="agents per species")
    p.add_argument("--pool", type=int, default=32, help="dormant actors per species (for births)")
    p.add_argument("--resources", type=int, default=24)
    p.add_argument("--world-radius", type=float, default=3000.0, help="cm")
    p.add_argument("--speed", type=float, default=1.0, help="simulated seconds per real second")
    p.add_argument("--seconds", type=float, default=0.0, help="stop after this much real time (0 = forever)")
    p.add_argument("--saved", default=None, help="where agent records are saved (default: a temp folder)")
    p.add_argument("--respawn-below", type=int, default=4, help="immigration floor per species (0 = off)")
    p.add_argument("--species", nargs="+", default=None, help="species to populate (default: all three)")
    p.add_argument("--bridge", default="{}", help='extra BridgeConfig fields as JSON, e.g. \'{"maturity_s": 0}\'')
    p.add_argument("--seed", type=int, default=1)
    a = p.parse_args(argv)
    random.seed(a.seed)

    saved = a.saved or os.path.join(tempfile.gettempdir(), "headless_realm_saved")
    u = make_fake_unreal(a.world_radius, saved)
    sys.modules["unreal"] = u
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import unreal_bridge

    species = tuple(a.species) if a.species else unreal_bridge.BridgeConfig().species
    populate(u, a.agents, a.resources, a.pool, a.world_radius, species)
    bridge = unreal_bridge.start_bridge(port=a.port, hz=a.hz, realm=a.realm, persist=a.saved is not None, species=species,
                                        respawn_below=a.respawn_below, **json.loads(a.bridge))
    if bridge is None:
        return 1
    frame = 1.0 / 60.0
    t_end = time.monotonic() + a.seconds if a.seconds > 0 else None
    last_status = time.monotonic()
    try:
        while t_end is None or time.monotonic() < t_end:
            t0 = time.monotonic()
            for fn in list(u._callbacks.values()):
                fn(frame * a.speed)
            if time.monotonic() - last_status > 10:
                last_status = time.monotonic()
                unreal_bridge.status()
            time.sleep(max(0.0, frame - (time.monotonic() - t0)))
    except KeyboardInterrupt:
        pass
    finally:
        unreal_bridge.status()
        unreal_bridge.stop_bridge()
    return 0


if __name__ == "__main__":
    sys.exit(main())
