"""
ab_compare.py: does the trained policy do better than doing nothing clever? (A/B on headless realms)

For each seed, three identical fresh realms run at the same time (same seed, same CPU load), one
per arm:
    trained   the brains from --checkpoint, frozen (no learning during evaluation)
    untrained freshly initialised brains, frozen (what PPO started from)
    random    uniform random actions
Trainer-side evolution is off in every arm, so only the policy differs. The first metrics window
of each run is dropped as warm-up; the rest are averaged.

    python ab_compare.py --checkpoint runs/eco1/checkpoint.pt --seeds 11 12 13

Reports, per arm, mean and spread across seeds of: XP per agent-second (the game's own success
measure), starvation deaths per agent-hour, own births per agent-hour and mean age at death; and,
per seed, trained minus each baseline, with a paired t statistic across seeds. Writes
ab_results.json next to the metrics. A small number of seeds gives weak evidence; read the t
values and per-seed signs, not only the means.
"""

import argparse
import json
import math
import os
import shlex
import statistics
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ARMS = ("trained", "untrained", "random", "greedy")
MEASURES = (("food_alignment", "higher"), ("food_per_agent_s", "higher"), ("xp_per_agent_s", "higher"), ("starved_per_agent_h", "lower"),
            ("pop_cv", "lower"),
            ("births_per_agent_h", "higher"), ("mean_death_age_s", "higher"))


def run_seed(seed, args, out_dir, base_port):
    procs = []
    for i, arm in enumerate(ARMS):
        port = base_port + i
        realm_log = open(os.path.join(out_dir, f"realm_{arm}_{seed}.log"), "w")
        procs.append(subprocess.Popen(
            [sys.executable, "-u", os.path.join(HERE, "headless_realm.py"), "--port", str(port),
             "--realm", f"{arm}-{seed}", "--seed", str(seed), "--speed", str(args.speed),
             "--agents", str(args.agents), "--seconds", str(args.max_seconds), *shlex.split(args.realm_args)],
            stdout=realm_log, stderr=subprocess.STDOUT))
    time.sleep(2)
    trainers = []
    for i, arm in enumerate(ARMS):
        port = base_port + i
        run = os.path.join(out_dir, f"{arm}_{seed}")
        cmd = [sys.executable, "-u", os.path.join(HERE, "agent_trainer.py"), "--realm", f"127.0.0.1:{port}",
               "--run", run, "--generation", "0", "--rollout", str(args.rollout), "--updates", str(args.updates),
               "--metrics-every", str(args.window), "--threads", "1", "--seed", str(seed), "--connect-retries", "20", *shlex.split(args.trainer_args)]
        if arm == "trained":
            cmd += ["--policy", "frozen", "--load", args.checkpoint]
        elif arm == "untrained":
            cmd += ["--policy", "frozen"]
        elif arm == "random":
            cmd += ["--policy", "random"]
        else:
            cmd += ["--policy", "greedy"]
        log = open(os.path.join(out_dir, f"trainer_{arm}_{seed}.log"), "w")
        trainers.append((arm, run, subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT)))
    results = {}
    for arm, run, p in trainers:
        p.wait()
        with open(os.path.join(run, "metrics.json"), encoding="utf-8") as f:
            windows = json.load(f)["windows"][1:]                  # drop warm-up
        results[arm] = {k: statistics.fmean(w[k] for w in windows) for k, _ in MEASURES if k != "pop_cv"} if windows else None
        results[arm]["windows"] = len(windows)
        results[arm]["mean_population"] = statistics.fmean(w["mean_population"] for w in windows)
        results[arm]["immigrants"] = sum(w["immigrants"] for w in windows)
        results[arm]["pop_cv"] = population_cv(windows)
    for p in procs:
        p.terminate()
    for p in procs:
        p.wait()
    return results


