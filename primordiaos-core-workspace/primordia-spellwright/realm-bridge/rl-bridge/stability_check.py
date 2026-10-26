"""
stability_check.py: is the ecology stable on its own, without any learning?

Runs the RANDOM policy on identical headless realms with damped reproduction (the bridge's
defaults: maturity, birth cooldown, crowding) and undamped reproduction (all three off), side
by side per seed, and compares population variation (pop_cv), starvation, immigration and food
intake. Because the policy is random in both arms, any difference is the ecology's.

    python stability_check.py --seeds 21 22
"""

import argparse
import json
import os
import statistics
import subprocess
import sys
import time

from ab_compare import population_cv

HERE = os.path.dirname(os.path.abspath(__file__))
ARMS = {"damped": {}, "undamped": {"maturity_s": 0, "birth_cooldown_s": 0, "crowding_k": 0}}


def main(argv=None):
    p = argparse.ArgumentParser(description="ecology stability: damped vs undamped reproduction, random policy")
    p.add_argument("--seeds", type=int, nargs="+", default=[21, 22])
    p.add_argument("--updates", type=int, default=40)
    p.add_argument("--rollout", type=int, default=64)
    p.add_argument("--window", type=int, default=4)
    p.add_argument("--speed", type=float, default=2.0)
    p.add_argument("--out", default=os.path.join(HERE, "runs", "stability"))
    p.add_argument("--base-port", type=int, default=9821)
    a = p.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    rows = {arm: [] for arm in ARMS}
    for seed in a.seeds:
        realms, trainers = [], []
        for i, (arm, cfg) in enumerate(ARMS.items()):
            port = a.base_port + i
            realms.append(subprocess.Popen(
                [sys.executable, "-u", os.path.join(HERE, "headless_realm.py"), "--port", str(port), "--seed", str(seed),
                 "--realm", f"{arm}-{seed}", "--speed", str(a.speed), "--seconds", "1500", "--bridge", json.dumps(cfg)],
                stdout=open(os.path.join(a.out, f"realm_{arm}_{seed}.log"), "w"), stderr=subprocess.STDOUT))
        time.sleep(2)
        for i, arm in enumerate(ARMS):
            run = os.path.join(a.out, f"{arm}_{seed}")
            trainers.append((arm, run, subprocess.Popen(
                [sys.executable, "-u", os.path.join(HERE, "agent_trainer.py"), "--realm", f"127.0.0.1:{a.base_port + i}",
                 "--run", run, "--policy", "random", "--generation", "0", "--rollout", str(a.rollout),
                 "--updates", str(a.updates), "--metrics-every", str(a.window), "--seed", str(seed), "--threads", "1",
                 "--connect-retries", "20"],
                stdout=open(os.path.join(a.out, f"trainer_{arm}_{seed}.log"), "w"), stderr=subprocess.STDOUT)))
        for arm, run, proc in trainers:
            proc.wait()
            windows = json.load(open(os.path.join(run, "metrics.json"), encoding="utf-8"))["windows"][1:]
            rows[arm].append({
                "seed": seed, "pop_cv": population_cv(windows),
                "pop_min": min(w["pop_min"] for w in windows), "pop_max": max(w["pop_max"] for w in windows),
                "mean_population": statistics.fmean(w["mean_population"] for w in windows),
                "starved_per_agent_h": statistics.fmean(w["starved_per_agent_h"] for w in windows),
                "immigrants": sum(w["immigrants"] for w in windows),
                "food_per_agent_s": statistics.fmean(w["food_per_agent_s"] for w in windows)})
        for proc in realms:
            proc.terminate()
            proc.wait()
        print(f"seed {seed}: " + "; ".join(f"{arm} cv {rows[arm][-1]['pop_cv']:.2f}" for arm in ARMS), flush=True)

    keys = ("pop_cv", "pop_min", "pop_max", "mean_population", "starved_per_agent_h", "immigrants", "food_per_agent_s")
    print("\n%-22s" % "measure" + "".join("%-26s" % arm for arm in ARMS))
    for k in keys:
        print("%-22s" % k + "".join("%-26s" % ", ".join(f"{r[k]:.2f}" for r in rows[arm]) for arm in ARMS))
    with open(os.path.join(a.out, "stability.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=1)


if __name__ == "__main__":
    main()
