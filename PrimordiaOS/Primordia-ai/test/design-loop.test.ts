// Run: npm test (node --test; Primordia-cad needs its npm install). Checks that the agents mutate real
// Primordia-cad parameters, then runs Primordia-core's design loop on small real parts (a pinnacle, a lamp)
// and checks that each cycle moves the metrics the way the winning agent meant and that the loop stops.
import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { GENERATORS } from "../../Primordia-cad/kernel/index.ts";
import { applyMutation } from "../../Primordia-cad/cadops/apply-mutation.ts";
import { regenerateGeometry } from "../../Primordia-cad/cadroot/regenerate-geometry.ts";
import { runSimulationLoop } from "../../Primordia-core/services/simulation-cycle.ts";
import { manufacturabilityAgent } from "../agents/manufacturability-agent.ts";
import { materialAgent } from "../agents/material-agent.ts";
import { stressAgent } from "../agents/stress-agent.ts";
import { topologyAgent } from "../agents/topology-agent.ts";
import { weightAgent } from "../agents/weight-agent.ts";
import { changedDesignKeys, designOf, resolveDesign } from "../agents/levers.ts";
import { designLimits } from "../schemas/design-limits.ts";

mock.method(console, "log", () => {}); // the loop logs every proposal and parameter set

const GEOMETRIC = [stressAgent, weightAgent, topologyAgent, manufacturabilityAgent];

test("agents: every proposal names a parameter of the part's generator", () => {
    // Far over every limit, in every region, so each agent wants to act.
    const limits = { stressLimit: 1, targetMass: 1, deformationLimit: 1, maxOverhangs: 1 };
    for (const kind of Object.keys(GENERATORS)) {
        for (const region of ["base", "middle", "top"]) {
            const metrics = { maxStress: 50, mass: 1e6, maxDeformation: 50, overhangCount: 100, highStressRegion: region, deformationRegion: region };
            for (const agent of GEOMETRIC) {
                const p = agent(metrics, { kind, ...limits }, 0);
                if (p.delta === 0) continue; // nothing left to turn (a lamp's overhangs come with its arms)
                assert.ok(p.targetParam in GENERATORS[kind].params, `${p.agentName} on ${kind}: ${p.targetParam}`);
                assert.equal(typeof p.delta, "number");
                assert.equal(p.type, (p.delta as number) > 0 ? "increase" : "decrease");
            }
        }
    }
});

test("agents: within limits their proposals leave the part unchanged", () => {
    const metrics = { maxStress: 0.1, mass: 10, maxDeformation: 0.1, overhangCount: 3, material: "stone", environment: "normal" };
    const params = resolveDesign({ kind: "spire", targetMass: 100, maxOverhangs: 5 });
    for (const agent of [...GEOMETRIC, materialAgent]) {
        const p = agent(metrics, params, 0);
        const after = applyMutation(params, { param: p.targetParam, type: p.type, delta: p.delta });
        assert.deepEqual(changedDesignKeys(params, after), [], `${p.agentName}: ${p.justification}`);
    }
});

test("MaterialAgent: replaces cadParams.material with the material's name", () => {
    const p = materialAgent({ environment: "highHeat", material: "stone" }, { kind: "spire" }, 0);
    assert.equal(p.type, "replace");
    const params = applyMutation({ kind: "spire" }, { param: p.targetParam, type: p.type, delta: p.delta });
    assert.equal(params.material, "titanium");
});

test("limits: real units, defaults by material, cadParams overrides", () => {
    assert.deepEqual(designLimits({}, { material: "stone" }), { stressLimit: 4, targetMass: Infinity, deformationLimit: 10, maxOverhangs: Infinity });
    assert.equal(designLimits({}, { material: "iron" }).stressLimit, 40);
    assert.deepEqual(designLimits({ stressLimit: 2, targetMass: 500, deformationLimit: 1, maxOverhangs: 0 }, { material: "iron" }),
        { stressLimit: 2, targetMass: 500, deformationLimit: 1, maxOverhangs: 0 });
});

test("loop: a part already within its limits stops at once", async () => {
    const params = { kind: "pinnacle" };
    const r = await runSimulationLoop(regenerateGeometry(params), params, 5);
    assert.ok(r.stabilized);
    assert.equal(r.history.length, 1);
    assert.equal(r.history[0].cycle, undefined, "no CAD cycle ran");
    assert.ok(r.finalMetrics.mass > 1000, `a 5 m stone pinnacle weighs tonnes: ${r.finalMetrics.mass} kg`);
});

test("loop: a one-armed lamp over its stress limit gets a balancing second arm", async () => {
    const params = { kind: "lamp", arms: 1, stressLimit: 5 };
    const r = await runSimulationLoop(regenerateGeometry(params), params, 3);
    const [before, after] = r.history;
    assert.ok(before.metrics.maxStress > 5, `starts at ${before.metrics.maxStress} MPa`);
    assert.equal(before.cycle.agent, "StressAgent");
    assert.deepEqual(before.cycle.changed, ["arms"]);
    assert.equal(r.finalCadParams.arms, 2);
    assert.ok(after.metrics.maxStress < 5, `${after.metrics.maxStress} MPa`);
    assert.ok(after.metrics.maxDeformation < before.metrics.maxDeformation / 10, "the post no longer leans");
    assert.ok(r.stabilized);
    assert.equal(r.history.length, 2);
});

test("loop: a pinnacle over its mass budget slims its shaft, cycle by cycle, until it fits", async () => {
    const params = { kind: "pinnacle", targetMass: 2500 };
    const r = await runSimulationLoop(regenerateGeometry(params), params, 5);
    const width = (h: any) => designOf(h.cadParams).params.width;
    assert.ok(r.history.length >= 3, `${r.history.length - 1} cycles`);
    for (let i = 1; i < r.history.length; i++) {
        const prev = r.history[i - 1], cur = r.history[i];
        assert.equal(prev.cycle.agent, "WeightAgent");
        assert.ok(cur.metrics.mass < prev.metrics.mass, `cycle ${i}: ${prev.metrics.mass} -> ${cur.metrics.mass} kg`);
        assert.ok(width(cur) < width(prev), `cycle ${i}: width ${width(prev)} -> ${width(cur)} m`);
        assert.ok(cur.ok.stress && cur.ok.deformation, "slimming keeps it standing");
    }
    assert.ok(r.stabilized);
    assert.ok(r.finalMetrics.mass <= 2500, `${r.finalMetrics.mass} kg`);
});

test("loop: stops when no agent can reach a limit instead of spinning", async () => {
    const params = { kind: "lamp", maxOverhangs: 0 }; // a lamp's lantern always overhangs
    const r = await runSimulationLoop(regenerateGeometry(params), params, 5);
    assert.equal(r.stabilized, false);
    assert.equal(r.history.length, 1);
    assert.deepEqual(r.history[0].cycle.changed, []);
    assert.deepEqual(r.finalCadParams, params);
});
