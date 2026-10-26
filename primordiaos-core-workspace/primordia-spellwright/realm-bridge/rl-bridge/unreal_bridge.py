"""
unreal_bridge.py: the Unreal side of the Primordia evolutionary ecosystem (protocol "primordia-eco/1").

Runs INSIDE Unreal Editor 5.4 (Python Editor Script Plugin). It is the world: it tracks agent
actors (Lumen-Seed, Gravemind, Echo-Swarm and any species that evolve from them), runs the
ecosystem rules (XP, levels, health, energy, age, resources, territory, combat, death), senses the
world for each agent (raycasts, nearby resources, enemies and allies), streams state to the
PyTorch trainer over TCP, and applies the trainer's actions and evolution commands.

    Unreal Python console (Window > Output Log > "Python"):
        import unreal_bridge
        unreal_bridge.start_bridge()                       # 127.0.0.1:9777, 20 Hz
        unreal_bridge.start_bridge(port=9778, hz=30, realm="realm-b")
        unreal_bridge.status()
        unreal_bridge.save()                               # write XP/lineage now
        unreal_bridge.stop_bridge()                        # also saves

The docs (README.md next to this file) cover setup, the protocol, species and scaling.

How a tick works (all on the game thread, from the Slate post-tick callback)
--------------------------------------------------------------------------
    accept / read trainer messages -> apply actions and commands (moves, reproduction, ...)
    every 1/hz s:  read transforms -> ecosystem step (XP, energy, combat, death) -> sensors
                   -> send one "state" snapshot (with the events since the last one)

Unreal objects may only be touched on the game thread, so there are no worker threads: the
socket is non-blocking and polled once per editor frame. UE 5.4 has no Python timer API on
EditorUtilitySubsystem; register_slate_post_tick_callback plus a fixed-rate accumulator is the
supported way to tick.

Editor world vs Play-In-Editor
------------------------------
world="auto" uses the PIE world while one runs, else the editor world. Moving, tagging, XP and
death work in both. New actors are the catch: Unreal's editor scripting refuses to duplicate or
spawn while PIE runs, so reproduction draws from a POOL of dormant actors (tag them "RLPool" plus
their species tag; dead agents return to the pool too). In the editor world, when the pool is
empty, children are duplicated from the parent instead.

Where agent data lives
----------------------
Each agent gets a stable id tag "RLID:<hex>" the first time it is seen. Its record (XP, level,
health, energy, age, genome, lineage) lives here, keyed by that id, and is saved to
<Project>/Saved/RLBridge/<realm>.json every 30 s and on stop, so progression survives editor
restarts. If an actor has Blueprint variables named XP, Level, Health, Energy or Age, the bridge
mirrors the values into them each tick so gameplay Blueprints can react.
"""

import json
import math
import os
import random
import socket
import time
import uuid
from dataclasses import dataclass

import unreal

PROTOCOL = "primordia-eco/1"
LOG_PREFIX = "[EcoBridge]"


def _log(msg):
    unreal.log(f"{LOG_PREFIX} {msg}")


def _warn(msg):
    unreal.log_warning(f"{LOG_PREFIX} {msg}")


def _error(msg):
    unreal.log_error(f"{LOG_PREFIX} {msg}")


# ==============================================================================================
# Configuration
# ==============================================================================================

@dataclass
class BridgeConfig:
    host: str = "127.0.0.1"          # localhost only: the bridge has no authentication
    port: int = 9777
    hz: float = 20.0                 # snapshot + ecosystem rate, 20-60
    realm: str = "realm-0"           # name of this world; one bridge per realm
    species: tuple = ("LumenSeed", "Gravemind", "EchoSwarm")   # root species = discovery tags
    agent_tag: str = "RLAgent"       # added to every tracked agent (finds evolved species too)
    resource_tag: str = "Resource"   # resource nodes (food / light / minerals)
    territory_tag: str = "Territory" # optional territory anchors; else a grid of cells
    pool_tag: str = "RLPool"         # dormant actors used for births (needed in PIE)
    world: str = "auto"              # "auto" | "editor" | "game"
    ecosystem: bool = True           # run the XP/energy/combat rules here (off: transforms only)
    rays: int = 8                    # raycasts per agent, spread around its heading
    ray_length_cm: float = 1500.0
    ray_budget: int = 512            # traces per tick across all agents (round-robin beyond)
    sense_radius_cm: float = 2500.0  # nearest resource / enemy / ally search radius
    territory_cell_cm: float = 5000.0
    max_agents: int = 2000           # births are refused above this
    respawn_below: int = 4           # immigration: a root species below this gets a fresh agent
                                     # from the pool (one per second), so no species dies out for good
    persist: bool = True
    save_every_s: float = 30.0
    max_step_cm: float = 300.0       # clamp per action, per axis (scaled by the agent's speed gene)
    max_step_deg: float = 45.0
    resource_capacity: float = 100.0
    resource_regen_per_s: float = 2.0
    gather_radius_cm: float = 300.0
    gather_rate_per_s: float = 12.0
    attack_radius_cm: float = 250.0
    cohesion_radius_cm: float = 600.0


# ==============================================================================================
# Species rules (the gameplay half of species logic; the trainer holds the learning half)
# ==============================================================================================

@dataclass
class SpeciesRules:
    diet: str                  # "forager" eats resource nodes, "predator" eats other agents
    reproduction: str          # "budding" | "splitting" | "fission"
    max_health: float
    max_energy: float
    max_age_s: float
    drain_per_s: float         # energy upkeep per second
    move_cost_per_m: float     # energy per metre moved
    attack_per_s: float        # damage per second to one target in reach
    armor: float               # fraction of damage ignored (plus the armor gene)
    reproduce_energy: float    # fraction of max energy needed to reproduce
    xp: dict                   # XP per unit of each source (see _ecosystem_step)
    per_level: dict            # gains per level above 1


SPECIES_RULES = {
    # Grows on resource nodes. XP from gathering, from growing while well fed, and from surviving.
    # Levels make it larger and sturdier. Reproduces by budding: one small child, parent keeps most.
    "LumenSeed": SpeciesRules(
        diet="forager", reproduction="budding", max_health=60, max_energy=100, max_age_s=600,
        drain_per_s=0.4, move_cost_per_m=0.1, attack_per_s=0, armor=0.0, reproduce_energy=0.7,
        xp={"gather": 1.0, "growth": 0.5, "survival": 0.1},
        per_level={"size": 0.08, "max_health": 8.0}),
    # Hunts other species. XP from damage, kills and holding territory. Levels add armor and
    # aggression. Reproduces by splitting: health and energy are halved between two equals.
    "Gravemind": SpeciesRules(
        diet="predator", reproduction="splitting", max_health=120, max_energy=120, max_age_s=500,
        drain_per_s=0.7, move_cost_per_m=0.15, attack_per_s=20, armor=0.2, reproduce_energy=0.8,
        xp={"damage": 0.5, "kill": 60.0, "territory": 0.4, "survival": 0.05},
        per_level={"armor": 0.03, "aggression": 0.05, "max_health": 12.0}),
    # Small foragers that thrive together. XP from cohesion (allies close by), from gathering, and
    # a bonus when several gather from one node at once. Levels add sense range and speed.
    # Reproduces by fission: energy splits into 2-3 small children.
    "EchoSwarm": SpeciesRules(
        diet="forager", reproduction="fission", max_health=30, max_energy=60, max_age_s=400,
        drain_per_s=0.3, move_cost_per_m=0.05, attack_per_s=0, armor=0.0, reproduce_energy=0.75,
        xp={"gather": 0.5, "cohesion": 0.15, "collective": 3.0, "survival": 0.1},
        per_level={"sense": 0.05, "speed": 0.03, "max_health": 4.0}),
}

