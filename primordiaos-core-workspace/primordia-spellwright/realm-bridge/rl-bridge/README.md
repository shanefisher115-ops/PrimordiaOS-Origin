# Primordia eco-bridge: Unreal ↔ PyTorch evolutionary ecosystem

The realm runs in Unreal and the brains run in PyTorch. Agents (Lumen-Seed, Gravemind, Echo-Swarm and every species that evolves from them) do the following:
- sense the world in Unreal;
- act through policies trained with PPO;
- gain XP and levels by doing what their species is good at;
- reproduce, mutate and die;
- split into new species over generations.

| File | Runs in | What it does |
|---|---|---|
| `unreal_bridge.py` | Unreal Editor 5.4 (Python Editor Script Plugin) | The world. It tracks agents, runs the ecosystem rules (XP, levels, health, energy, age, resources, territory, combat, death, reproduction), gathers sensors and raycasts, and serves TCP at 20–60 Hz. |
| `agent_trainer.py` | Any Python 3.10+ with PyTorch | The brains. It handles observations, multi-agent PPO with several brains per species, XP-centred rewards, and evolution: selection, weight and gene mutation, reproduction, culling, population scaling, speciation and an elite archive. It also keeps the lineage log, multi-realm play and checkpoints. |
| `headless_realm.py` | Plain Python | Runs `unreal_bridge.py` on a stand-in for Unreal's API, with no physics or rendering. Use it to test the trainer and protocol without the editor. |
| `demo_scene.py` | Unreal Editor | Builds a scratch test level (arena, resources, agents, pool) and starts the bridge. |
| `ab_compare.py` | Plain Python | A/B evaluation: trained vs untrained vs random policy on identical headless realms. |
| `test_persistence.py` | Plain Python | Regression tests for the event log, record continuity and the species cap. |

## Architecture

```
 Unreal Editor (game thread)                                   Python + PyTorch
 ┌──────────────────────────────────────────┐   TCP, NDJSON    ┌───────────────────────────────────────┐
 │ Slate post-tick, fixed rate (20-60 Hz)   │  "primordia-eco/1"│ RealmClient per realm (reconnects)    │
 │  1 accept / read actions, apply them ────┼◄─────────────────┤  actions: move, turn, reproduce,      │
 │  2 read transforms                       │                  │           mutate, die, set_species,   │
 │  3 ecosystem step: XP, energy, combat,   │                  │           add_xp, level_up            │
 │    gathering, territory, levels, deaths, │                  │                                       │
 │    immigration                           │                  │ observe() -> 53 floats per agent      │
 │  4 sensors: nearest resource/enemy/ally, │      state       │ Brain = actor-critic + PPO buffer     │
 │    counts, raycasts (budgeted)           ├─────────────────►│  (2+ brains per species)              │
 │  5 snapshot + events                     │  + events        │ reward_for(): XP gain + survival ...  │
 │ Agent records (XP, lineage, genome)      │                  │ Evolution every N updates             │
 │  -> Saved/RLBridge/<realm>.json          │                  │ LineageLog -> runs/<run>/lineage.jsonl│
 └──────────────────────────────────────────┘                  │ checkpoint -> runs/<run>/checkpoint.pt│
                                                               └───────────────────────────────────────┘
```

**Unreal owns the facts.** That covers XP, health, energy, age, territory, who killed whom, and whether there was energy to reproduce.

**PyTorch owns the decisions.** That covers where to move, whether to try to reproduce, who survives selection, how genes and weights mutate, and when a lineage becomes a new species.

There are three reasons for the split:
- The game rules stay authoritative in one place, so a buggy trainer can't grant itself XP without saying so (`add_xp` is explicit and logged).
- The trainer can be restarted, swapped or moved to another machine without touching the realm.
- One trainer can drive several realms.

**Everything in Unreal runs on the game thread.** Unreal objects can't be touched from other threads. The socket is non-blocking and polled once per frame, and per-frame read work is capped. Snapshots are skipped rather than queued when the trainer falls behind, so a stalled trainer never stalls the editor. Every move is clamped.

## XP: the signal that connects everything

