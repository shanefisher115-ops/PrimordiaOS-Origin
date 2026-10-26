"""
agent_trainer.py: the PyTorch side of the Primordia evolutionary ecosystem (protocol "primordia-eco/1").

Brains for the agents that unreal_bridge.py runs in Unreal. Multi-agent PPO learns behaviour
within a lifetime; evolution (selection, weight and gene mutation, reproduction, culling,
population scaling, speciation) works across generations. XP is the common signal: it is in
every observation, it drives the reward, and it decides fitness.

    python agent_trainer.py                                   # one realm at 127.0.0.1:9777
    python agent_trainer.py --realm 127.0.0.1:9777 --realm 127.0.0.1:9778    # two realms, shared brains
    python agent_trainer.py --run runs/eco1 --generation 8 --brains 3

Ctrl-C saves a checkpoint (brains, optimizers, agent memory, lineage counters) in --run; running
again with the same --run resumes. Lineage events stream to <run>/lineage.jsonl.

Structure
---------
    RealmClient      one TCP connection per realm (newline JSON, reconnects with backoff)
    observe()        snapshot actor -> observation vector (OBS_SIZE floats)
    Brain            actor-critic network + Adam optimizer + rollout buffer + history
    reward_for()     per-step reward from consecutive snapshots + events (XP-centred)
    Evolution        fitness, selection, mutation, reproduction, culling, population scaling,
                     speciation, elite archive
    LineageLog       append-only JSONL of births, deaths, mutations, speciations, level-ups
    Trainer          the loop: receive states -> act -> learn (PPO) -> evolve -> save
"""

import argparse
import copy
import json
import math
import os
import random
import signal
import socket
import sys
import time
from collections import defaultdict

import torch
import torch.nn as nn

PROTOCOL = "primordia-eco/1"
ROOTS = ("LumenSeed", "Gravemind", "EchoSwarm")
GENES = ("size", "speed", "armor", "aggression", "sense", "metabolism")
RAYS = 8                                    # observation always holds 8 rays (padded/truncated)
OBS_SIZE = 3 + 4 + 3 + 3 + 5 + len(ROOTS) + len(GENES) + 15 + 3 + RAYS   # = 53
MOVE_SIZE = 3                               # dx, dy (cm), dyaw (deg); then one reproduce bit


def root_species(species):
    return species.split("/", 1)[0]


# ==============================================================================================
# Connection
# ==============================================================================================

class BridgeDisconnected(Exception):
    pass


class RealmClient:
    """One realm (one Unreal editor running unreal_bridge.py)."""

    def __init__(self, address, timeout):
        host, _, port = address.rpartition(":")
        self.host, self.port, self.timeout = host or "127.0.0.1", int(port), timeout
        self.sock = None
        self.buf = b""
        self.hello = None
        self.name = f"{self.host}:{self.port}"
        self.down_until = 0.0
        self.skipped = 0                     # stale snapshots skipped (trainer behind)
        self.error_counts = {}               # bridge-side command errors since the last report

    def connect(self, retries=None):
        attempt, delay = 0, 0.5
        while True:
            attempt += 1
            try:
                self.sock = socket.create_connection((self.host, self.port), timeout=self.timeout)
                self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                self.buf = b""
                hello = self.recv()
                if hello.get("type") == "error":
                    raise ConnectionError(hello.get("error"))
                if hello.get("type") != "hello" or hello.get("protocol") != PROTOCOL:
                    raise ConnectionError(f"unexpected greeting: {str(hello)[:200]}")
                self.hello = hello
                self.name = hello.get("realm", self.name)
                print(f"[trainer] connected to realm '{self.name}' at {self.host}:{self.port} "
                      f"({hello['world']} world, {hello['hz']} Hz)")
                return hello
            except (OSError, ConnectionError, BridgeDisconnected) as e:
                self.close()
                if retries is not None and attempt > retries:
                    raise ConnectionError(f"{self.host}:{self.port}: {e}") from e
                print(f"[trainer] {self.host}:{self.port} not reachable ({e}); retrying in {delay:.1f}s")
                time.sleep(delay)
                delay = min(delay * 2, 10.0)

    def close(self):
        if self.sock is not None:
            try:
                self.sock.close()
            except OSError:
                pass
            self.sock = None

    def send(self, message):
        try:
            self.sock.sendall((json.dumps(message, separators=(",", ":")) + "\n").encode("utf-8"))
        except (OSError, AttributeError) as e:
            raise BridgeDisconnected(f"send failed: {e}") from e

    def recv(self):
        while True:
            while b"\n" not in self.buf:
                try:
                    chunk = self.sock.recv(1 << 18)
                except socket.timeout as e:
                    raise BridgeDisconnected("no data (is the editor paused, minimised or busy?)") from e
                except (OSError, AttributeError) as e:
                    raise BridgeDisconnected(f"receive failed: {e}") from e
                if not chunk:
                    raise BridgeDisconnected("connection closed")
                self.buf += chunk
            line, self.buf = self.buf.split(b"\n", 1)
            if line.strip():
                try:
                    msg = json.loads(line)
                    if isinstance(msg, dict):
                        return msg
                except (ValueError, UnicodeDecodeError) as e:
                    print(f"[trainer] {self.name}: skipped a bad message: {e}", file=sys.stderr)

    def next_state(self):
        """The LATEST state snapshot. If the trainer fell behind, older snapshots already waiting
        are skipped (acting on stale positions and energy is worse than skipping), but their
        events are kept, so no birth or death is lost."""
        state = None
        events = []
        while True:
            # Block for the first state; after that only take what is already buffered.
            if state is not None and not self._buffered():
                break
            msg = self.recv()
            kind = msg.get("type")
            if kind == "state":
                if state is not None:
                    events += state.get("events", [])
                    self.skipped += 1
                state = msg
            elif kind == "ack":
                self._count_errors(msg)
            elif kind == "error":
                print(f"[trainer] {self.name}: bridge error: {msg.get('error')}", file=sys.stderr)
        if events:
            state["events"] = events + state.get("events", [])
        return state

    def _buffered(self):
        """True if a complete message is already here (or arrives within 0 s)."""
        if b"\n" in self.buf:
            return True
        self.sock.setblocking(False)
        try:
            chunk = self.sock.recv(1 << 18)
            if chunk:
                self.buf += chunk
        except (BlockingIOError, InterruptedError):
            pass
        except OSError as e:
            raise BridgeDisconnected(f"receive failed: {e}") from e
        finally:
            self.sock.settimeout(self.timeout)
        return b"\n" in self.buf

    def _count_errors(self, ack):
        for err in ack.get("errors", []):
            text = err.get("error", "")
            if "unknown or dead" in text:
                continue                     # raced with a death; harmless
            reason = text.split(" (")[0]
            self.error_counts[reason] = self.error_counts.get(reason, 0) + 1

    def take_error_report(self):
        report, self.error_counts = self.error_counts, {}
        return report