# Heritable traits. Mutation moves them inside these bounds; the trainer evolves them.
GENE_BOUNDS = {
    "size": (0.4, 3.0),         # actor scale multiplier
    "speed": (0.5, 2.0),        # multiplies the movement clamp
    "armor": (0.0, 0.6),        # extra damage reduction
    "aggression": (0.5, 2.0),   # multiplies attack
    "sense": (0.5, 2.0),        # multiplies sense radius
    "metabolism": (0.6, 1.5),   # multiplies energy drain (lower = thriftier, but gathers slower)
}
DEFAULT_GENOME = {"size": 1.0, "speed": 1.0, "armor": 0.0, "aggression": 1.0, "sense": 1.0, "metabolism": 1.0}


def root_species(species):
    """Evolved species are named "<Root>/<n>" (e.g. "Gravemind/2") and keep their root's rules."""
    return species.split("/", 1)[0]


def rules_for(species):
    return SPECIES_RULES.get(root_species(species), SPECIES_RULES["LumenSeed"])


def xp_for_level(level):
    """XP needed to reach a level: 0, 100, 400, 900, ... (level = 1 + floor(sqrt(xp / 100)))."""
    return 100.0 * (level - 1) ** 2


def level_for_xp(xp):
    return 1 + int(math.sqrt(max(0.0, xp) / 100.0))


# ==============================================================================================
# Agent records (persisted)
# ==============================================================================================

class AgentRecord:
    FIELDS = ("id", "species", "xp", "level", "health", "max_health", "energy", "max_energy", "age",
              "generation", "parent", "lineage", "children", "genome", "mutations", "kills",
              "gathered", "territory", "born", "alive", "cause", "world", "origin")

    def __init__(self, agent_id, species):
        r = rules_for(species)
        self.id = agent_id
        self.species = species
        self.xp = 0.0
        self.level = 1
        self.max_health = float(r.max_health)
        self.health = self.max_health
        self.max_energy = float(r.max_energy)
        self.energy = self.max_energy * 0.8
        self.age = 0.0
        self.generation = 0
        self.parent = None
        self.lineage = []            # nearest ancestor first, capped at 16
        self.children = 0
        self.genome = dict(DEFAULT_GENOME)
        self.mutations = 0
        self.kills = 0
        self.gathered = 0.0
        self.territory = None
        self.born = time.time()
        self.alive = True
        self.cause = None            # cause of death
        self.world = None            # package path of the world it lives in
        self.origin = None           # e.g. {"forked_from": "<id>"} when re-adopted from a dead record

    def to_json(self):
        return {k: getattr(self, k) for k in self.FIELDS}

    @classmethod
    def from_json(cls, data):
        rec = cls(data["id"], data.get("species", "LumenSeed"))
        for k in cls.FIELDS:
            if k in data:
                setattr(rec, k, data[k])
        rec.genome = {**DEFAULT_GENOME, **(rec.genome or {})}
        return rec


class LiveAgent:
    """Per-frame data for a tracked actor (not persisted)."""

    __slots__ = ("record", "actor", "pos", "rot", "scale", "prev_pos", "velocity", "home",
                 "rays", "ray_cursor", "props", "dirty_scale")

    def __init__(self, record, actor):
        self.record = record
        self.actor = actor
        loc = actor.get_actor_location()
        self.pos = self.prev_pos = (loc.x, loc.y, loc.z)
        self.rot = (0.0, 0.0, 0.0)
        self.scale = (1.0, 1.0, 1.0)
        self.velocity = (0.0, 0.0, 0.0)
        self.home = actor.get_actor_transform()
        self.rays = None
        self.ray_cursor = 0
        self.props = None            # Blueprint variables this actor has (found once)
        self.dirty_scale = False


# ==============================================================================================
# Small helpers
# ==============================================================================================

def _triple(value, name, limit=None):
    """Validate [x, y, z] of finite numbers, optionally clamped to +-limit."""
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        raise ValueError(f"{name} must be a list of 3 numbers")
    out = []
    for c in value:
        if isinstance(c, bool) or not isinstance(c, (int, float)) or not math.isfinite(c):
            raise ValueError(f"{name} must hold finite numbers")
        out.append(max(-limit, min(limit, float(c))) if limit else float(c))
    return out


def _number(value, name, lo, hi):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{name} must be a finite number")
    return max(lo, min(hi, float(value)))


def _is_valid(obj):
    try:
        return obj is not None and unreal.SystemLibrary.is_valid(obj)
    except Exception:
        return False


def _r(v, nd=2):
    return [round(c, nd) for c in v]