| Where | How |
|---|---|
| Gameplay (Unreal) | Each species earns XP for its own way of life (table below). Level = 1 + ⌊√(XP/100)⌋, so levels arrive at 0, 100, 400, 900 XP… A level-up heals the agent and grows species traits. If an actor has Blueprint variables called `XP`, `Level`, `Health`, `Energy` or `Age`, they are kept in sync every tick so Blueprints can react (VFX, sounds, UI). |
| Observation | `log(1+XP)/10` and `level/10` are in every agent's observation. |
| Reward | `0.05 × ΔXP` per step, plus `+1` per level gained, with small survival, damage and energy terms (`REWARD` in the trainer). |
| Fitness | XP gained over the generation dominates `fitness_of()`. Survival time, offspring and species metrics break ties. |
| Evolution | The fittest (by XP) reproduce, the weakest are culled, species populations grow or shrink by mean fitness, and brains are selected by the mean fitness of their agents. |
| Divergence | A brain whose agents keep earning XP differently enough to drift its weights becomes a new species. |
| Trainer → game | `add_xp` and `level_up` commands let the trainer award XP for things only it can judge, such as exploration. They are clamped and logged. |

## Species

The gameplay rules for each species are in `SPECIES_RULES` (`unreal_bridge.py`). Its learning extras are in `SHAPING` and `fitness_of` (`agent_trainer.py`).

| | Lumen-Seed | Gravemind | Echo-Swarm |
|---|---|---|---|
| Diet | forager (resource nodes) | predator (other species) | forager |
| XP from | gathering (1/energy), growth while well fed (0.5/s), survival (0.1/s) | damage dealt (0.5/pt), kills (60), holding territory (0.4/s) | cohesion (0.15 per ally within 6 m, per s, max 8), gathering (0.5), collective feeding (3+ on one node), survival |
| Per level | size +8%, max health +8 | armor +0.03, aggression +5%, max health +12 | sense range +5%, speed +3%, max health +4 |
| Reproduction | **budding**: one bud at 60% of the parent's size with 30% of its energy | **splitting**: two equals, with health and energy halved | **fission**: 2–3 small children share 80% of the energy |
| Needs to reproduce | 70% energy | 80% energy | 75% energy |
| Trainer shaping | energy gained | kills | allies nearby |
| Fitness extra | levels × 5 | kills × 10 | mean allies × 0.5 |

**Combat.** A Gravemind damages the nearest agent of another root species within 2.5 m. The damage is `20/s × aggression × (1 + 0.1 × (level−1))`, reduced by the target's armor. A kill gives it half the victim's max energy.

**Territory.** Actors tagged `Territory` are zones whose radius is 10 m × scale X. Anywhere else falls into a 50 m grid cell. A zone is held by the species with the most agents in it.

**Death.** An agent dies when health reaches 0, energy reaches 0, or its age passes its species' lifespan (+5% per level). Dead agents return to the pool.

**Immigration.** A root species that drops below `respawn_below` (4) agents gets one fresh agent per second from the pool, so an ecosystem never ends in extinction.

**Genome.** Each agent has `size, speed, armor, aggression, sense, metabolism` (bounds in `GENE_BOUNDS`). Children inherit the parent's genome and mutate it. Size drives the actor's scale.

## The evolution loop

Every `--rollout` snapshots, each brain runs a PPO update on its own agents' experience: GAE(λ=0.95), clip 0.2, 4 epochs. Every `--generation` updates, the evolution step runs:

1. **Fitness:** `fitness_of()` for each living agent, over the generation.
2. **Population scaling:** each species gets a target size of `n × (1 + 0.25 × relative mean fitness)`, between `--min-pop` and `--max-pop` and within `--max-total`.
3. **Selection:** the weakest `--cull` fraction (plus any surplus over target) get `die`. The fittest `--breed` fraction (plus any shortfall) that have enough energy get `reproduce`, with a gene mutation of σ `--gene-sigma` on two random genes. Unreal applies the species' reproduction mode. Agents can also choose to reproduce themselves: the policy has a reproduce output, used whenever the agent has enough energy and the population has room.
4. **Speciation:** this check runs before brain selection, so a lineage that has drifted can branch off before it would be reset.
   - Each brain's agents form a lineage, because children inherit their parent's brain.
   - The distance is measured between the lineage's mean genome and the rest of the species', with each gene scaled by its allowed range.
   - When that distance stays over `--speciation-distance` for `--speciation-age` generations in a row, the lineage founds `<Root>/<n>` (for example `Gravemind/2`) and its agents are re-tagged with `set_species`.
   - A new species keeps its root's game rules and gets its own brain and its own population. Up to `--max-species-per-root` species can exist per root.
   - Genes are the measure, not network weights. PPO moves weights very little (two brains of a species stayed about 0.001 apart in testing), while gene mutation at every birth plus selection makes lineages drift measurably.