# ==============================================================================================
# Observations
# ==============================================================================================

def _vec_sensor(v, radius):
    """[dx, dy, dz, dist] cm -> 5 floats: direction scaled by range, closeness, presence."""
    if not v:
        return [0.0, 0.0, 0.0, 0.0, 0.0]
    r = max(radius, 1.0)
    return [v[0] / r, v[1] / r, v[2] / r, 1.0 - min(v[3] / r, 1.0), 1.0]


def observe(a):
    """PLUG IN: one agent's observation (OBS_SIZE floats, roughly unit scale)."""
    x, y, z = a["position"]
    roll, pitch, yaw = (math.radians(v) for v in a["rotation"])
    vx, vy, vz = a.get("velocity", (0, 0, 0))
    s = a.get("sensors") or {}
    radius = s.get("radius", 2500.0)
    g = a.get("genome") or {}
    root = a.get("root") or root_species(a["species"])
    rays = list(s.get("rays") or [])[:RAYS]
    rays += [1.0] * (RAYS - len(rays))
    obs = [x / 5000.0, y / 5000.0, z / 5000.0,
           math.sin(yaw), math.cos(yaw), math.sin(pitch), math.sin(roll),
           *a["scale"],
           vx / 500.0, vy / 500.0, vz / 500.0,
           math.log1p(max(a.get("xp", 0.0), 0.0)) / 10.0,              # XP is observed (log scale)
           a.get("level", 1) / 10.0,
           a.get("health", 1.0) / max(a.get("max_health", 1.0), 1e-6),
           a.get("energy", 1.0) / max(a.get("max_energy", 1.0), 1e-6),
           a.get("age", 0.0) / max(a.get("max_age", 1.0), 1e-6),
           *[1.0 if root == r else 0.0 for r in ROOTS],
           *[float(g.get(k, 1.0)) for k in GENES],
           *_vec_sensor(s.get("resource"), radius),
           *_vec_sensor(s.get("enemy"), radius),
           *_vec_sensor(s.get("ally"), radius),
           min(s.get("allies", 0), 20) / 10.0, min(s.get("threats", 0), 20) / 10.0,
           1.0 if s.get("owned_territory") else 0.0,
           *rays]
    return obs


# ==============================================================================================
# Brains: actor-critic + PPO rollout buffer
# ==============================================================================================

class ActorCritic(nn.Module):
    """Shared trunk; Gaussian movement head, Bernoulli reproduce head, value head."""

    def __init__(self, obs_size=OBS_SIZE, hidden=128):
        super().__init__()
        self.trunk = nn.Sequential(nn.Linear(obs_size, hidden), nn.Tanh(), nn.Linear(hidden, hidden), nn.Tanh())
        self.move = nn.Linear(hidden, MOVE_SIZE)
        self.breed = nn.Linear(hidden, 1)
        self.value = nn.Linear(hidden, 1)
        self.log_std = nn.Parameter(torch.full((MOVE_SIZE,), -0.5))
        nn.init.orthogonal_(self.move.weight, 0.01)
        nn.init.constant_(self.breed.bias, -2.0)          # start shy of reproducing

    def forward(self, obs):
        h = self.trunk(obs)
        move = torch.distributions.Normal(self.move(h), self.log_std.exp())
        breed = torch.distributions.Bernoulli(logits=self.breed(h).squeeze(-1))
        return move, breed, self.value(h).squeeze(-1)

    def evaluate(self, obs, move_raw, breed_bit):
        move, breed, value = self(obs)
        logp = move.log_prob(move_raw).sum(-1) + breed.log_prob(breed_bit)
        entropy = move.entropy().sum(-1) + breed.entropy()
        return logp, entropy, value


class Brain:
    """One policy. A species has one or more brains (population-based training): agents are
    assigned to a brain, PPO trains each brain on its agents, evolution compares brains."""

    def __init__(self, brain_id, species, device, lr, parent=None):
        self.id = brain_id
        self.species = species
        self.parent = parent
        self.net = ActorCritic().to(device)
        self.lr = lr
        self.opt = torch.optim.Adam(self.net.parameters(), lr=lr)
        self.buffer = defaultdict(list)      # agent key -> [transition dicts]
        self.fitness_history = []
        self.born_generation = 0             # brains younger than --speciation-age can't found a species
        self.mutations = []                  # [(generation, sigma, source brain)]

    def reset_optimizer(self):
        self.opt = torch.optim.Adam(self.net.parameters(), lr=self.lr)

    def state(self):
        return {"id": self.id, "species": self.species, "parent": self.parent, "net": self.net.state_dict(),
                "opt": self.opt.state_dict(), "fitness_history": self.fitness_history[-50:],
                "mutations": self.mutations[-50:]}


def ppo_update(brain, args, device):
    """GAE(lambda) advantages per agent trajectory, then clipped PPO epochs on the whole batch."""
    obs, mraw, bbit, old_logp, returns, advs = [], [], [], [], [], []
    for key, traj in list(brain.buffer.items()):
        done_traj = [t for t in traj if "reward" in t]
        if not done_traj:
            continue
        # Bootstrap from the agent's still-pending step if it is alive, else 0.
        pending = traj[len(done_traj)] if len(traj) > len(done_traj) else None
        next_value = pending["value"] if pending is not None else 0.0
        gae, adv_rev = 0.0, []
        for t in reversed(done_traj):
            nonterminal = 0.0 if t["done"] else 1.0
            delta = t["reward"] + args.gamma * next_value * nonterminal - t["value"]
            gae = delta + args.gamma * args.lam * nonterminal * gae
            adv_rev.append(gae)
            next_value = t["value"]
        for t, adv in zip(done_traj, reversed(adv_rev)):
            obs.append(t["obs"]); mraw.append(t["move"]); bbit.append(t["breed"])
            old_logp.append(t["logp"]); advs.append(adv); returns.append(adv + t["value"])
        brain.buffer[key] = traj[len(done_traj):]        # keep the pending step for next rollout
        if not brain.buffer[key]:
            del brain.buffer[key]
    if len(obs) < 8:
        return None
    obs = torch.tensor(obs, dtype=torch.float32, device=device)
    mraw = torch.tensor(mraw, dtype=torch.float32, device=device)
    bbit = torch.tensor(bbit, dtype=torch.float32, device=device)
    old_logp = torch.tensor(old_logp, dtype=torch.float32, device=device)
    returns = torch.tensor(returns, dtype=torch.float32, device=device)
    advs = torch.tensor(advs, dtype=torch.float32, device=device)
    advs = (advs - advs.mean()) / (advs.std() + 1e-8)

    n, stats = len(obs), {"policy": 0.0, "value": 0.0, "entropy": 0.0, "kl": 0.0}
    updates = 0
    for _ in range(args.epochs):
        perm = torch.randperm(n, device=device)
        for start in range(0, n, args.minibatch):
            idx = perm[start:start + args.minibatch]
            logp, ent, value = brain.net.evaluate(obs[idx], mraw[idx], bbit[idx])
            ratio = (logp - old_logp[idx]).exp()
            s1 = ratio * advs[idx]
            s2 = ratio.clamp(1 - args.clip, 1 + args.clip) * advs[idx]
            policy_loss = -torch.min(s1, s2).mean()
            value_loss = (returns[idx] - value).pow(2).mean()
            loss = policy_loss + args.vf_coef * value_loss - args.ent_coef * ent.mean()
            brain.opt.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(brain.net.parameters(), 0.5)
            brain.opt.step()
            with torch.no_grad():
                stats["policy"] += policy_loss.item(); stats["value"] += value_loss.item()
                stats["entropy"] += ent.mean().item(); stats["kl"] += (old_logp[idx] - logp).mean().item()
            updates += 1
    return {k: round(v / max(updates, 1), 4) for k, v in stats.items()} | {"samples": n}