class SpatialGrid:
    """Uniform hash grid on X/Y for neighbour queries in O(neighbours) instead of O(n)."""

    def __init__(self, cell):
        self.cell = max(1.0, cell)
        self.cells = {}

    def insert(self, item, pos):
        key = (int(pos[0] // self.cell), int(pos[1] // self.cell))
        self.cells.setdefault(key, []).append((item, pos))

    def near(self, pos, radius):
        cx, cy, reach = int(pos[0] // self.cell), int(pos[1] // self.cell), max(1, math.ceil(radius / self.cell))
        r2 = radius * radius
        for gx in range(cx - reach, cx + reach + 1):
            for gy in range(cy - reach, cy + reach + 1):
                for item, p in self.cells.get((gx, gy), ()):
                    d2 = (p[0] - pos[0]) ** 2 + (p[1] - pos[1]) ** 2 + (p[2] - pos[2]) ** 2
                    if d2 <= r2:
                        yield item, p, d2


# ==============================================================================================
# The bridge
# ==============================================================================================

class EcoBridge:
    MAX_READ_BYTES_PER_TICK = 1 << 20
    MAX_PENDING_SEND_BYTES = 16 << 20
    MAX_LINE_BYTES = 16 << 20
    MAX_EVENTS = 5000                # per snapshot; older events are dropped (and counted)
    RESCAN_SECONDS = 1.0

    def __init__(self, config):
        if not 1.0 <= config.hz <= 120.0:
            raise ValueError("hz must be between 1 and 120")
        self.cfg = config
        self.server = None
        self.client = None
        self.client_addr = None
        self.inbuf = b""
        self.outbuf = bytearray()
        self.tick_handle = None
        self.in_tick = False
        self.accum = 0.0
        self.rescan_clock = self.RESCAN_SECONDS
        self.save_clock = 0.0
        self.start_time = time.monotonic()
        self.seq = 0
        self.skipped = 0
        self.world = None
        self.world_kind = None
        self.agents = {}             # id -> LiveAgent
        self.records = {}            # id -> AgentRecord (alive and dead, for lineage)
        self.resources = {}          # path -> {"actor", "pos", "amount"}
        self.territory_anchors = []  # (id, pos, radius)
        self.territory_owner = {}    # territory id -> species
        self.pool = []               # dormant actors
        self.events = []             # events not yet sent to a trainer (kept while none is connected)
        self.dropped_events = 0
        self.event_seq = 0           # gap-free event numbering, continued across restarts
        self.event_log = None        # append-only <realm>.events.jsonl (the full history)
        self.missing = {}            # record id -> scans in a row its actor wasn't found
        self.ray_cursor = 0
        self.sensor_cache = {}       # id -> nearest resource / enemy / ally, counts
        self.immigration_clock = 0.0

    # -- lifecycle --------------------------------------------------------------------------------

    def start(self):
        self._load()
        if self.cfg.persist:
            path = self._save_path().replace(".json", ".events.jsonl")
            os.makedirs(os.path.dirname(path), exist_ok=True)
            self.event_log = open(path, "a", encoding="utf-8", buffering=1)   # line-buffered
        srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            srv.bind((self.cfg.host, self.cfg.port))
        except OSError as e:
            srv.close()
            raise RuntimeError(f"cannot listen on {self.cfg.host}:{self.cfg.port}: {e}") from e
        srv.listen(1)
        srv.setblocking(False)
        self.server = srv
        self.tick_handle = unreal.register_slate_post_tick_callback(self._on_tick)
        _log(f"realm '{self.cfg.realm}' listening on {self.cfg.host}:{self.cfg.port} at {self.cfg.hz:g} Hz; "
             f"species {list(self.cfg.species)}; {len(self.records)} saved records")

    def stop(self):
        if self.tick_handle is not None:
            unreal.unregister_slate_post_tick_callback(self.tick_handle)
            self.tick_handle = None
        self._drop_client("bridge stopped")
        if self.server is not None:
            self.server.close()
            self.server = None
        self.save()
        if self.event_log is not None:
            self.event_log.close()
            self.event_log = None
        self.agents.clear()
        _log("stopped")

    # -- persistence ------------------------------------------------------------------------------

    def _save_path(self):
        base = os.path.join(unreal.Paths.project_saved_dir(), "RLBridge")
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in self.cfg.realm)
        return os.path.join(base, f"{safe}.json")

    def _load(self):
        if not self.cfg.persist:
            return
        path = self._save_path()
        if not os.path.exists(path):
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.records = {r["id"]: AgentRecord.from_json(r) for r in data.get("agents", [])}
            self.event_seq = int(data.get("event_seq", 0))
            _log(f"loaded {len(self.records)} agent records from {path}")
        except Exception as e:
            _error(f"could not read {path}: {e!r}; starting fresh")

    def save(self):
        if not self.cfg.persist:
            return
        path = self._save_path()
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            # Keep every living agent and the most recent dead ones (lineage history).
            alive = [r for r in self.records.values() if r.alive]
            # (The full history is in the event log; the record file keeps the recent dead only,
            # and so does memory, so a long run doesn't grow without bound.)
            dead = sorted((r for r in self.records.values() if not r.alive), key=lambda r: r.born)[-5000:]
            self.records = {r.id: r for r in alive + dead}
            tmp = path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump({"protocol": PROTOCOL, "realm": self.cfg.realm, "saved": time.time(),
                           "event_seq": self.event_seq, "agents": [r.to_json() for r in alive + dead]}, f)
            os.replace(tmp, path)
        except Exception as e:
            _error(f"could not save {path}: {e!r}")

    # -- the tick ---------------------------------------------------------------------------------

    def _on_tick(self, delta_seconds):
        if self.in_tick:                 # Slate can re-enter (modal dialogs); skip nested calls
            return
        self.in_tick = True
        try:
            self._accept()
            self._read()
            self._flush()

            self.rescan_clock += delta_seconds
            if self.rescan_clock >= self.RESCAN_SECONDS:
                self.rescan_clock = 0.0
                self._discover()

            self.save_clock += delta_seconds
            if self.save_clock >= self.cfg.save_every_s:
                self.save_clock = 0.0
                self.save()

            self.accum += delta_seconds
            period = 1.0 / self.cfg.hz
            if self.accum >= period:
                dt = min(self.accum, 0.25)   # a long hitch doesn't age everyone at once
                self.accum %= period
                self._read_transforms(dt)
                if self.cfg.ecosystem:
                    self._ecosystem_step(dt)
                self._sense()
                if self.client is not None:
                    self._send_snapshot(dt)
                    self._flush()
                # With no trainer connected, events stay queued (up to MAX_EVENTS) for the next
                # one, and every event is in the event log on disk regardless.
        except Exception as e:           # never let an exception kill the editor tick
            _error(f"tick failed: {e!r}")
        finally:
            self.in_tick = False

    # -- discovery --------------------------------------------------------------------------------

    def _current_world(self):
        sub = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
        game = sub.get_game_world() if self.cfg.world in ("auto", "game") else None
        if game is not None:
            return game, "game"
        if self.cfg.world == "game":
            return None, None
        return sub.get_editor_world(), "editor"

    @staticmethod
    def _tags(actor):
        try:
            return [str(t) for t in actor.tags]
        except Exception:
            return []

    @staticmethod
    def _set_tags(actor, tags):
        actor.set_editor_property("tags", [unreal.Name(t) for t in tags])

    def _discover(self):
        world, kind = self._current_world()
        if world is None:
            self.agents.clear()
            self.world = self.world_kind = None
            return
        if kind != self.world_kind or world != self.world:
            _log(f"tracking the {kind} world")
            if self.world is not None and self.world_kind == "game":
                # A Play session ended: its world is gone, and so is everyone who lived only in it.
                self._lose_world(self._world_path(self.world), "play session ended")
            self.agents.clear()
            self.missing.clear()
            self.world, self.world_kind = world, kind

        gs = unreal.GameplayStatics
        found = {}
        for tag in (self.cfg.agent_tag,) + tuple(self.cfg.species):
            for actor in gs.get_all_actors_with_tag(world, tag):
                tags = self._tags(actor)
                if self.cfg.pool_tag in tags:
                    continue
                found.setdefault(actor.get_path_name(), (actor, tags))

        fresh = {}
        by_actor = {a.actor.get_path_name(): a for a in self.agents.values() if _is_valid(a.actor)}
        for path, (actor, tags) in sorted(found.items()):
            live = by_actor.get(path)
            if live is None:
                live = self._adopt(actor, tags, claimed=fresh)
                if live is None:
                    continue
            fresh[live.record.id] = live
        added = len(fresh.keys() - self.agents.keys())
        removed = len(self.agents.keys() - fresh.keys())
        self.agents = fresh
        if added or removed:
            _log(f"{len(fresh)} agents (+{added} -{removed})")

        # A living record of THIS world whose actor has been gone for 3 scans was deleted in the
        # editor (or by something else): record it as lost, rather than "alive" forever.
        here = self._world_path(world)
        for rec in list(self.records.values()):
            if rec.alive and rec.world == here and rec.id not in fresh:
                self.missing[rec.id] = self.missing.get(rec.id, 0) + 1
                if self.missing[rec.id] >= 3:
                    self._mark_lost(rec, "actor removed")
            else:
                self.missing.pop(rec.id, None)

        # Resource nodes keep their amount between scans.
        res = {}
        for actor in gs.get_all_actors_with_tag(world, self.cfg.resource_tag):
            path = actor.get_path_name()
            old = self.resources.get(path)
            loc = actor.get_actor_location()
            res[path] = {"actor": actor, "pos": (loc.x, loc.y, loc.z),
                         "amount": old["amount"] if old else self.cfg.resource_capacity}
        self.resources = res

        self.territory_anchors = []
        for actor in gs.get_all_actors_with_tag(world, self.cfg.territory_tag):
            loc = actor.get_actor_location()
            radius = max(actor.get_actor_scale3d().x * 1000.0, 500.0)   # scale 1 = 10 m radius
            self.territory_anchors.append((self._label(actor), (loc.x, loc.y, loc.z), radius))

        self.pool = [a for a in gs.get_all_actors_with_tag(world, self.cfg.pool_tag)]

    def _adopt(self, actor, tags, claimed=()):
        """Give a newly seen actor an id and a record, or reattach its saved record.

        A record is only reattached if it is alive and no other actor has claimed it this scan.
        If the id belongs to a dead agent (for example the editor-world copy of an agent that
        died during Play) or to another actor (a copy made with Ctrl+D), the actor becomes a new
        agent with its own id; the dead record and its history are never overwritten. The new
        record notes where it came from in `origin` and keeps the genes."""
        rid = next((t[5:] for t in tags if t.startswith("RLID:")), None)
        species = next((t[8:] for t in tags if t.startswith("Species:")), None)
        if species is None:
            species = next((t for t in tags if t in self.cfg.species), None)
        if species is None:
            return None
        if root_species(species) not in SPECIES_RULES:
            species = root_species(species) if root_species(species) in self.cfg.species else self.cfg.species[0]
        old = self.records.get(rid) if rid else None
        if old is not None and old.alive and rid not in claimed:
            record = old
        else:
            record = AgentRecord(uuid.uuid4().hex[:12], species)
            if old is not None:
                record.origin = {"forked_from": old.id, "reason": "dead" if not old.alive else "duplicate"}
                record.genome = dict(old.genome)
                record.generation = old.generation
                record.lineage = list(old.lineage)
                record.parent = old.parent
            self.records[record.id] = record
            self._event(type="adopted", id=record.id, species=species, origin=record.origin)
        record.world = self._world_path(self.world)
        self._tag_agent(actor, record)
        return LiveAgent(record, actor)

    @staticmethod
    def _world_path(world):
        try:
            return world.get_path_name()
        except Exception:
            return "world"

    def _mark_lost(self, rec, cause):
        rec.alive = False
        rec.cause = f"lost ({cause})"
        self.missing.pop(rec.id, None)
        self._event(type="death", id=rec.id, species=rec.species, cause=rec.cause, age=round(rec.age, 1),
                    xp=round(rec.xp, 1), level=rec.level)

    def _lose_world(self, world_path, cause):
        lost = [r for r in self.records.values() if r.alive and r.world == world_path]
        for rec in lost:
            self._mark_lost(rec, cause)
        if lost:
            _log(f"{len(lost)} agents lived only in {world_path}; recorded as lost ({cause})")

    def _tag_agent(self, actor, record):
        keep = [t for t in self._tags(actor)
                if not (t.startswith("RLID:") or t.startswith("Species:") or t in self.cfg.species
                        or t in (self.cfg.agent_tag, self.cfg.pool_tag))]
        self._set_tags(actor, keep + [self.cfg.agent_tag, root_species(record.species),
                                      f"Species:{record.species}", f"RLID:{record.id}"])

    def _label(self, actor):
        if self.world_kind == "editor":
            try:
                return actor.get_actor_label()
            except Exception:
                pass
        return actor.get_name()

    # -- transforms -------------------------------------------------------------------------------

    def _read_transforms(self, dt):
        for aid, live in list(self.agents.items()):
            actor = live.actor
            if not _is_valid(actor):
                self.agents.pop(aid, None)
                continue
            loc, rot, scl = actor.get_actor_location(), actor.get_actor_rotation(), actor.get_actor_scale3d()
            live.prev_pos = live.pos
            live.pos = (loc.x, loc.y, loc.z)
            live.rot = (rot.roll, rot.pitch, rot.yaw)
            live.scale = (scl.x, scl.y, scl.z)
            if dt <= 0:
                live.velocity = (0.0, 0.0, 0.0)
            else:
                live.velocity = tuple((a - b) / dt for a, b in zip(live.pos, live.prev_pos))

    # -- the ecosystem ----------------------------------------------------------------------------

    def _territory_of(self, pos):
        for tid, p, radius in self.territory_anchors:
            if (p[0] - pos[0]) ** 2 + (p[1] - pos[1]) ** 2 <= radius * radius:
                return tid
        c = self.cfg.territory_cell_cm
        return f"cell:{int(pos[0] // c)}:{int(pos[1] // c)}"

    def _event(self, **event):
        self.event_seq += 1
        event["seq"] = self.event_seq
        event["t"] = round(time.monotonic() - self.start_time, 3)
        event["wall"] = round(time.time(), 3)
        event["realm"] = self.cfg.realm
        if self.event_log is not None:
            try:
                self.event_log.write(json.dumps(event, separators=(",", ":"), default=str) + "\n")
            except Exception as e:
                _error(f"event log write failed: {e!r}")
        if len(self.events) >= self.MAX_EVENTS:      # the trainer's queue only; the log has it all
            self.events.pop(0)
            self.dropped_events += 1
        self.events.append(event)

    def _ecosystem_step(self, dt):
        cfg = self.cfg
        grid = SpatialGrid(cfg.sense_radius_cm)
        for live in self.agents.values():
            grid.insert(live, live.pos)
        res_grid = SpatialGrid(cfg.sense_radius_cm)
        for node in self.resources.values():
            node["amount"] = min(cfg.resource_capacity, node["amount"] + cfg.resource_regen_per_s * dt)
            node["gatherers"] = 0
            res_grid.insert(node, node["pos"])

        # Territory: who holds each zone (the species with most agents in it).
        counts = {}
        for live in self.agents.values():
            rec = live.record
            rec.territory = self._territory_of(live.pos)
            zone = counts.setdefault(rec.territory, {})
            zone[rec.species] = zone.get(rec.species, 0) + 1
        self.territory_owner = {tid: max(z, key=z.get) for tid, z in counts.items()}

        gathers = []
        for live in list(self.agents.values()):
            rec, rules, g = live.record, rules_for(live.record.species), live.record.genome
            if not rec.alive:
                continue
            rec.age += dt
            rec.energy -= rules.drain_per_s * g["metabolism"] * dt
            moved_m = math.dist(live.pos, live.prev_pos) / 100.0
            rec.energy -= rules.move_cost_per_m * moved_m
            self._xp(rec, "survival", dt)

            if rules.diet == "forager":
                best = None
                for node, _, d2 in res_grid.near(live.pos, cfg.gather_radius_cm * g["size"] ** 0.5):
                    if node["amount"] > 0.5 and (best is None or d2 < best[1]):
                        best = (node, d2)
                if best:
                    node = best[0]
                    take = min(node["amount"], cfg.gather_rate_per_s * (2.0 - g["metabolism"]) * dt,
                               rec.max_energy - rec.energy)
                    if take > 0:
                        node["amount"] -= take
                        node["gatherers"] += 1
                        rec.energy += take
                        rec.gathered += take
                        self._xp(rec, "gather", take)
                        gathers.append((live, node))
                if rec.energy > 0.8 * rec.max_energy:
                    self._xp(rec, "growth", dt)

            if rules.diet == "predator" and rules.attack_per_s > 0:
                target = None
                for other, _, d2 in grid.near(live.pos, cfg.attack_radius_cm * g["size"] ** 0.5):
                    if other is live or not other.record.alive:
                        continue
                    if root_species(other.record.species) == root_species(rec.species):
                        continue
                    if target is None or d2 < target[1]:
                        target = (other, d2)
                if target:
                    self._attack(live, target[0], dt)

            if "cohesion" in rules.xp:
                allies = sum(1 for o, _, _ in grid.near(live.pos, cfg.cohesion_radius_cm)
                             if o is not live and o.record.species == rec.species)
                self._xp(rec, "cohesion", min(allies, 8) * dt)

            if "territory" in rules.xp and self.territory_owner.get(rec.territory) == rec.species:
                self._xp(rec, "territory", dt)

        # Echo-Swarm collective success: three or more swarm members on one node at once.
        crowd = {}
        for live, node in gathers:
            if "collective" in rules_for(live.record.species).xp:
                crowd.setdefault(id(node), []).append(live)
        for members in crowd.values():
            if len(members) >= 3:
                for live in members:
                    self._xp(live.record, "collective", dt * len(members) / 3.0)

        for live in list(self.agents.values()):
            self._level_and_death(live)

        self.immigration_clock += dt
        if cfg.respawn_below > 0 and self.immigration_clock >= 1.0:
            self.immigration_clock = 0.0
            alive = {}
            for live in self.agents.values():
                root = root_species(live.record.species)
                alive[root] = alive.get(root, 0) + 1
            for root in cfg.species:
                if alive.get(root, 0) < cfg.respawn_below:
                    self._immigrate(root)

    def _immigrate(self, root):
        """A fresh generation-0 agent from the pool, placed near a random resource node."""
        if len(self.agents) >= self.cfg.max_agents:
            return
        actor = self._take_pooled(root)
        if actor is None:
            return
        if self.resources:
            p = random.choice(list(self.resources.values()))["pos"]
        else:
            p = (0.0, 0.0, 0.0)
        target = unreal.Vector(p[0] + random.uniform(-400, 400), p[1] + random.uniform(-400, 400), p[2])
        self._set_hidden(actor, False)
        actor.set_actor_location(target, False, True)
        rec = AgentRecord(uuid.uuid4().hex[:12], root)
        rec.world = self._world_path(self.world)
        self.records[rec.id] = rec
        self._tag_agent(actor, rec)
        self.agents[rec.id] = LiveAgent(rec, actor)
        self._event(type="birth", id=rec.id, parent=None, species=root, mode="immigration", generation=0,
                    genome=rec.genome)

    def _take_pooled(self, root):
        """A dormant pool actor, preferring one tagged with this root species."""
        for want_root in (True, False):
            for i, pooled in enumerate(self.pool):
                if _is_valid(pooled) and (not want_root or root in self._tags(pooled)):
                    return self.pool.pop(i)
        return None

    def _xp(self, rec, source, amount):
        rate = rules_for(rec.species).xp.get(source)
        if rate:
            rec.xp += rate * amount

    def _attack(self, attacker, target, dt):
        a, t = attacker.record, target.record
        ra, rt = rules_for(a.species), rules_for(t.species)
        power = ra.attack_per_s * a.genome["aggression"] * (1.0 + 0.1 * (a.level - 1)) * dt
        armor = min(0.9, rt.armor + t.genome["armor"])
        damage = power * (1.0 - armor)
        t.health -= damage
        self._xp(a, "damage", damage)
        if t.health <= 0 and t.alive:
            a.kills += 1
            self._xp(a, "kill", 1.0)
            a.energy = min(a.max_energy, a.energy + 0.5 * t.max_energy)
            t.cause = f"killed by {a.id}"

    def _level_and_death(self, live):
        rec = live.record
        rules = rules_for(rec.species)
        rec.energy = min(rec.energy, rec.max_energy)
        new_level = level_for_xp(rec.xp)
        while rec.level < new_level:
            self._apply_level(live, rec.level + 1)
        if rec.health <= 0 or rec.energy <= 0 or rec.age >= rules.max_age_s * (1 + 0.05 * (rec.level - 1)):
            rec.cause = rec.cause or ("starved" if rec.energy <= 0 else
                                      "old age" if rec.health > 0 else "wounds")
            self._kill(live)
        else:
            self._mirror_props(live)

    def _apply_level(self, live, level):
        """Level-up effects, per species (SpeciesRules.per_level)."""
        rec = live.record
        rec.level = level
        gains = rules_for(rec.species).per_level
        rec.max_health += gains.get("max_health", 0.0)
        rec.health = rec.max_health                      # a level-up heals
        for gene in ("size", "armor", "aggression", "sense", "speed"):
            if gene in gains:
                lo, hi = GENE_BOUNDS[gene]
                rec.genome[gene] = min(hi, rec.genome[gene] + gains[gene])
        if "size" in gains:
            live.dirty_scale = True
        self._event(type="level_up", id=rec.id, species=rec.species, level=level)

    def _kill(self, live):
        rec = live.record
        rec.alive = False
        rec.health = max(rec.health, 0.0)
        self._event(type="death", id=rec.id, species=rec.species, cause=rec.cause, age=round(rec.age, 1),
                    xp=round(rec.xp, 1), level=rec.level)
        self.agents.pop(rec.id, None)
        self._release(live.actor)

    def _release(self, actor):
        """Return a dead agent's actor to the pool (or destroy it if pooling isn't possible)."""
        try:
            self._set_tags(actor, [t for t in self._tags(actor)
                                   if not (t.startswith("RLID:") or t.startswith("Species:") or t == self.cfg.agent_tag)]
                           + [self.cfg.pool_tag])
            self._set_hidden(actor, True)
            self.pool.append(actor)
        except Exception as e:
            _warn(f"could not pool {actor.get_name()}: {e!r}; destroying")
            self._destroy(actor)

    def _set_hidden(self, actor, hidden):
        if self.world_kind == "editor":
            actor.set_is_temporarily_hidden_in_editor(hidden)
        actor.set_actor_hidden_in_game(hidden)
        actor.set_actor_enable_collision(not hidden)

    def _destroy(self, actor):
        if self.world_kind == "editor":
            unreal.get_editor_subsystem(unreal.EditorActorSubsystem).destroy_actor(actor)
        else:
            actor.destroy_actor()

    def _mirror_props(self, live):
        """Copy XP/Level/Health/Energy/Age into Blueprint variables of the same name, if any."""
        rec = live.record
        if live.props is None:
            live.props = []
            for name in ("XP", "Level", "Health", "Energy", "Age"):
                try:
                    live.actor.get_editor_property(name)
                    live.props.append(name)
                except Exception:
                    pass
        values = {"XP": rec.xp, "Level": rec.level, "Health": rec.health, "Energy": rec.energy, "Age": rec.age}
        for name in live.props:
            try:
                live.actor.set_editor_property(name, type(live.actor.get_editor_property(name))(values[name]))
            except Exception:
                live.props.remove(name)
        if live.dirty_scale:
            live.dirty_scale = False
            s = rec.genome["size"]
            live.actor.set_actor_scale3d(unreal.Vector(s, s, s))

    # -- sensors ----------------------------------------------------------------------------------

    def _sense(self):
        """Nearest resource / enemy / ally, counts, and raycasts (within a per-tick trace budget)."""
        cfg = self.cfg
        # Grid items carry each agent's root species and diet, worked out once per tick rather
        # than once per neighbour pair (this loop is the hottest code in the bridge).
        grid = SpatialGrid(cfg.sense_radius_cm)
        for live in self.agents.values():
            root = root_species(live.record.species)
            grid.insert((live, root, SPECIES_RULES.get(root, SPECIES_RULES["LumenSeed"]).diet == "predator"), live.pos)
        res_grid = SpatialGrid(cfg.sense_radius_cm)
        for node in self.resources.values():
            if node["amount"] > 0.5:
                res_grid.insert(node, node["pos"])

        for live in self.agents.values():
            rec = live.record
            my_root = root_species(rec.species)
            radius = cfg.sense_radius_cm * rec.genome["sense"]
            nearest = {"resource": None, "enemy": None, "ally": None}
            allies = threats = 0
            for node, p, d2 in res_grid.near(live.pos, radius):
                if nearest["resource"] is None or d2 < nearest["resource"][1]:
                    nearest["resource"] = (p, d2)
            for (other, other_root, predator), p, d2 in grid.near(live.pos, radius):
                if other is live:
                    continue
                if other_root == my_root:
                    allies += 1
                    if nearest["ally"] is None or d2 < nearest["ally"][1]:
                        nearest["ally"] = (p, d2)
                else:
                    if predator:
                        threats += 1
                    if nearest["enemy"] is None or d2 < nearest["enemy"][1]:
                        nearest["enemy"] = (p, d2)
            live.rays = live.rays or [1.0] * cfg.rays
            # Vectors are [dx, dy, dz, distance] in cm relative to the agent, or None if nothing in range.
            sensors = {"allies": allies, "threats": threats, "radius": round(radius, 1),
                       "owned_territory": self.territory_owner.get(rec.territory) == rec.species}
            for key, hit in nearest.items():
                sensors[key] = None if hit is None else [
                    round(hit[0][0] - live.pos[0], 1), round(hit[0][1] - live.pos[1], 1),
                    round(hit[0][2] - live.pos[2], 1), round(math.sqrt(hit[1]), 1)]
            self.sensor_cache[rec.id] = sensors
        self._raycasts()

    def _raycasts(self):
        cfg = self.cfg
        if cfg.rays <= 0 or not self.agents:
            return
        # Round-robin: at most ray_budget traces per tick; agents not reached keep last tick's rays.
        agents = list(self.agents.values())
        n = len(agents)
        for _ in range(min(n, max(1, cfg.ray_budget // cfg.rays))):
            live = agents[self.ray_cursor % n]
            self.ray_cursor += 1
            live.rays = [self._trace(live, i) for i in range(cfg.rays)]

    def _trace(self, live, i):
        """Fraction of the ray that is clear (1.0 = nothing within ray_length_cm)."""
        yaw = math.radians(live.rot[2] + 360.0 * i / self.cfg.rays)
        start = unreal.Vector(live.pos[0], live.pos[1], live.pos[2] + 50.0)
        end = unreal.Vector(start.x + math.cos(yaw) * self.cfg.ray_length_cm,
                            start.y + math.sin(yaw) * self.cfg.ray_length_cm, start.z)
        try:
            hit = unreal.SystemLibrary.line_trace_single(
                self.world, start, end, unreal.TraceTypeQuery.TRACE_TYPE_QUERY1, False, [live.actor],
                unreal.DrawDebugTrace.NONE, True)
        except Exception:
            return 1.0
        if hit is None:
            return 1.0
        try:
            return round(float(unreal.GameplayStatics.break_hit_result(hit)[2]), 3)   # [2] = Time
        except Exception:
            return 0.5

    # -- networking -------------------------------------------------------------------------------

    def _accept(self):
        if self.server is None:
            return
        while True:
            try:
                conn, addr = self.server.accept()
            except (BlockingIOError, InterruptedError):
                return
            conn.setblocking(False)
            conn.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            if self.client is not None:
                try:
                    conn.send(self._encode({"type": "error", "error": "a trainer is already connected"}))
                except OSError:
                    pass
                conn.close()
                _warn(f"refused a second client from {addr[0]}:{addr[1]}")
                continue
            self.client, self.client_addr = conn, addr
            self.inbuf, self.outbuf = b"", bytearray()
            self._discover()
            self._queue({
                "type": "hello", "protocol": PROTOCOL, "realm": self.cfg.realm, "hz": self.cfg.hz,
                "world": self.world_kind, "species": list(self.cfg.species),
                "rules": {name: {"diet": r.diet, "reproduction": r.reproduction, "max_age_s": r.max_age_s,
                                 "reproduce_energy": r.reproduce_energy, "xp": r.xp}
                          for name, r in SPECIES_RULES.items()},
                "genes": GENE_BOUNDS, "rays": self.cfg.rays,
                "limits": {"max_step_cm": self.cfg.max_step_cm, "max_step_deg": self.cfg.max_step_deg,
                           "max_agents": self.cfg.max_agents},
                "resources": [{"id": k, "position": _r(v["pos"])} for k, v in self.resources.items()],
            })
            _log(f"trainer connected from {addr[0]}:{addr[1]}")

    def _drop_client(self, reason):
        if self.client is None:
            return
        try:
            self.client.close()
        except OSError:
            pass
        _log(f"trainer {self.client_addr[0]}:{self.client_addr[1]} disconnected ({reason}); waiting for a new one")
        self.client = self.client_addr = None
        self.inbuf, self.outbuf = b"", bytearray()

    def _read(self):
        if self.client is None:
            return
        budget = self.MAX_READ_BYTES_PER_TICK
        while budget > 0:
            try:
                chunk = self.client.recv(min(65536, budget))
            except (BlockingIOError, InterruptedError):
                break
            except OSError as e:
                self._drop_client(f"read error: {e}")
                return
            if not chunk:
                self._drop_client("closed by trainer")
                return
            budget -= len(chunk)
            self.inbuf += chunk
        if len(self.inbuf) > self.MAX_LINE_BYTES and b"\n" not in self.inbuf:
            self._queue({"type": "error", "error": "line too long; dropped"})
            self.inbuf = b""
            return
        *lines, self.inbuf = self.inbuf.split(b"\n")
        for line in lines:
            if line.strip():
                self._handle_line(line)

    def _flush(self):
        if self.client is None or not self.outbuf:
            return
        try:
            sent = self.client.send(self.outbuf)
            del self.outbuf[:sent]
        except (BlockingIOError, InterruptedError):
            pass
        except OSError as e:
            self._drop_client(f"write error: {e}")

    @staticmethod
    def _encode(message):
        return (json.dumps(message, separators=(",", ":")) + "\n").encode("utf-8")

    def _queue(self, message):
        if self.client is not None:
            self.outbuf += self._encode(message)

    def _handle_line(self, line):
        try:
            msg = json.loads(line.decode("utf-8"))
            if not isinstance(msg, dict):
                raise ValueError("message must be a JSON object")
        except (ValueError, UnicodeDecodeError) as e:
            self._queue({"type": "error", "error": f"bad JSON: {e}"})
            return
        kind = msg.get("type")
        if kind == "actions":
            self._queue(self._apply_actions(msg))
        elif kind == "reset":
            self._queue({"type": "reset_done", "restored": self._reset()})
        elif kind == "ping":
            self._queue({"type": "pong", "time": round(time.monotonic() - self.start_time, 3)})
        elif kind == "save":
            self.save()
            self._queue({"type": "saved"})
        else:
            self._queue({"type": "error", "error": f"unknown message type {kind!r}"})

    # -- snapshots --------------------------------------------------------------------------------

    def _send_snapshot(self, dt):
        if len(self.outbuf) > self.MAX_PENDING_SEND_BYTES:
            self.skipped += 1
            if self.skipped in (1, 100) or self.skipped % 1000 == 0:
                _warn(f"trainer is reading slowly; {self.skipped} snapshots skipped")
            return
        actors = []
        cache = self.sensor_cache
        for live in self.agents.values():
            rec = live.record
            sensors = dict(cache.get(rec.id) or {})
            sensors["rays"] = live.rays or []
            actors.append({
                "id": rec.id, "species": rec.species, "root": root_species(rec.species),
                "position": _r(live.pos), "rotation": _r(live.rot), "scale": _r(live.scale, 3),
                "velocity": _r(live.velocity),
                "xp": round(rec.xp, 2), "level": rec.level,
                "health": round(rec.health, 2), "max_health": rec.max_health,
                "energy": round(rec.energy, 2), "max_energy": rec.max_energy,
                "age": round(rec.age, 2), "max_age": rules_for(rec.species).max_age_s,
                "generation": rec.generation, "parent": rec.parent, "lineage": rec.lineage,
                "children": rec.children, "kills": rec.kills, "territory": rec.territory,
                "genome": {k: round(v, 4) for k, v in rec.genome.items()},
                "sensors": sensors,
            })
        self.seq += 1
        msg = {"type": "state", "seq": self.seq, "realm": self.cfg.realm,
               "time": round(time.monotonic() - self.start_time, 3), "dt": round(dt, 4),
               "world": self.world_kind, "actors": actors, "events": self.events,
               "territories": self.territory_owner, "pool": len(self.pool)}
        if self.dropped_events:
            msg["dropped_events"] = self.dropped_events
            self.dropped_events = 0
        self._queue(msg)
        self.events = []

    # -- actions and commands ---------------------------------------------------------------------

    def _apply_actions(self, msg):
        ack = {"type": "ack", "seq": msg.get("seq"), "applied": 0, "errors": [], "events": []}
        actions = msg.get("actions")
        if not isinstance(actions, list):
            ack["errors"].append({"id": None, "error": "'actions' must be a list"})
            return ack
        for action in actions:
            aid = action.get("id") if isinstance(action, dict) else None
            live = self.agents.get(aid)
            if live is None or not _is_valid(live.actor):
                ack["errors"].append({"id": aid, "error": "unknown or dead agent"})
                continue
            try:
                self._apply_transform(live, action)
                for command in action.get("commands") or []:
                    if live.record.alive:
                        self._run_command(live, command, ack)
                ack["applied"] += 1
            except Exception as e:
                ack["errors"].append({"id": aid, "error": str(e)})
        return ack

    def _apply_transform(self, live, action):
        actor, g = live.actor, live.record.genome
        step = self.cfg.max_step_cm * g["speed"]
        if action.get("delta_position") is not None:
            d = _triple(action["delta_position"], "delta_position", step)
            loc = actor.get_actor_location()
            actor.set_actor_location(unreal.Vector(loc.x + d[0], loc.y + d[1], loc.z + d[2]), False, True)
        if action.get("delta_rotation") is not None:
            d = _triple(action["delta_rotation"], "delta_rotation", self.cfg.max_step_deg)
            r = actor.get_actor_rotation()
            actor.set_actor_rotation(unreal.Rotator(r.roll + d[0], r.pitch + d[1], r.yaw + d[2]), True)
        if action.get("scale") is not None:
            s = _triple(action["scale"], "scale", 100.0)
            if min(abs(c) for c in s) < 1e-3:
                raise ValueError("scale components must be non-zero")
            actor.set_actor_scale3d(unreal.Vector(*s))

    def _run_command(self, live, command, ack):
        if not isinstance(command, dict):
            raise ValueError("each command must be an object")
        handler = COMMANDS.get(command.get("type"))
        if handler is None:
            ack["errors"].append({"id": live.record.id, "error": f"unknown command {command.get('type')!r}; skipped"})
            return
        handler(self, live, command, ack)

    def _reset(self):
        restored = 0
        for live in self.agents.values():
            if _is_valid(live.actor):
                live.actor.set_actor_transform(live.home, False, True)
                live.pos = live.prev_pos = (live.home.translation.x, live.home.translation.y, live.home.translation.z)
                restored += 1
        return restored

    def _spawn_child(self, parent, offset, species):
        """A new agent beside the parent: from the pool, else (editor world) a duplicate."""
        if len(self.agents) >= self.cfg.max_agents:
            raise RuntimeError(f"population cap {self.cfg.max_agents} reached")
        actor = self._take_pooled(root_species(species))
        p = parent.actor.get_actor_location()
        target = unreal.Vector(p.x + offset[0], p.y + offset[1], p.z + offset[2])
        if actor is not None:
            self._set_hidden(actor, False)
            actor.set_actor_location(target, False, True)
            actor.set_actor_rotation(parent.actor.get_actor_rotation(), True)
        elif self.world_kind == "editor":
            sub = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
            actor = sub.duplicate_actor(parent.actor, self.world, unreal.Vector(*offset))
            if actor is None:
                raise RuntimeError("duplicate_actor failed")
        else:
            raise RuntimeError("no pooled actor left (Play-In-Editor can't spawn from Python; add more 'RLPool' actors)")

        prec = parent.record
        child = AgentRecord(uuid.uuid4().hex[:12], species)
        child.generation = prec.generation + 1
        child.parent = prec.id
        child.lineage = ([prec.id] + prec.lineage)[:16]
        child.genome = dict(prec.genome)
        child.mutations = prec.mutations
        child.world = self._world_path(self.world)
        self.records[child.id] = child
        self._tag_agent(actor, child)
        live = LiveAgent(child, actor)
        live.pos = live.prev_pos = (target.x, target.y, target.z)
        self.agents[child.id] = live
        prec.children += 1
        return live


# Commands --------------------------------------------------------------------------------------
# Each takes (bridge, live, command, ack). Append to ack["events"] (and bridge._event for the
# state stream) for anything the trainer must track; raise ValueError/RuntimeError on failure.
# Register new commands in COMMANDS.

def cmd_reproduce(bridge, live, command, ack):
    """Species-specific reproduction. Needs energy >= rules.reproduce_energy * max_energy."""
    rec, rules = live.record, rules_for(live.record.species)
    if rec.energy < rules.reproduce_energy * rec.max_energy:
        raise ValueError(f"not enough energy to reproduce ({rec.energy:.0f}/{rules.reproduce_energy * rec.max_energy:.0f})")
    offset = _triple(command.get("offset", [150.0, 0.0, 0.0]), "offset", 2000.0)
    species = str(command.get("species", rec.species))
    if root_species(species) != root_species(rec.species):
        raise ValueError("a child keeps its parent's root species")
    mode = rules.reproduction
    children = []
    if mode == "budding":            # one small bud; the parent keeps 70% of its energy
        child = bridge._spawn_child(live, offset, species)
        child.record.energy = rec.energy * 0.3
        rec.energy *= 0.7
        child.record.genome["size"] = max(GENE_BOUNDS["size"][0], rec.genome["size"] * 0.6)
        child.dirty_scale = True
        children.append(child)
    elif mode == "splitting":        # two equals: health and energy halved
        child = bridge._spawn_child(live, offset, species)
        rec.energy *= 0.5
        rec.health *= 0.5
        child.record.energy, child.record.health = rec.energy, rec.health
        children.append(child)
    else:                            # fission: 2-3 children share most of the parent's energy
        n = 3 if rec.energy > 0.9 * rec.max_energy else 2
        share = rec.energy * 0.8 / n
        for k in range(n):
            ang = 2 * math.pi * k / n
            off = [offset[0] * math.cos(ang) - offset[1] * math.sin(ang),
                   offset[0] * math.sin(ang) + offset[1] * math.cos(ang), offset[2]]
            try:
                child = bridge._spawn_child(live, off, species)
            except RuntimeError:
                break
            child.record.energy = share
            child.record.genome["size"] = max(GENE_BOUNDS["size"][0], rec.genome["size"] * 0.8)
            child.dirty_scale = True
            children.append(child)
        rec.energy -= share * len(children)
    for child in children:
        mutate = command.get("mutate")
        if isinstance(mutate, dict):
            _mutate_genome(child.record, mutate)
            child.dirty_scale = True
        event = {"type": "birth", "id": child.record.id, "parent": rec.id, "species": child.record.species,
                 "mode": mode, "generation": child.record.generation, "genome": child.record.genome}
        ack["events"].append(event)
        bridge._event(**event)


def _mutate_genome(rec, deltas):
    applied = {}
    for gene, delta in deltas.items():
        if gene not in GENE_BOUNDS:
            raise ValueError(f"unknown gene {gene!r}; genes are {sorted(GENE_BOUNDS)}")
        lo, hi = GENE_BOUNDS[gene]
        old = rec.genome[gene]
        rec.genome[gene] = _number(old + _number(delta, gene, -1.0, 1.0), gene, lo, hi)
        applied[gene] = round(rec.genome[gene] - old, 4)
    rec.mutations += 1
    return applied


def cmd_mutate(bridge, live, command, ack):
    """{"type": "mutate", "genes": {"speed": 0.05, "armor": -0.02}}: add deltas to genes."""
    genes = command.get("genes")
    if not isinstance(genes, dict):
        raise ValueError("mutate needs a 'genes' object")
    applied = _mutate_genome(live.record, genes)
    live.dirty_scale = "size" in applied
    event = {"type": "mutation", "id": live.record.id, "genes": applied, "genome": live.record.genome}
    ack["events"].append(event)
    bridge._event(**event)


def cmd_die(bridge, live, command, ack):
    """{"type": "die", "cause": "culled"}: remove the agent (its actor returns to the pool)."""
    live.record.cause = str(command.get("cause", "culled"))[:64]
    bridge._kill(live)
    ack["events"].append({"type": "death", "id": live.record.id, "cause": live.record.cause})


def cmd_set_species(bridge, live, command, ack):
    """{"type": "set_species", "species": "Gravemind/2"}: divergence into a new (or other) species
    with the same root. New names are allowed: that is how species emerge."""
    species = str(command.get("species", ""))
    if root_species(species) not in SPECIES_RULES:
        raise ValueError(f"unknown root species in {species!r}")
    if root_species(species) != root_species(live.record.species):
        raise ValueError("species can only diverge within their root (e.g. Gravemind -> Gravemind/2)")
    if "/" in species and not species.split("/", 1)[1].replace("-", "").isalnum():
        raise ValueError("species suffix must be alphanumeric")
    old = live.record.species
    live.record.species = species
    bridge._tag_agent(live.actor, live.record)
    event = {"type": "speciation", "id": live.record.id, "from": old, "species": species}
    ack["events"].append(event)
    bridge._event(**event)


def cmd_add_xp(bridge, live, command, ack):
    """{"type": "add_xp", "amount": 25, "reason": "explore"}: trainer-side XP (reward shaping that
    should also count in-game). Clamped to +-1000 per command; XP never drops below 0."""
    amount = _number(command.get("amount", 0), "amount", -1000.0, 1000.0)
    live.record.xp = max(0.0, live.record.xp + amount)
    bridge._level_and_death(live)
    ack["events"].append({"type": "xp", "id": live.record.id, "amount": amount,
                          "reason": str(command.get("reason", ""))[:64]})


def cmd_level_up(bridge, live, command, ack):
    """{"type": "level_up"}: grant one level now (XP is raised to that level's threshold)."""
    rec = live.record
    rec.xp = max(rec.xp, xp_for_level(rec.level + 1))
    bridge._level_and_death(live)
    ack["events"].append({"type": "level_up", "id": rec.id, "level": rec.level})


COMMANDS = {
    "reproduce": cmd_reproduce,
    "mutate": cmd_mutate,
    "die": cmd_die,
    "destroy": cmd_die,              # alias
    "set_species": cmd_set_species,
    "add_xp": cmd_add_xp,
    "level_up": cmd_level_up,
}


# ==============================================================================================
# Console entry points
# ==============================================================================================

_bridge = None


def start_bridge(**overrides):
    """Start (or restart) the bridge. Any BridgeConfig field can be passed, e.g. port=9778, hz=30."""
    global _bridge
    if _bridge is not None:
        stop_bridge()
    try:
        bridge = EcoBridge(BridgeConfig(**overrides))
        bridge.start()
    except Exception as e:
        _error(f"could not start: {e}")
        return None
    _bridge = bridge
    return bridge


def stop_bridge():
    global _bridge
    if _bridge is not None:
        _bridge.stop()
        _bridge = None


def save():
    if _bridge is not None:
        _bridge.save()


def status():
    if _bridge is None:
        _log("not running")
        return None
    b = _bridge
    per_species = {}
    for live in b.agents.values():
        per_species[live.record.species] = per_species.get(live.record.species, 0) + 1
    info = {"realm": b.cfg.realm, "port": b.cfg.port, "hz": b.cfg.hz, "world": b.world_kind,
            "agents": per_species, "pool": len(b.pool), "resources": len(b.resources),
            "trainer": f"{b.client_addr[0]}:{b.client_addr[1]}" if b.client else None,
            "snapshots": b.seq, "skipped": b.skipped}
    _log(str(info))
    return info