def population_cv(windows):
    """Coefficient of variation of the population over the whole run (std / mean, from every
    snapshot): 0 = perfectly steady, ~0.5+ = boom and crash."""
    steps = sum(w["steps"] for w in windows)
    if not steps:
        return float("nan")
    mean = sum(w["mean_population"] * w["steps"] for w in windows) / steps
    sq = sum(w["pop_sq_mean"] * w["steps"] for w in windows) / steps
    return math.sqrt(max(sq - mean * mean, 0.0)) / max(mean, 1e-9)


def paired_t(diffs):
    if len(diffs) < 2:
        return float("nan")
    sd = statistics.stdev(diffs)
    return float("inf") if sd == 0 else statistics.fmean(diffs) / (sd / math.sqrt(len(diffs)))


def main(argv=None):
    p = argparse.ArgumentParser(description="A/B: trained vs untrained vs random policy on headless realms")
    p.add_argument("--checkpoint", required=True)
    p.add_argument("--seeds", type=int, nargs="+", default=[11, 12, 13])
    p.add_argument("--updates", type=int, default=36, help="rollouts per arm (windows = updates / window)")
    p.add_argument("--rollout", type=int, default=64)
    p.add_argument("--window", type=int, default=4)
    p.add_argument("--agents", type=int, default=16)
    p.add_argument("--speed", type=float, default=2.0)
    p.add_argument("--max-seconds", type=float, default=1200, help="safety limit per realm")
    p.add_argument("--out", default=os.path.join(HERE, "runs", "ab"))
    p.add_argument("--base-port", type=int, default=9801)
    p.add_argument("--realm-args", default="", help="extra headless_realm.py arguments (e.g. the benchmark world)")
    p.add_argument("--trainer-args", default="", help="extra agent_trainer.py arguments for every arm")
    args = p.parse_args(argv)
    os.makedirs(args.out, exist_ok=True)

    per_seed = {}
    for seed in args.seeds:
        t0 = time.time()
        per_seed[seed] = run_seed(seed, args, args.out, args.base_port)
        print(f"seed {seed} done in {time.time() - t0:.0f}s: " +
              "; ".join(f"{arm} food/s {per_seed[seed][arm]['food_per_agent_s']:.3f}" for arm in ARMS), flush=True)

    print("\n%-22s" % "measure" + "".join("%-22s" % arm for arm in ARMS))
    summary = {}
    for key, better in MEASURES:
        row = {}
        for arm in ARMS:
            vals = [per_seed[s][arm][key] for s in args.seeds]
            row[arm] = {"mean": statistics.fmean(vals), "sd": statistics.stdev(vals) if len(vals) > 1 else 0.0,
                        "per_seed": vals}
        summary[key] = row
        print("%-22s" % f"{key} ({better})" + "".join("%-22s" % f"{row[a]['mean']:.3f} ± {row[a]['sd']:.3f}" for a in ARMS))

    print("\ntrained minus baseline, per seed (t = paired t across seeds)")
    comparisons = {}
    for base in ("untrained", "random", "greedy"):
        for key, better in MEASURES:
            diffs = [per_seed[s]["trained"][key] - per_seed[s][base][key] for s in args.seeds]
            sign = 1 if better == "higher" else -1
            wins = sum(1 for d in diffs if d * sign > 0)
            t = paired_t(diffs)
            rel = statistics.fmean(diffs) / max(abs(statistics.fmean(per_seed[s][base][key] for s in args.seeds)), 1e-9)
            comparisons[f"{key} vs {base}"] = {"diffs": diffs, "t": t, "wins": wins, "relative": rel}
            print(f"  {key:<22} vs {base:<9} diffs {[round(d, 3) for d in diffs]}  "
                  f"relative {rel:+.0%}  better in {wins}/{len(diffs)} seeds  t={t:.2f}")

    with open(os.path.join(args.out, "ab_results.json"), "w", encoding="utf-8") as f:
        json.dump({"args": vars(args), "per_seed": per_seed, "summary": summary, "comparisons": comparisons}, f, indent=1)
    print(f"\nwrote {os.path.join(args.out, 'ab_results.json')}")


if __name__ == "__main__":
    main()