# ==============================================================================================
# Rewards (XP-centred, with species shaping)
# ==============================================================================================

REWARD = {"xp": 0.05, "survival": 0.002, "damage": 1.0, "energy": 0.2, "level": 1.0, "death": -2.0,
          "birth": 0.5}

SHAPING = {
    # PLUG IN: per-species extras on top of XP (XP itself already carries species metrics,
    # because Unreal awards it per species: gathering, kills, territory, cohesion).
    "LumenSeed": lambda before, after, ev: 0.3 * max(0.0, after["energy"] - before["energy"]) / after["max_energy"],
    "Gravemind": lambda before, after, ev: 1.0 * (after.get("kills", 0) - before.get("kills", 0)),
    "EchoSwarm": lambda before, after, ev: 0.002 * min((after.get("sensors") or {}).get("allies", 0), 8),
}


def reward_for(before, after, events):
    """PLUG IN: reward for one step of one agent. `after` is None if it died."""
    if after is None:
        return REWARD["death"]
    r = REWARD["xp"] * (after["xp"] - before["xp"])
    r += REWARD["survival"]
    r += REWARD["damage"] * min(0.0, after["health"] - before["health"]) / max(after["max_health"], 1.0)
    r += REWARD["energy"] * (after["energy"] - before["energy"]) / max(after["max_energy"], 1.0)
    r += REWARD["level"] * (after["level"] - before["level"])
    r += REWARD["birth"] * events.get("births", 0)
    shaping = SHAPING.get(root_species(after["species"]))
    if shaping:
        r += shaping(before, after, events)
    return r


def fitness_of(mem):
    """PLUG IN: evolutionary fitness of an agent over a generation. XP gain dominates; survival,
    offspring and species metrics break ties."""
    root = root_species(mem["species"])
    f = mem["xp_gain"] + 0.02 * mem["alive_s"] + 5.0 * mem["births"]
    if root == "Gravemind":
        f += 10.0 * mem["kills_gain"]
    elif root == "EchoSwarm":
        f += 0.5 * mem["ally_mean"]
    elif root == "LumenSeed":
        f += 5.0 * (mem["level"] - 1)
    return f


# ==============================================================================================
# Lineage log
# ==============================================================================================

class LineageLog:
    def __init__(self, path):
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        self.f = open(path, "a", encoding="utf-8")

    def write(self, kind, **data):
        self.f.write(json.dumps({"t": round(time.time(), 3), "type": kind, **data}, default=str) + "\n")

    def flush(self):
        self.f.flush()

    def close(self):
        self.f.close()


# ==============================================================================================
# Evolution
# ==============================================================================================