5. **Brain selection (population-based training):** each species has `--brains` policies. A brain that trails the best by more than `--brain-margin` (a fraction of the best's fitness) is replaced by a copy of the best with Gaussian weight noise σ `--weight-sigma`. Its agents keep their genes, so the lineage carries on with a better brain.
6. **Elite archive:** the best brain state per species is kept, and its score decays 5% per generation. If a species' best brain falls below half the elite score, the elite is restored into its worst brain, and the elite's score resets to today's level so the restore can't repeat every generation.

Lineage goes to `runs/<run>/lineage.jsonl`, one JSON object per line. Events are birth (with parent, mode and generation), death (with cause, age, XP and level), mutation, level_up, speciation, brain_mutation, brain_fork, elite_restore and generation. Each agent's memory in the trainer holds:
- its previous XP and health;
- its lineage (its 16 nearest ancestors);
- its mutation history;
- its brain.

## Message protocol `primordia-eco/1`

TCP on localhost. UTF-8 JSON, one object per line, terminated by `\n`. Units are Unreal's: cm, degrees, X forward and Z up. Rotations are `[roll, pitch, yaw]`. One trainer per bridge; a second connection is told why and closed.

**Bridge → trainer**

```jsonc
{"type":"hello","protocol":"primordia-eco/1","realm":"realm-0","hz":20,"world":"editor",
 "species":["LumenSeed","Gravemind","EchoSwarm"],
 "rules":{"Gravemind":{"diet":"predator","reproduction":"splitting","max_age_s":500,"reproduce_energy":0.8,"xp":{...}}, ...},
 "genes":{"size":[0.4,3.0], ...}, "rays":8,
 "limits":{"max_step_cm":300,"max_step_deg":45,"max_agents":2000},
 "resources":[{"id":"...","position":[x,y,z]}]}

{"type":"state","seq":41,"realm":"realm-0","time":12.35,"dt":0.05,"world":"editor","pool":30,
 "actors":[{"id":"3f9a0c21b7e4","species":"Gravemind/2","root":"Gravemind",
            "position":[x,y,z],"rotation":[r,p,y],"scale":[x,y,z],"velocity":[x,y,z],
            "xp":412.5,"level":3,"health":96.0,"max_health":144.0,"energy":70.2,"max_energy":120,
            "age":88.1,"max_age":500,"generation":4,"parent":"a1b2c3d4e5f6","lineage":["a1b2...", "..."],
            "children":2,"kills":5,"territory":"cell:2:-1",
            "genome":{"size":1.0,"speed":1.04,"armor":0.08,"aggression":1.12,"sense":1.0,"metabolism":0.97},
            "sensors":{"rays":[1.0,0.42,...],                 // clear fraction per ray, heading first
                       "resource":[dx,dy,dz,dist],             // nearest, or null
                       "enemy":[dx,dy,dz,dist],"ally":[dx,dy,dz,dist],
                       "allies":3,"threats":0,"radius":2500,"owned_territory":true}}],
 "events":[{"type":"birth","id":"...","parent":"...","species":"...","mode":"splitting","generation":5,"genome":{...},"t":12.3},
           {"type":"death","id":"...","species":"...","cause":"killed by 3f9a...","age":51.0,"xp":80.2,"level":1},
           {"type":"level_up","id":"...","species":"...","level":3},
           {"type":"mutation","id":"...","genes":{"speed":0.03},"genome":{...}},
           {"type":"speciation","id":"...","from":"Gravemind","species":"Gravemind/2"}],
 "territories":{"cell:2:-1":"Gravemind/2"}}

{"type":"ack","seq":7,"applied":40,"errors":[{"id":"...","error":"not enough energy to reproduce (40/96)"}],"events":[...]}
{"type":"reset_done","restored":48}   {"type":"pong","time":12.4}   {"type":"saved"}   {"type":"error","error":"..."}
```

**Trainer → bridge**

```jsonc
{"type":"actions","seq":7,"actions":[
  {"id":"3f9a0c21b7e4",
   "delta_position":[dx,dy,dz],          // cm, clamped to max_step_cm × speed gene
   "delta_rotation":[droll,dpitch,dyaw], // deg, clamped to max_step_deg
   "scale":[sx,sy,sz],                   // absolute (genome size normally drives scale)
   "commands":[
     {"type":"reproduce","offset":[x,y,z],"mutate":{"speed":0.02}},   // species decides the mode
     {"type":"mutate","genes":{"armor":-0.01}},
     {"type":"set_species","species":"Gravemind/2"},                    // same root only
     {"type":"add_xp","amount":25,"reason":"explore"},                  // ±1000 max
     {"type":"level_up"},
     {"type":"die","cause":"culled"}]}]}
{"type":"reset"}   {"type":"ping"}   {"type":"save"}
```

Unknown fields are ignored. An unknown command is reported in the ack and skipped. To add a command, write `cmd_<name>(bridge, live, command, ack)` and register it in `COMMANDS`.

## Setup

### 1. Enable Python in Unreal

In **Edit → Plugins**, enable **Python Editor Script Plugin** and restart. **Editor Scripting Utilities** is already on in this project. Optionally, under **Edit → Project Settings → Plugins → Python**, enable **Developer Mode** to get `Intermediate/PythonStub/unreal.py` for autocompletion.

### 2. Put the bridge on Unreal's Python path

Copy `unreal_bridge.py` to `<Project>/Content/Python/`. Unreal adds that folder to `sys.path` automatically. For this project that's `C:\Users\Shane\Documents\Unreal Projects\PrimordiaRealms\Content\Python\`. You can also add this repo folder under **Project Settings → Python → Additional Paths**, which avoids copying.

### 3. Tag actors

- **Agents:** give each actor the tag of its species: `LumenSeed`, `Gravemind` or `EchoSwarm` (Details → Actor → Tags). Any movable actor works, such as a Static Mesh Actor or a Blueprint. Set **Mobility = Movable**. The bridge adds `RLAgent`, `Species:<name>` and a stable `RLID:<id>` tag itself; don't edit those.
- **Resource nodes:** tag them `Resource`.
- **Territory zones (optional):** tag them `Territory`. The radius is 10 m × scale X.
- **Pool (needed for births during Play-In-Editor):** place spare agent actors, hidden or off to the side, tagged `RLPool` plus their species tag. Unreal refuses to spawn or duplicate from editor Python while PIE runs, so births come from the pool. Dead agents return to it. In the editor world, the bridge duplicates the parent when the pool is empty.
- **Blueprint stats (optional):** float or int variables named `XP`, `Level`, `Health`, `Energy` or `Age` are kept in sync.

Actors that the Primordia realm server drives (`ASpeciesActor`, the realm root) get their transforms from the node bridge every second. They would overwrite the trainer's moves, so use separate agent actors.

### 4. Run the bridge

In the Output Log, switch the input box from `Cmd` to `Python`:

```python
import unreal_bridge
unreal_bridge.start_bridge()                 # 127.0.0.1:9777, 20 Hz
# options: start_bridge(port=9778, hz=30, realm="realm-b", rays=4, respawn_below=0, ecosystem=True)
unreal_bridge.status()
unreal_bridge.stop_bridge()                  # saves records
```

After editing the file, reload it with `import importlib; importlib.reload(unreal_bridge)` and start again. The bridge keeps ticking while the editor is open. The world advances only while the editor ticks, so keep **Edit → Editor Preferences → Performance → Use Less CPU when in Background** off, or the realm slows to a crawl whenever the editor loses focus.

### 5. Run the trainer

```bash
python -m pip install torch          # CPU build is fine; CUDA is used automatically if present
python agent_trainer.py --run runs/eco1
```

### 6. Check that it's talking

- The Unreal log shows `[EcoBridge] trainer connected from 127.0.0.1:…`, and `status()` shows `trainer` and a rising `snapshots` count.
- The trainer prints `connected to realm 'realm-0'`, then a line per PPO update with population per species and mean reward.
- `runs/eco1/lineage.jsonl` grows with births, deaths and level-ups.
- To test without the editor:

```bash
python headless_realm.py --port 9777
```

### 7. Persist XP and lineage across sessions

- **Unreal:** agent records (XP, level, health, energy, age, genome, lineage) go to `<Project>/Saved/RLBridge/<realm>.json` every 30 s, on `save()` and on stop. Actors keep their `RLID` tag, saved with the level, so placed actors reattach to their records after a restart. Save the level after a session if you want evolved species tags kept on placed actors too.
- **Event log (the full history):** every event (birth, death, level-up, mutation, speciation, adoption) is appended to `<Project>/Saved/RLBridge/<realm>.events.jsonl` as it happens. Events carry a `seq` number that has no gaps and continues across restarts. The log is written whether or not a trainer is connected. Events wait in a queue, up to 5,000, for the next trainer to connect. The trainer warns and logs `event_gap` if a sequence number jumps.
- **Records are never overwritten:**
  - An actor whose `RLID` belongs to a dead agent becomes a new agent. Its `origin` is `{"forked_from": <old id>}` and it keeps the genes.
  - A Ctrl+D copy of an agent gets its own id the same way.
  - When Play stops, agents that lived only in the Play world are recorded as `lost (play session ended)`, and so are the Play-time records of placed agents. The placed actors in the editor then continue as new linked agents.
  - Living records whose actor disappears for 3 scans are recorded as `lost (actor removed)`.
- `python -m unittest test_persistence -v` checks all of this on the headless stand-in.
- **Trainer:** `runs/<run>/checkpoint.pt` holds the brains, optimizers, agent memory, elites and counters. It is written every `--save-every` updates and on Ctrl-C. Running with the same `--run` resumes.

## Measuring whether it learns

A world that looks alive proves nothing by itself. The trainer has baseline modes so that results can be compared:

| Flag | Meaning |
|---|---|
| `--policy learn` | PPO, the default. |
| `--policy frozen` | Act with the brains but never update them. With `--load <checkpoint>`, this evaluates a trained policy. Without it, it measures freshly initialised brains, which is where PPO starts. |
| `--policy random` | Uniform random movement; reproduce when able, half the time. |
| `--generation 0` | Trainer-side evolution off (no culling, breeding, brain mutation or speciation), so the policy is the only difference between arms. |

`<run>/metrics.json` gets a window every `--metrics-every` updates. It records XP per agent-second, starvation deaths per agent-hour, own births per agent-hour (immigration counted separately), mean age at death and mean population. All rates are per agent-second of life, so they don't depend on population size.

`python ab_compare.py --checkpoint runs/<train>/checkpoint.pt --seeds 11 12 13` runs trained, untrained and random arms side by side on identical fresh headless realms for each seed. It prints the per-seed differences with a paired t statistic and writes `runs/ab/ab_results.json`.

## Multiple realms

Run one bridge per editor or level, each with its own `port` and `realm`, then give the trainer every address:

```bash
python agent_trainer.py --realm 127.0.0.1:9777 --realm 127.0.0.1:9778 --realm 192.168.1.20:9777
```

- **Shared brains:** brains are shared across realms. Agents are keyed `realm|id`, and each brain does one batched forward pass for all its agents in every realm. Evolution ranks agents across realms, and commands go back to each agent's own realm.
- **Dropped realms:** a realm that drops is reconnected every few seconds. Its in-flight steps are discarded, not counted as deaths, and the others keep training.
- **Other machines:** for realms on other machines, start the bridge with `host="0.0.0.0"` on a trusted network only, because the protocol has no authentication. Or tunnel it, for example `ssh -L 9777:127.0.0.1:9777 realm-box`.
- **Laptop limits:** one editor at a time is realistic on this laptop. The headless realm is useful for extra simulated worlds alongside one real one.

## Scaling to thousands of agents

| Bottleneck | What to do |
|---|---|
| Python ecosystem step on the game thread | The step uses a spatial hash, so cost grows about linearly until agents crowd together. Measured with `headless_realm.py` on this laptop (Ryzen 3 4300U), the full tick (rules, sensors and snapshot) takes about **10 ms for 100 agents, 29 ms for 300 and 127 ms for 1,000**. The editor's Python API calls add to that. So the Python bridge is comfortable up to about **150 agents at 20 Hz**. For more agents, lower `hz` (10 is fine for learning; 300 agents at 10 Hz is about 30% of a frame budget), or move `_ecosystem_step` and `_sense` to C++ or Mass Entity and keep this protocol. The trainer doesn't change. |
| Raycasts | `ray_budget` caps traces per tick (default 512). Agents are refreshed round-robin and keep their last rays in between. |
| Snapshot size | About 670 bytes per agent, measured. 1,000 agents at 20 Hz is about 13 MB/s on localhost, which is fine. If you need less, drop `lineage` and `genome` from the snapshot. |
| Actor count | Static mesh actors with Nanite are cheap to draw, and each actor's tick should be off. For 10k+, drive instanced meshes or Mass instead of one actor per agent. |
| Trainer | One forward pass per brain per step, batched over all agents. PPO minibatches of 512. CPU handles a few thousand agents; CUDA is picked automatically. |

## Tuning and caveats

- **Balance is the hard part.** The defaults keep the headless test world alive, but a real level needs its own resource density and drain rates. Watch `lineage.jsonl` death causes: if most deaths are "starved", add resources or lower `drain_per_s`.
- **No physics.** Moves are teleports clamped per step, and walls stop agents only through their raycast sensors. For physical movement, turn moves into forces or Character movement input inside a Blueprint and keep the same protocol.
- **Speciation is slow by design.** Genes drift a little with each birth, so new species appear after many generations at the default `--speciation-distance 0.08`. To see it sooner, lower it (0.02) or raise `--gene-sigma`.
