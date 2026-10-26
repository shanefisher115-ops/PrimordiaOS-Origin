"""
Regression tests for the eco-bridge persistence fixes (run: python -m unittest test_persistence -v).

  1. events are kept (and logged to disk) while no trainer is connected
  2. a dead record is never overwritten when its actor is seen again (and Ctrl+D copies get new ids)
  3. agents that only lived in a Play session are recorded as lost when it ends
  4. the species-per-root cap counts living species, so speciation resumes after extinctions

Uses the stand-in for Unreal's API from headless_realm.py, so no editor is needed.
"""

import json
import os
import shutil
import sys
import tempfile
import types
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import headless_realm  # noqa: E402


class BridgeCase(unittest.TestCase):
    def setUp(self):
        self.saved = tempfile.mkdtemp(prefix="ecobridge_test_")
        self.u = headless_realm.make_fake_unreal(3000.0, self.saved)
        sys.modules["unreal"] = self.u
        sys.modules.pop("unreal_bridge", None)
        import unreal_bridge
        self.ub = unreal_bridge

    def tearDown(self):
        for b in getattr(self, "bridges", []):
            if b.event_log is not None:
                b.event_log.close()
        shutil.rmtree(self.saved, ignore_errors=True)

    def agent(self, name, species="LumenSeed", pos=(0, 0, 0), tags=()):
        a = self.u.Actor(name, pos, [species, *tags])
        self.u._world.actors.append(a)
        return a

    def bridge(self, **cfg):
        b = self.ub.EcoBridge(self.ub.BridgeConfig(respawn_below=0, rays=0, **cfg))
        b._load()
        if b.cfg.persist:
            path = b._save_path().replace(".json", ".events.jsonl")
            os.makedirs(os.path.dirname(path), exist_ok=True)
            b.event_log = open(path, "a", encoding="utf-8", buffering=1)
        self.bridges = getattr(self, "bridges", []) + [b]
        return b

    def tick(self, b, n=1, dt=0.05):
        for _ in range(n):
            b._read_transforms(dt)
            b._ecosystem_step(dt)
            b._sense()
            if b.client is not None:
                b._send_snapshot(dt)


class TestEventsWithoutTrainer(BridgeCase):
    def test_events_survive_until_a_trainer_connects(self):
        a = self.agent("starving")
        b = self.bridge()
        b._discover()
        rec = b.agents[next(iter(b.agents))].record
        rec.energy = 0.001                                # dies on the next tick
        self.tick(b, 3)                                   # no client connected
        kinds = [e["type"] for e in b.events]
        self.assertIn("death", kinds, "the death must still be queued for the next trainer")
        seqs = [e["seq"] for e in b.events]
        self.assertEqual(seqs, list(range(seqs[0], seqs[0] + len(seqs))), "event numbers have no gaps")

        # It is also in the event log on disk, whatever happens to the trainer.
        b.event_log.flush()
        with open(b._save_path().replace(".json", ".events.jsonl"), encoding="utf-8") as f:
            logged = [json.loads(line) for line in f]
        self.assertIn("death", [e["type"] for e in logged])

        # A trainer connecting now receives it in the first snapshot.
        b.client = types.SimpleNamespace()               # stands in for a socket; only _queue reads it
        b.outbuf = bytearray()
        b._send_snapshot(0.05)
        state = json.loads(b.outbuf.decode().splitlines()[0])
        self.assertIn("death", [e["type"] for e in state["events"]])
        self.assertEqual(b.events, [], "sent events leave the queue")
        a  # keep a reference