class Evolution:
    """Selection, mutation, reproduction, culling, population scaling and speciation.

    Runs every --generation PPO updates:
      1. Agent fitness (fitness_of) over the generation, per species.
      2. Population scaling: each species gets a target size from its mean fitness relative to
         the others, between --min-pop and --max-pop (and --max-total overall).
      3. Selection: the fittest reproduce (with gene mutation), the weakest die, to move each
         species toward its target. Unreal applies the species' reproduction mode.
      4. Brain selection: inside a species, the worst brain is replaced by a mutated copy of the
         best (weight noise), keeping PPO's learning and evolution's exploration together.
      5. Elite archive: the best brain state per species is kept; a species whose best brain
         falls far below its elite gets the elite back (recovery from a bad mutation).
      6. Speciation: a brain whose weights have drifted far from its species' best brain, and
         that has enough agents, founds a new species "<Root>/<n>"; its agents are re-tagged.
    """

    def __init__(self, trainer, args):
        self.t = trainer
        self.args = args
        self.elites = {}                 # species -> (fitness, net state dict)
        self.species_counter = defaultdict(int)
        self.diverged = {}               # brain id -> generations in a row its lineage has been far off

    def run(self, generation):
        t, a = self.t, self.args
        alive = [m for m in t.memory.values() if m["alive"]]
        by_species = defaultdict(list)
        for m in alive:
            m["fitness"] = fitness_of(m)
            by_species[m["species"]].append(m)
        if not by_species:
            return []

        means = {s: sum(m["fitness"] for m in ms) / len(ms) for s, ms in by_species.items()}
        overall = sum(means.values()) / len(means)
        spread = max(1e-6, max(abs(v - overall) for v in means.values()))
        total_cap = a.max_total
        commands = []
        for species in list(self.elites):   # elites age, so an old record can't block forever
            f, st = self.elites[species]
            self.elites[species] = (f * 0.95, st)
        print(f"[evolve] generation {generation}")
        for species, members in by_species.items():
            members.sort(key=lambda m: m["fitness"])
            n = len(members)
            # Population scaling: fitter-than-average species grow, weaker ones shrink.
            factor = 1.0 + 0.25 * (means[species] - overall) / spread
            target = int(max(a.min_pop, min(a.max_pop, round(n * factor))))
            target = min(target, max(a.min_pop, total_cap // max(1, len(by_species))))
            cull_n = max(0, min(n - a.min_pop, int(n * a.cull) + max(0, n - target)))
            breed_n = max(0, min(n, int(n * a.breed) + max(0, target - n)))
            culled = members[:cull_n]
            breeders = [m for m in reversed(members[cull_n:]) if m["energy_frac"] >= m["breed_energy"]][:breed_n]
            for m in culled:
                commands.append((m["realm"], {"id": m["id"], "commands": [{"type": "die", "cause": "culled"}]}))
            for m in breeders:
                genes = {g: round(random.gauss(0.0, a.gene_sigma), 4) for g in random.sample(GENES, 2)}
                commands.append((m["realm"], {"id": m["id"], "commands": [
                    {"type": "reproduce", "offset": [random.uniform(-200, 200), random.uniform(-200, 200), 0.0],
                     "mutate": genes}]}))
            print(f"[evolve]   {species:<14} n={n:<4} mean fitness {means[species]:8.2f}  "
                  f"target {target:<4} cull {len(culled):<3} reproduce {len(breeders)}")
            t.log.write("generation", species=species, generation=generation, n=n, mean_fitness=means[species],
                        target=target, culled=len(culled), reproduced=len(breeders))
        commands += self._speciate(by_species, generation)    # first, so a drifted brain can branch off
        self._select_brains(by_species, generation)
        for m in alive:                  # a new generation of fitness starts now
            m.update(xp_gain=0.0, alive_s=0.0, births=0, kills_gain=0, ally_sum=0.0, ally_n=0, ally_mean=0.0)
        return commands

    def _brain_fitness(self, members):
        per_brain = defaultdict(list)
        for m in members:
            per_brain[m["brain"]].append(m["fitness"])
        return {b: sum(v) / len(v) for b, v in per_brain.items()}

    def _select_brains(self, by_species, generation):
        t, a = self.t, self.args
        for species, members in by_species.items():
            fit = self._brain_fitness(members)
            for b, f in fit.items():
                t.brains[b].fitness_history.append((generation, round(f, 3)))
            if not fit:
                continue
            best_id = max(fit, key=fit.get)
            best = t.brains[best_id]
            elite = self.elites.get(species)
            restored = False
            if elite is None or fit[best_id] > elite[0]:
                self.elites[species] = (fit[best_id], copy.deepcopy(best.net.state_dict()))
            elif fit[best_id] < 0.5 * elite[0] and elite[0] > 0:
                worst_id = min(fit, key=fit.get)
                t.brains[worst_id].net.load_state_dict(elite[1])
                t.brains[worst_id].reset_optimizer()
                t.brains[worst_id].born_generation = generation
                # The elite has been used: its score drops to today's level so it can't fire again
                # until the species beats it once more.
                self.elites[species] = (fit[best_id], elite[1])
                restored = True
                t.log.write("elite_restore", species=species, brain=worst_id, generation=generation)
                print(f"[evolve]   {species}: restored the elite brain into {worst_id}")
            if len(fit) >= 2 and not restored:
                worst_id = min(fit, key=fit.get)
                # Replace only a clearly worse brain (relative gap), so the others can keep
                # drifting toward new species instead of being reset every generation.
                gap = fit[best_id] - fit[worst_id]
                if worst_id != best_id and gap > a.brain_margin * max(abs(fit[best_id]), 1.0):
                    worst = t.brains[worst_id]
                    worst.net.load_state_dict(best.net.state_dict())
                    mutate_weights(worst.net, a.weight_sigma)
                    worst.reset_optimizer()
                    worst.parent = best_id
                    worst.born_generation = generation
                    worst.mutations.append((generation, a.weight_sigma, best_id))
                    t.log.write("brain_mutation", species=species, brain=worst_id, source=best_id,
                                sigma=a.weight_sigma, generation=generation)
                    print(f"[evolve]   {species}: brain {worst_id} <- mutated copy of {best_id}")
            # Keep at least --brains brains per species (fork the best when one is missing).
            while sum(1 for b in t.brains.values() if b.species == species) < a.brains and len(members) >= 2 * a.min_pop:
                child = t.new_brain(species, parent=best_id)
                child.net.load_state_dict(best.net.state_dict())
                mutate_weights(child.net, a.weight_sigma)
                movers = [m for m in members if m["brain"] == best_id][::2]
                for m in movers:
                    m["brain"] = child.id
                t.log.write("brain_fork", species=species, brain=child.id, source=best_id, agents=len(movers))

    def _speciate(self, by_species, generation):
        t, a = self.t, self.args
        commands = []
        for species, members in list(by_species.items()):
            fit = self._brain_fitness(members)
            if len(fit) < 2:
                continue
            root = root_species(species)
            # The cap counts species alive now. (It used to count every species that ever had a
            # brain, so after four had existed speciation stopped for good, even once they died out.)
            existing = {m["species"] for m in t.memory.values() if m["alive"] and root_species(m["species"]) == root}
            if len(existing) >= a.max_species_per_root:
                continue
            existing |= {b.species for b in t.brains.values()}         # names still in use
            # A brain's agents are a lineage (children inherit their parent's brain). Speciation is
            # measured on their heritable genes: the distance between the lineage's mean genome
            # and the rest of the species', with each gene scaled by its range. Gene mutation at
            # every birth plus selection makes lineages drift apart; once one has stayed far enough
            # away for --speciation-age generations in a row, it becomes its own species.
            ranges = self._gene_ranges()
            for b_id in sorted(fit, key=fit.get, reverse=True):
                agents = [m for m in members if m["brain"] == b_id]
                rest = [m for m in members if m["brain"] != b_id]
                if len(agents) < a.min_pop or len(rest) < a.min_pop:
                    self.diverged.pop(b_id, None)
                    continue
                dist = genome_distance(agents, rest, ranges)
                self.diverged[b_id] = self.diverged.get(b_id, 0) + 1 if dist >= a.speciation_distance else 0
                if self.diverged[b_id] < a.speciation_age:
                    continue
                self.diverged.pop(b_id, None)
                self.species_counter[root] += 1
                new_species = f"{root}/{self.species_counter[root] + 1}"
                while new_species in existing:
                    self.species_counter[root] += 1
                    new_species = f"{root}/{self.species_counter[root] + 1}"
                t.brains[b_id].species = new_species
                for m in agents:
                    m["species"] = new_species
                    commands.append((m["realm"], {"id": m["id"], "commands": [{"type": "set_species", "species": new_species}]}))
                t.log.write("speciation", root=root, parent_species=species, species=new_species, brain=b_id,
                            distance=round(dist, 4), agents=len(agents), generation=generation)
                print(f"[evolve]   SPECIATION: {species} -> {new_species} ({len(agents)} agents, distance {dist:.3f})")
                break                    # at most one new species per species per generation
        return commands

    def _gene_ranges(self):
        for realm in self.t.realms:
            if realm.hello and realm.hello.get("genes"):
                return {g: max(hi - lo, 1e-6) for g, (lo, hi) in realm.hello["genes"].items()}
        return {g: 1.0 for g in GENES}


def genome_distance(group_a, group_b, ranges):
    """RMS distance between two groups' mean genomes, each gene scaled by its allowed range."""
    total = 0.0
    for g in GENES:
        mean_a = sum((m.get("genome") or {}).get(g, 1.0) for m in group_a) / len(group_a)
        mean_b = sum((m.get("genome") or {}).get(g, 1.0) for m in group_b) / len(group_b)
        total += ((mean_a - mean_b) / ranges.get(g, 1.0)) ** 2
    return math.sqrt(total / len(GENES))


@torch.no_grad()
def mutate_weights(net, sigma):
    """Gaussian weight mutation on the trunk and heads (not log_std, which PPO tunes)."""
    for name, p in net.named_parameters():
        if name != "log_std":
            p.add_(torch.randn_like(p) * sigma)


# ==============================================================================================
# Metrics (what the A/B comparison and long runs are judged on)
# ==============================================================================================

class Metrics:
    """Outcome measures per window of PPO updates, written to <run>/metrics.json.

    All rates are per agent-second of life, so they don't depend on population size:
      xp_per_agent_s       XP earned per second alive (XP is the game's own success measure)
      starved_per_agent_h  starvation deaths per agent-hour (lower = better foraging)
      births_per_agent_h   own-energy births per agent-hour (immigration counted separately)
      mean_death_age_s     mean age at death (all causes)
    """

    def __init__(self, path, policy):
        self.path, self.policy = path, policy
        self.windows = []
        self._reset()

    def _reset(self):
        self.w = {"agent_s": 0.0, "xp": 0.0, "steps": 0, "pop_sum": 0, "reward_sum": 0.0, "reward_n": 0,
                  "deaths": defaultdict(int), "births": defaultdict(int), "death_age_sum": 0.0, "death_n": 0,
                  "started": time.time()}

    def alive(self, seconds, xp_gain):
        self.w["agent_s"] += seconds
        self.w["xp"] += max(0.0, xp_gain)

    def reward(self, r):
        self.w["reward_sum"] += r
        self.w["reward_n"] += 1

    def step(self, population):
        self.w["steps"] += 1
        self.w["pop_sum"] += population

    def event(self, ev):
        if ev.get("type") == "birth":
            self.w["births"][ev.get("mode") or "?"] += 1
        elif ev.get("type") == "death":
            cause = (ev.get("cause") or "?").split(" ")[0]       # "killed by x" -> "killed"
            self.w["deaths"][cause] += 1
            self.w["death_age_sum"] += float(ev.get("age") or 0.0)
            self.w["death_n"] += 1

    def close_window(self, update):
        w = self.w
        hours = max(w["agent_s"], 1e-9) / 3600.0
        own_births = sum(n for mode, n in w["births"].items() if mode != "immigration")
        row = {"update": update, "policy": self.policy, "steps": w["steps"],
               "agent_s": round(w["agent_s"], 1),
               "mean_population": round(w["pop_sum"] / max(1, w["steps"]), 2),
               "xp_per_agent_s": round(w["xp"] / max(w["agent_s"], 1e-9), 4),
               "starved_per_agent_h": round(w["deaths"].get("starved", 0) / hours, 3),
               "births_per_agent_h": round(own_births / hours, 3),
               "immigrants": w["births"].get("immigration", 0),
               "mean_death_age_s": round(w["death_age_sum"] / max(1, w["death_n"]), 2),
               "mean_reward": round(w["reward_sum"] / max(1, w["reward_n"]), 5),
               "deaths": dict(w["deaths"]), "births": dict(w["births"])}
        self.windows.append(row)
        self._reset()
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({"policy": self.policy, "windows": self.windows}, f, indent=1)
        os.replace(tmp, self.path)
        return row


# ==============================================================================================
# Trainer
# ==============================================================================================

class Trainer:
    def __init__(self, args):
        self.args = args
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.realms = [RealmClient(addr, args.timeout) for addr in (args.realm or ["127.0.0.1:9777"])]
        self.brains = {}                 # brain id -> Brain
        self.brain_counter = 0
        self.memory = {}                 # "realm|id" -> per-agent memory (see _remember)
        self.pending = {}                # "realm|id" -> (brain id, snapshot actor) for last step
        self.step = 0
        self.update_count = 0
        self.generation = 0
        self.seq = 0
        self.reward_sum, self.reward_n = 0.0, 0
        self.brain_load, self.pop, self.total = defaultdict(int), defaultdict(int), 0
        os.makedirs(args.run, exist_ok=True)
        self.ckpt_path = os.path.join(args.run, "checkpoint.pt")
        self.log = LineageLog(os.path.join(args.run, "lineage.jsonl"))
        self.evolution = Evolution(self, args)
        self.metrics = Metrics(args.metrics or os.path.join(args.run, "metrics.json"), args.policy)
        self.last_time = {}              # realm -> sim time of its last snapshot (real step length)
        self.extinct_checks = defaultdict(int)
        self.last_event_seq = {}         # realm -> last event seq seen (gap detection)

    # -- brains -------------------------------------------------------------------------------------

    def new_brain(self, species, parent=None):
        self.brain_counter += 1
        brain = Brain(f"{species}#{self.brain_counter}", species, self.device, self.args.lr, parent)
        brain.born_generation = self.generation
        self.brains[brain.id] = brain
        return brain

    def brain_for(self, mem):
        """Children inherit their parent's brain; others join the least-used brain of their species."""
        if mem.get("brain") in self.brains and self.brains[mem["brain"]].species == mem["species"]:
            return mem["brain"]
        candidates = [b for b in self.brains.values() if b.species == mem["species"]]
        if not candidates:
            # A species the trainer has never seen (e.g. evolved in an earlier run): start its
            # brains from a same-root brain if there is one, so it keeps its ancestors' skills.
            same_root = [b for b in self.brains.values() if root_species(b.species) == root_species(mem["species"])]
            # Extra brains start as mutated copies of the first, so weight distance between brains
            # measures how far they have drifted apart (that is what speciation tests).
            first = None
            for _ in range(self.args.brains if not same_root else 1):
                source = first or (same_root[0] if same_root else None)
                nb = self.new_brain(mem["species"], parent=source.id if source else None)
                if source is not None:
                    nb.net.load_state_dict(source.net.state_dict())
                    if source is first:
                        mutate_weights(nb.net, self.args.weight_sigma)
                first = first or nb
            candidates = [b for b in self.brains.values() if b.species == mem["species"]]
        best = min(candidates, key=lambda b: self.brain_load[b.id]).id
        self.brain_load[best] += 1
        return best

    # -- checkpoint ---------------------------------------------------------------------------------

    def save(self):
        tmp = self.ckpt_path + ".tmp"
        torch.save({"brains": [b.state() for b in self.brains.values()], "brain_counter": self.brain_counter,
                    "memory": {k: v for k, v in self.memory.items() if v["alive"]},
                    "step": self.step, "updates": self.update_count, "generation": self.generation,
                    "elites": self.evolution.elites, "species_counter": dict(self.evolution.species_counter)}, tmp)
        os.replace(tmp, self.ckpt_path)
        self.log.flush()
        print(f"[trainer] saved {self.ckpt_path} ({len(self.brains)} brains, generation {self.generation})")

    def load(self):
        """Resume <run>/checkpoint.pt, or with --load take only the brains from another run's
        checkpoint (to evaluate a trained policy on a fresh world)."""
        path = self.args.load or self.ckpt_path
        if not os.path.exists(path):
            if self.args.load:
                raise SystemExit(f"--load: {path} not found")
            return
        data = torch.load(path, map_location=self.device, weights_only=False)
        for st in data["brains"]:
            b = Brain(st["id"], st["species"], self.device, self.args.lr, st.get("parent"))
            b.net.load_state_dict(st["net"])
            try:
                b.opt.load_state_dict(st["opt"])
            except ValueError:
                pass
            b.fitness_history, b.mutations = st.get("fitness_history", []), st.get("mutations", [])
            self.brains[b.id] = b
        self.brain_counter = data.get("brain_counter", len(self.brains))
        if self.args.load:
            print(f"[trainer] loaded {len(self.brains)} brains from {path} (policy {self.args.policy})")
            return
        self.memory = data.get("memory", {})
        for m in self.memory.values():
            # Not alive until a realm reports the agent again; ones that never come back are
            # forgotten after the first update instead of counting as alive forever.
            m["seen"], m["alive"] = False, False
        self.step, self.update_count = data.get("step", 0), data.get("updates", 0)
        self.generation = data.get("generation", 0)
        self.evolution.elites = data.get("elites", {})
        self.evolution.species_counter.update(data.get("species_counter", {}))
        print(f"[trainer] resumed {self.ckpt_path}: {len(self.brains)} brains, {len(self.memory)} agents, "
              f"generation {self.generation}")

    # -- per-agent memory ---------------------------------------------------------------------------

    def _remember(self, realm, a, hello):
        key = f"{realm}|{a['id']}"
        m = self.memory.get(key)
        if m is None:
            m = {"key": key, "realm": realm, "id": a["id"], "species": a["species"], "brain": None,
                 "parent": a.get("parent"), "lineage": a.get("lineage", []), "generation": a.get("generation", 0),
                 "mutation_history": [], "born_step": self.step, "alive": True,
                 "xp_gain": 0.0, "alive_s": 0.0, "births": 0, "kills_gain": 0, "ally_sum": 0.0, "ally_n": 0,
                 "ally_mean": 0.0, "fitness": 0.0}
            parent = self.memory.get(f"{realm}|{a.get('parent')}") if a.get("parent") else None
            if parent is not None and parent.get("brain") in self.brains:
                m["brain"] = parent["brain"]                  # inherit the parent's brain
            self.memory[key] = m
        m["species"] = a["species"]
        m["genome"] = a.get("genome") or {}
        m["brain"] = self.brain_for(m)
        m["alive"], m["seen"] = True, True
        m["prev_xp"], m["prev_health"], m["level"] = a["xp"], a["health"], a["level"]
        m["energy_frac"] = a["energy"] / max(a["max_energy"], 1e-6)
        rules = (hello.get("rules") or {}).get(root_species(a["species"]), {})
        m["breed_energy"] = rules.get("reproduce_energy", 0.8)
        allies = (a.get("sensors") or {}).get("allies", 0)
        m["ally_sum"] += allies
        m["ally_n"] += 1
        m["ally_mean"] = m["ally_sum"] / m["ally_n"]
        return key, m

    # -- the step -----------------------------------------------------------------------------------

    def collect(self):
        """One snapshot from every live realm. Returns {realm: state}."""
        states = {}
        now = time.monotonic()
        for realm in self.realms:
            if realm.sock is None:
                if now < realm.down_until:
                    continue
                try:
                    realm.connect(retries=0)
                except ConnectionError:
                    realm.down_until = now + 5.0
                    continue
            try:
                states[realm.name] = (realm, realm.next_state())
            except BridgeDisconnected as e:
                print(f"[trainer] realm '{realm.name}': {e}; will reconnect")
                realm.close()
                realm.down_until = now + 1.0
                self._truncate(realm.name)
        return states

    def _truncate(self, realm_name):
        """A realm dropped: its pending steps can't get rewards; discard them (not deaths)."""
        for key in [k for k in self.pending if k.startswith(realm_name + "|")]:
            brain_id, _ = self.pending.pop(key)
            buf = self.brains[brain_id].buffer.get(key) if brain_id in self.brains else None
            if buf and "reward" not in buf[-1]:
                buf.pop()

    def act(self, states):
        a = self.args
        self._count_population()
        per_brain = defaultdict(list)            # brain id -> [(realm client, key, actor)]
        for realm_name, (realm, state) in states.items():
            events = defaultdict(lambda: defaultdict(int))
            for ev in state.get("events", []):
                self._check_seq(realm_name, ev)
                self.metrics.event(ev)
                self._log_event(realm_name, ev, events)
            actors = {f"{realm_name}|{x['id']}": x for x in state["actors"]}
            # Real time since this realm's previous snapshot (bigger than dt when snapshots were
            # skipped); 0 on the first snapshot after (re)connecting.
            prev_t = self.last_time.get(realm_name)
            step_s = min(max(state["time"] - prev_t, 0.0), 2.0) if prev_t is not None else 0.0
            self.last_time[realm_name] = state["time"]
            self.metrics.step(len(actors))

            # Rewards for last step's actions in this realm.
            for key in [k for k in self.pending if k.startswith(realm_name + "|")]:
                brain_id, before = self.pending.pop(key)
                after = actors.get(key)
                dead = after is None
                r = reward_for(before, after, events[key])
                self.reward_sum += r
                self.reward_n += 1
                self.metrics.reward(r)
                if after is not None:
                    self.metrics.alive(step_s, after["xp"] - before["xp"])
                buf = self.brains[brain_id].buffer[key] if brain_id in self.brains else None
                if buf and "reward" not in buf[-1]:
                    buf[-1]["reward"], buf[-1]["done"] = r, dead
                mem = self.memory.get(key)
                if mem is not None:
                    if dead:
                        mem["alive"] = False
                    else:
                        mem["xp_gain"] += max(0.0, after["xp"] - before["xp"])
                        mem["kills_gain"] += after.get("kills", 0) - before.get("kills", 0)
                        mem["alive_s"] += step_s
                    mem["births"] += events[key].get("births", 0)

            for key, actor in actors.items():
                key, mem = self._remember(realm_name, actor, realm.hello)
                per_brain[mem["brain"]].append((realm, key, actor))

        # One batched forward pass per brain, across all realms.
        out = defaultdict(list)
        for brain_id, group in per_brain.items():
            brain = self.brains[brain_id]
            if a.policy == "random":
                # Baseline: uniform movement in the allowed range, reproduce when able half the time.
                moves = [[random.uniform(-1.0, 1.0) for _ in range(MOVE_SIZE)] for _ in group]
                bbit_l = [1.0 if random.random() < 0.5 else 0.0 for _ in group]
            else:
                obs = torch.tensor([observe(x) for _, _, x in group], dtype=torch.float32, device=self.device)
                with torch.no_grad():
                    move, breed, value = brain.net(obs)
                    mraw, bbit = move.sample(), breed.sample()
                    logp = move.log_prob(mraw).sum(-1) + breed.log_prob(bbit)
                mraw_l, bbit_l = mraw.cpu().tolist(), bbit.cpu().tolist()
                moves = torch.tanh(mraw).cpu().tolist()
                if a.policy == "learn":
                    logp_l, value_l, obs_l = logp.cpu().tolist(), value.cpu().tolist(), obs.cpu().tolist()
                    for i, (_, key, _) in enumerate(group):
                        brain.buffer[key].append({"obs": obs_l[i], "move": mraw_l[i], "breed": bbit_l[i],
                                                  "logp": logp_l[i], "value": value_l[i]})
            for i, (realm, key, actor) in enumerate(group):
                self.pending[key] = (brain_id, actor)
                m = moves[i]
                cmd = {"id": actor["id"], "delta_position": [m[0] * a.max_step_cm, m[1] * a.max_step_cm, 0.0],
                       "delta_rotation": [0.0, 0.0, m[2] * a.max_step_deg]}
                mem = self.memory[key]
                if bbit_l[i] > 0.5 and mem["energy_frac"] >= mem["breed_energy"] and self._room(mem):
                    genes = {g: round(random.gauss(0.0, a.gene_sigma), 4) for g in random.sample(GENES, 1)}
                    cmd["commands"] = [{"type": "reproduce", "mutate": genes,
                                        "offset": [random.uniform(-150, 150), random.uniform(-150, 150), 0.0]}]
                out[realm].append(cmd)
        for realm, cmds in out.items():
            self._send(realm, cmds)

    def _count_population(self):
        """Per-step counts (brain load, species sizes), so per-agent checks are O(1)."""
        self.brain_load, self.pop, self.total = defaultdict(int), defaultdict(int), 0
        for m in self.memory.values():
            if m["alive"]:
                self.brain_load[m.get("brain")] += 1
                self.pop[m["species"]] += 1
                self.total += 1

    def _room(self, mem):
        if self.pop[mem["species"]] >= self.args.max_pop or self.total >= self.args.max_total:
            return False
        self.pop[mem["species"]] += 1        # count the pending child against the caps
        self.total += 1
        return True

    def _send(self, realm, actions):
        self.seq += 1
        try:
            realm.send({"type": "actions", "seq": self.seq, "actions": actions})
        except BridgeDisconnected as e:
            print(f"[trainer] realm '{realm.name}': {e}")
            realm.close()
            self._truncate(realm.name)

    def _check_seq(self, realm, ev):
        """Bridge events are numbered without gaps; a jump means history was lost."""
        seq = ev.get("seq")
        if not isinstance(seq, int):
            return
        last = self.last_event_seq.get(realm)
        if last is not None and seq != last + 1 and seq > last:
            print(f"[trainer] realm '{realm}': events {last + 1}..{seq - 1} missing (they are in the "
                  f"bridge's event log, not in this run's lineage log)", file=sys.stderr)
            self.log.write("event_gap", realm=realm, first=last + 1, last=seq - 1)
        self.last_event_seq[realm] = max(seq, last or 0)

    def _log_event(self, realm, ev, events):
        kind = ev.get("type")
        key = f"{realm}|{ev.get('id')}"
        if kind == "birth":
            parent_key = f"{realm}|{ev.get('parent')}"
            events[parent_key]["births"] += 1
            pm = self.memory.get(parent_key)
            if pm is not None:
                self.memory[key] = {**{k: pm[k] for k in ("brain", "species")}, "key": key, "realm": realm,
                                    "id": ev["id"], "parent": ev.get("parent"), "lineage": [ev.get("parent")] + pm["lineage"][:15],
                                    "generation": ev.get("generation", 0), "mutation_history": [],
                                    "born_step": self.step, "alive": True, "xp_gain": 0.0, "alive_s": 0.0,
                                    "births": 0, "kills_gain": 0, "ally_sum": 0.0, "ally_n": 0, "ally_mean": 0.0,
                                    "fitness": 0.0}
            self.log.write("birth", realm=realm, **{k: v for k, v in ev.items() if k not in ("type", "realm")})
        elif kind == "death":
            events[key]["deaths"] += 1
            if key in self.memory:
                self.memory[key]["alive"] = False
            self.log.write("death", realm=realm, **{k: v for k, v in ev.items() if k not in ("type", "realm")})
        elif kind == "mutation":
            if key in self.memory:
                self.memory[key]["mutation_history"].append(ev.get("genes"))
                self.memory[key]["mutation_history"] = self.memory[key]["mutation_history"][-20:]
            self.log.write("mutation", realm=realm, **{k: v for k, v in ev.items() if k not in ("type", "realm")})
        elif kind in ("level_up", "speciation", "adopted"):
            self.log.write(kind, realm=realm, **{k: v for k, v in ev.items() if k not in ("type", "realm")})

    def learn(self):
        stats = {}
        if self.args.policy == "learn":
            for brain in self.brains.values():
                s = ppo_update(brain, self.args, self.device)
                if s:
                    stats[brain.id] = s
        self.update_count += 1
        self._prune_extinct()
        return stats

    def _prune_extinct(self):
        """An evolved species ("Root/n") with no living agent for 3 updates in a row is extinct:
        its brains are removed (the elite archive keeps its best) and the extinction is logged.
        Root species keep their brains, since immigration can bring them back."""
        alive_species = {m["species"] for m in self.memory.values() if m["alive"]}
        for species in {b.species for b in self.brains.values() if "/" in b.species}:
            if species in alive_species:
                self.extinct_checks.pop(species, None)
                continue
            self.extinct_checks[species] += 1
            if self.extinct_checks[species] >= 3:
                gone = [b_id for b_id, b in self.brains.items() if b.species == species]
                for b_id in gone:
                    del self.brains[b_id]
                del self.extinct_checks[species]
                self.log.write("extinction", species=species, brains=gone, generation=self.generation)
                print(f"[evolve]   EXTINCTION: {species} (brains {gone} removed)")

    def report(self, stats):
        alive = [m for m in self.memory.values() if m["alive"]]
        pops = defaultdict(int)
        for m in alive:
            pops[m["species"]] += 1
        line = ", ".join(f"{s}={n}" for s, n in sorted(pops.items()))
        samples = sum(s["samples"] for s in stats.values())
        ent = sum(s["entropy"] for s in stats.values()) / max(1, len(stats))
        mean_r = self.reward_sum / max(1, self.reward_n)
        self.reward_sum, self.reward_n = 0.0, 0
        if self.update_count % self.args.metrics_every == 0:
            row = self.metrics.close_window(self.update_count)
            print(f"[metrics] xp/agent-s {row['xp_per_agent_s']:.3f}  starved/agent-h {row['starved_per_agent_h']:.1f}  "
                  f"births/agent-h {row['births_per_agent_h']:.1f}  death age {row['mean_death_age_s']:.0f}s  "
                  f"pop {row['mean_population']:.0f}  immigrants {row['immigrants']}")
        print(f"[trainer] update {self.update_count} step {self.step}: {samples} samples, mean reward {mean_r:+.4f}, "
              f"{len(self.brains)} brains, entropy {ent:.2f}; population {line}")
        for realm in self.realms:
            errors = realm.take_error_report()
            if errors or realm.skipped:
                print(f"[trainer]   realm '{realm.name}': {realm.skipped} stale snapshots skipped; "
                      f"bridge refused: {errors or 'nothing'}")
                realm.skipped = 0

    def run(self):
        a = self.args
        self.load()
        for realm in self.realms:                # wait for the first realm, then go
            try:
                realm.connect(retries=a.connect_retries)
            except ConnectionError as e:
                print(f"[trainer] {e}")
                realm.down_until = time.monotonic() + 5.0
        if all(r.sock is None for r in self.realms):
            print("[trainer] no realm reachable; is unreal_bridge.start_bridge() running?")
            return
        try:
            while a.updates <= 0 or self.update_count < a.updates:
                states = self.collect()
                if not states:
                    time.sleep(0.5)
                    continue
                self.act(states)
                self.step += 1
                if self.step % a.rollout == 0:
                    stats = self.learn()
                    self.report(stats)
                    if a.generation > 0 and self.update_count % a.generation == 0:
                        self.generation += 1
                        commands = self.evolution.run(self.generation)
                        by_realm = defaultdict(list)
                        for realm_name, cmd in commands:
                            by_realm[realm_name].append(cmd)
                        for realm in self.realms:
                            if realm.sock is not None and by_realm.get(realm.name):
                                self._send(realm, by_realm[realm.name])
                    if self.update_count % a.save_every == 0:
                        self.save()
                    self._forget_dead()
        except KeyboardInterrupt:
            print("\n[trainer] stopping (Ctrl-C)")
        finally:
            self.save()
            for realm in self.realms:
                realm.close()
            self.log.close()

    def _forget_dead(self):
        for key in [k for k, m in self.memory.items() if not m["alive"]]:
            del self.memory[key]
        for brain in self.brains.values():
            for key in [k for k in brain.buffer if k not in self.memory and not brain.buffer[k]]:
                del brain.buffer[key]


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Train Primordia agents in Unreal with PPO + evolution")
    p.add_argument("--realm", action="append", help="host:port of a bridge; repeat for multi-realm")
    p.add_argument("--run", default="runs/eco", help="folder for checkpoint.pt and lineage.jsonl")
    p.add_argument("--updates", type=int, default=0, help="PPO updates to run (0 = until Ctrl-C)")
    p.add_argument("--rollout", type=int, default=64, help="snapshots per PPO update")
    p.add_argument("--lr", type=float, default=3e-4)
    p.add_argument("--gamma", type=float, default=0.99)
    p.add_argument("--lam", type=float, default=0.95)
    p.add_argument("--clip", type=float, default=0.2)
    p.add_argument("--epochs", type=int, default=4)
    p.add_argument("--minibatch", type=int, default=512)
    p.add_argument("--vf-coef", type=float, default=0.5)
    p.add_argument("--ent-coef", type=float, default=0.005)
    p.add_argument("--max-step-cm", type=float, default=15.0, help="largest move per step, per axis (15 cm at 20 Hz = 3 m/s)")
    p.add_argument("--max-step-deg", type=float, default=15.0)
    p.add_argument("--brains", type=int, default=2, help="brains per species (population-based training)")
    p.add_argument("--generation", type=int, default=5, help="PPO updates per evolutionary generation")
    p.add_argument("--cull", type=float, default=0.1, help="fraction of each species culled per generation")
    p.add_argument("--breed", type=float, default=0.1, help="fraction of each species reproduced per generation")
    p.add_argument("--min-pop", type=int, default=3)
    p.add_argument("--max-pop", type=int, default=200)
    p.add_argument("--max-total", type=int, default=1000)
    p.add_argument("--gene-sigma", type=float, default=0.03)
    p.add_argument("--weight-sigma", type=float, default=0.02)
    p.add_argument("--brain-margin", type=float, default=0.5,
                   help="replace a brain when it trails the best by this fraction of the best's fitness")
    p.add_argument("--speciation-distance", type=float, default=0.08,
                   help="range-scaled RMS distance between a lineage's mean genome and its species' that founds a new species")
    p.add_argument("--max-species-per-root", type=int, default=4)
    p.add_argument("--speciation-age", type=int, default=3, help="generations in a row a lineage must stay that far apart")
    p.add_argument("--save-every", type=int, default=10, help="PPO updates between checkpoints")
    p.add_argument("--timeout", type=float, default=15.0)
    p.add_argument("--connect-retries", type=int, default=None, help="default: retry forever")
    p.add_argument("--policy", choices=("learn", "frozen", "random"), default="learn",
                   help="learn = PPO; frozen = act with the brains but never update them (baseline, "
                        "or evaluation with --load); random = uniform random actions (baseline)")
    p.add_argument("--load", default=None, help="take brains (only) from this checkpoint, e.g. to evaluate a trained run")
    p.add_argument("--metrics", default=None, help="metrics JSON path (default <run>/metrics.json)")
    p.add_argument("--metrics-every", type=int, default=5, help="PPO updates per metrics window")
    p.add_argument("--threads", type=int, default=0, help="torch CPU threads (0 = torch default)")
    p.add_argument("--seed", type=int, default=None)
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    # Treat a terminate signal (service stop, `kill`, a timeout) like Ctrl-C: save, then exit.
    def _terminate(signum, frame):
        raise KeyboardInterrupt
    for name in ("SIGTERM", "SIGBREAK"):
        if hasattr(signal, name):
            signal.signal(getattr(signal, name), _terminate)
    if args.threads > 0:
        torch.set_num_threads(args.threads)
    if args.seed is not None:
        random.seed(args.seed)
        torch.manual_seed(args.seed)
    Trainer(args).run()


if __name__ == "__main__":
    main()
