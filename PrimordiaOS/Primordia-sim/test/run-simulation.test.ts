// Run: npm test (node --test; Primordia-cad needs its npm install). Checks runSimulation against closed-form
// self-weight answers on boxes, then on every Gothic generator through the CAD cycle's own functions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MATERIALS, cutAt, runSimulation } from "../simulation/run-simulation.ts";
import { GENERATORS } from "../../Primordia-cad/kernel/index.ts";
import { scoped } from "../../Primordia-cad/kernel/manifold.ts";
import type { Solid } from "../../Primordia-cad/kernel/manifold.ts";
import { extract } from "../../Primordia-cad/kernel/mesh.ts";
import { box, difference, union } from "../../Primordia-cad/kernel/ops.ts";
import { applyMutation } from "../../Primordia-cad/cadops/apply-mutation.ts";
import { regenerateGeometry } from "../../Primordia-cad/cadroot/regenerate-geometry.ts";

const G = 9.81, LEVELS = 128;
const STONE = MATERIALS.stone;

/** A kernel solid as the { vertices, faces, metadata } regenerateGeometry hands to runSimulation. */
function meshOf(build: () => Solid, metadata: Record<string, unknown> = {}) {
    const { solid } = scoped(() => extract(build()));
    const vertices: number[][] = [], faces: number[][] = [];
    for (let i = 0; i < solid.positions.length; i += 3) vertices.push([solid.positions[i], solid.positions[i + 1], solid.positions[i + 2]]);
    for (let i = 0; i < solid.triangles.length; i += 3) faces.push([solid.triangles[i], solid.triangles[i + 1], solid.triangles[i + 2]]);
    return { vertices, faces, metadata };
}

function flat(mesh: { vertices: number[][]; faces: number[][] }) {
    return { p: new Float64Array(mesh.vertices.flat()), t: new Uint32Array(mesh.faces.flat()) };
}

function close(actual: number, expected: number, rel: number, label: string) {
    assert.ok(Math.abs(actual - expected) <= rel * Math.abs(expected) + 1e-12, `${label}: ${actual}, expected ${expected}`);
}

test("box: mass, base stress and shortening match closed-form self-weight", () => {
    const H = 4;
    const m = runSimulation(meshOf(() => box([-0.5, -0.25, 0], [0.5, 0.25, H])));
    const z1 = H / (2 * LEVELS); // the lowest cut
    close(m.mass, STONE.density * 0.5 * H, 1e-6, "mass");
    close(m.maxStress, (STONE.density * G * (H - z1)) / 1e6, 1e-6, "stress = rho g h at the base (MPa)");
    close(m.maxDeformation, ((STONE.density * G * H * H) / (2 * STONE.youngsModulus)) * 1000, 1e-6, "shortening = rho g h^2 / 2E (mm)");
    assert.equal(m.overhangCount, 0);
    assert.equal(m.highStressRegion, "base");
    assert.equal(m.material, "stone");
});

test("cutAt: a hollow section subtracts its hole", () => {
    const { p, t } = flat(meshOf(() => difference(box([-1, -1, 0], [1, 1, 4]), [box([-0.5, -0.5, -1], [0.5, 0.5, 5])])));
    const cut = cutAt(p, t, 2);
    close(cut.area, 4 - 1, 1e-9, "area");
    close(cut.ixx, (2 ** 4 - 1) / 12, 1e-9, "Ixx");
    close(cut.iyy, (2 ** 4 - 1) / 12, 1e-9, "Iyy");
    assert.ok(Math.abs(cut.ixy) < 1e-9 && Math.abs(cut.cx) < 1e-9 && Math.abs(cut.cy) < 1e-9);
    close(cut.volumeAbove, 3 * 2, 1e-9, "volume above");
});