class TestReadoption(BridgeCase):
    def test_dead_record_is_not_overwritten(self):
        a = self.agent("phoenix")
        b = self.bridge()
        b._discover()
        old_id = next(iter(b.agents))
        old = b.records[old_id]
        old.xp, old.alive, old.cause = 321.0, False, "starved"
        b.agents.clear()                                  # e.g. the world was reloaded
        b._discover()                                     # the same actor, still tagged RLID:<old_id>
        new_id = next(iter(b.agents))
        self.assertNotEqual(new_id, old_id)
        self.assertEqual(b.records[old_id].xp, 321.0, "the dead record keeps its history")
        self.assertFalse(b.records[old_id].alive)
        self.assertEqual(b.records[new_id].origin, {"forked_from": old_id, "reason": "dead"})
        self.assertIn(f"RLID:{new_id}", [str(t) for t in a.tags])

    def test_duplicated_actor_gets_its_own_id(self):
        a = self.agent("original")
        b = self.bridge()
        b._discover()
        copy = self.agent("copy", tags=[str(t) for t in a.tags if str(t).startswith(("RLID:", "Species:"))])
        b._discover()
        self.assertEqual(len(b.agents), 2, "a Ctrl+D copy is a second agent, not the same one")
        ids = {str(t) for t in copy.tags if str(t).startswith("RLID:")} | {str(t) for t in a.tags if str(t).startswith("RLID:")}
        self.assertEqual(len(ids), 2)


class TestPlaySessionEnd(BridgeCase):
    def test_play_only_agents_are_recorded_as_lost(self):
        editor_world = self.u._world
        self.agent("placed")
        b = self.bridge()
        b._discover()
        placed_id = next(iter(b.agents))

        # Play starts: a copy of the world with the same actors (same RLID tags).
        game = type(editor_world)()
        game.get_path_name = lambda: "/Game/UEDPIE_0_Headless.Headless"
        for actor in editor_world.actors:
            dup = self.u.Actor(actor._label, (0, 0, 0), [str(t) for t in actor.tags])
            game.actors.append(dup)
        born = self.u.Actor("born_in_play", (0, 0, 0), ["EchoSwarm"])
        game.actors.append(born)
        sub = self.u.get_editor_subsystem(self.u.UnrealEditorSubsystem)
        sub.get_game_world = lambda: game
        b._discover()
        self.assertIn(placed_id, b.agents, "the PIE copy continues the placed agent's record")
        play_ids = set(b.agents) - {placed_id}
        self.assertEqual(len(play_ids), 1)

        # Play stops.
        sub.get_game_world = lambda: None
        b._discover()
        for rid in play_ids | {placed_id}:
            self.assertFalse(b.records[rid].alive, f"{rid} lived in the Play world and is gone")
            self.assertEqual(b.records[rid].cause, "lost (play session ended)")
        # The placed actor in the editor world becomes a new agent linked to its Play-time record.
        (new_id,) = b.agents
        self.assertEqual(b.records[new_id].origin["forked_from"], placed_id)


class TestSpeciesCap(unittest.TestCase):
    def test_cap_counts_living_species_only(self):
        sys.modules.pop("unreal", None)
        import agent_trainer as at
        args = at.parse_args(["--run", tempfile.mkdtemp(prefix="eco_cap_"), "--max-species-per-root", "2",
                              "--speciation-distance", "0.01", "--speciation-age", "1", "--min-pop", "2"])
        t = at.Trainer(args)
        # Four Gravemind species have existed (they all have brains), but only the root is alive.
        for s in ("Gravemind", "Gravemind/2", "Gravemind/3", "Gravemind/4"):
            t.new_brain(s)
        root_a, root_b = [b for b in t.brains.values() if b.species == "Gravemind"][0], t.new_brain("Gravemind")
        members = []
        for i in range(6):
            brain = root_a if i < 3 else root_b
            genome = {g: (1.0 if i < 3 else 1.5) for g in at.GENES}     # two clearly different lineages
            m = {"id": f"g{i}", "realm": "r", "species": "Gravemind", "brain": brain.id, "alive": True,
                 "genome": genome, "fitness": float(i)}
            t.memory[f"r|g{i}"] = m
            members.append(m)
        commands = t.evolution._speciate({"Gravemind": members}, generation=5)
        new_species = {c[1]["commands"][0]["species"] for c in commands}
        self.assertEqual(len(new_species), 1, "speciation still happens: only one species is alive")
        self.assertNotIn(next(iter(new_species)), {"Gravemind/2", "Gravemind/3", "Gravemind/4"},
                         "a new species never reuses an old name")
        t.log.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