test("cantilever: an arm off the column adds bending, lean and one overhang", () => {
    const H = 4, a = 0.5;
    const column = () => box([-a / 2, -a / 2, 0], [a / 2, a / 2, H]);
    const arm = () => box([a / 2, -a / 2, 3.5], [2, a / 2, H]); // 1.75 x 0.5 x 0.5, centred at x = 1.125
    const plain = runSimulation(meshOf(column));
    const m = runSimulation(meshOf(() => union([column(), arm()])));

    // The arm's moment about the column axis is the same at every cut below it, compression grows downward,
    // so the lowest cut is the worst: rho g (V / A + V_arm x_arm c / I), with I = a^4 / 12 and c = a / 2.
    const z1 = H / (2 * LEVELS), vArm = 1.75 * a * a;
    const v = a * a * (H - z1) + vArm;
    const expected = STONE.density * G * (v / (a * a) + (vArm * 1.125 * (a / 2)) / (a ** 4 / 12));
    close(m.maxStress, expected / 1e6, 1e-6, "compression + bending (MPa)");
    assert.equal(m.highStressRegion, "base");
    assert.ok(m.maxDeformation > 10 * plain.maxDeformation, `lean ${m.maxDeformation} vs ${plain.maxDeformation}`);

    assert.equal(m.overhangCount, 1, "the arm's underside");
    close(m.overhangArea, 1.75 * a, 1e-6, "overhang area");
    assert.equal(runSimulation(meshOf(() => union([column(), arm()])), { overhangAngle: 90 }).overhangCount, 0);
});

test("material: cadParams.material sets density, unknown names fall back to stone", () => {
    const build = () => box([0, 0, 0], [1, 1, 1]);
    close(runSimulation(meshOf(build, { material: "granite" })).mass, MATERIALS.granite.density, 1e-9, "granite");
    close(runSimulation(meshOf(build, { paramsUsed: { material: "StainlessSteel" } })).mass, MATERIALS.stainlessSteel.density, 1e-9, "steel");
    close(runSimulation(meshOf(build, { material: "unobtainium" })).mass, STONE.density, 1e-9, "fallback");
    close(runSimulation(meshOf(build, { materials: ["Iron", "Glass"] })).mass, MATERIALS.iron.density, 1e-9, "iron slots");
});

test("rejects geometry without a mesh", () => {
    assert.throws(() => runSimulation({}), /closed mesh/);
    assert.throws(() => runSimulation({ vertices: [[0, 0, 0]], faces: [[0, 1, 2]] }), /out of range/);
});

const REQUIRED = ["maxStress", "maxDeformation", "mass", "overhangCount", "environment", "highStressRegion", "deformationRegion"];
const REGIONS = ["base", "lower", "middle", "upper", "top"];

for (const kind of Object.keys(GENERATORS)) {
    test(`${kind}: deterministic, physically sane, keeps the output shape`, () => {
        const geo = regenerateGeometry({ kind });
        const m = runSimulation(geo);
        assert.deepEqual(runSimulation(geo), m, "same mesh, same metrics");
        for (const key of REQUIRED) assert.ok(key in m, `missing ${key}`);
        const density = kind === "lamp" ? MATERIALS.iron.density : STONE.density;
        close(m.mass, (geo.metadata.volume as number) * density, 1e-6, "mass = kernel volume x density");
        assert.ok(Number.isFinite(m.maxStress) && m.maxStress > 0, `stress ${m.maxStress}`);
        // Self-weight alone stays far below what stone or iron can carry.
        assert.ok(m.maxStress < 50, `stress ${m.maxStress} MPa`);
        assert.ok(Number.isFinite(m.maxDeformation) && m.maxDeformation >= 0, `deformation ${m.maxDeformation}`);
        assert.ok(Number.isInteger(m.overhangCount) && m.overhangCount >= 0);
        assert.ok(REGIONS.includes(m.highStressRegion) && REGIONS.includes(m.deformationRegion));
        assert.equal(m.environment, "normal");
    });
}

test("lamp: one arm bends the post, a balanced pair does not", () => {
    const one = runSimulation(regenerateGeometry({ kind: "lamp", arms: 1 }));
    const two = runSimulation(regenerateGeometry({ kind: "lamp", arms: 2 }));
    assert.ok(one.maxStress > 5 * two.maxStress, `${one.maxStress} vs ${two.maxStress}`);
    assert.ok(one.maxDeformation > 5 * two.maxDeformation, `${one.maxDeformation} vs ${two.maxDeformation}`);
});

test("CAD cycle: a taller spire is heavier, more stressed and moves more", () => {
    const params = { kind: "spire", height: 20 };
    const before = runSimulation(regenerateGeometry(params));
    const after = runSimulation(regenerateGeometry(applyMutation(params, { param: "height", type: "increase", delta: 10 })));
    assert.ok(after.mass > before.mass);
    assert.ok(after.maxStress > before.maxStress);
    assert.ok(after.maxDeformation > before.maxDeformation);
});
