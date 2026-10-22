// Run: npm test (node --test). Checks every generator at its defaults and at random/extreme params:
// closed oriented manifold, no NaNs, unit normals, inside the stated bounds, base on z = 0.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GENERATORS, generate, toGLB, toOBJ } from "../kernel/index.ts";
import type { Geometry } from "../kernel/index.ts";
import { readGLB } from "../kernel/export-gltf.ts";
import { isClosed } from "../kernel/mesh.ts";
import { applyMutation } from "../cadops/apply-mutation.ts";
import { regenerateGeometry } from "../cadroot/regenerate-geometry.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function assertValid(g: Geometry, label: string) {
    assert.equal(g.stats.status, "NoError", `${label}: kernel status`);
    assert.ok(g.stats.closed, `${label}: mesh is not closed`);
    assert.ok(isClosed(g.solid.triangles, g.solid.positions.length / 3), `${label}: solid is not closed`);
    assert.ok(g.stats.volume > 0, `${label}: volume ${g.stats.volume}`);
    assert.ok(g.stats.triangleCount > 0, `${label}: no triangles`);
    const r = g.render;
    for (const [name, arr] of [["positions", r.positions], ["normals", r.normals], ["uvs", r.uvs], ["solid", g.solid.positions]] as const) {
        for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) assert.fail(`${label}: ${name}[${i}] is ${arr[i]}`);
    }
    for (let i = 0; i < r.normals.length; i += 3) {
        const len = Math.hypot(r.normals[i], r.normals[i + 1], r.normals[i + 2]);
        if (Math.abs(len - 1) > 1e-3) assert.fail(`${label}: normal ${i / 3} has length ${len}`);
    }
    const nv = r.positions.length / 3;
    for (let i = 0; i < r.indices.length; i++) if (r.indices[i] >= nv) assert.fail(`${label}: index ${r.indices[i]} >= ${nv}`);
    assert.equal(r.groups.reduce((s, x) => s + x.count, 0), r.indices.length, `${label}: material groups cover all indices`);

    const { min, max } = g.bounds, stated = g.statedBounds;
    for (let k = 0; k < 3; k++) {
        const tol = 1e-4 * Math.max(1, stated.max[k] - stated.min[k]) + 1e-5;
        assert.ok(min[k] >= stated.min[k] - tol, `${label}: min[${k}] ${min[k]} < stated ${stated.min[k]}`);
        assert.ok(max[k] <= stated.max[k] + tol, `${label}: max[${k}] ${max[k]} > stated ${stated.max[k]}`);
    }
    assert.ok(Math.abs(min[2]) < 1e-3, `${label}: base at z = ${min[2]}, expected 0`);
    // The stated envelope is honest, not just huge: the mesh reaches most of its height.
    assert.ok(max[2] >= 0.75 * stated.max[2], `${label}: height ${max[2]} far below stated ${stated.max[2]}`);
}

/** Small deterministic PRNG so failures reproduce. */
function rng(seed: number) {
    return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

for (const [kind, gen] of Object.entries(GENERATORS)) {
    test(`${kind}: defaults make a valid closed mesh`, () => {
        assertValid(generate(kind), `${kind} defaults`);
    });

    test(`${kind}: extreme and random params stay valid and in bounds`, () => {
        const rand = rng(kind.length * 7919 + 17);
        const specs = Object.entries(gen.params);
        const samples: Record<string, number>[] = [
            Object.fromEntries(specs.map(([k, s]) => [k, s.min])),
            Object.fromEntries(specs.map(([k, s]) => [k, s.max])),
        ];
        for (let i = 0; i < 6; i++) samples.push(Object.fromEntries(specs.map(([k, s]) => [k, s.min + (s.max - s.min) * rand()])));
        for (const params of samples) assertValid(generate(kind, params), `${kind} ${JSON.stringify(params)}`);
    });
}

test("params: clamping, numeric strings and reshape deltas", () => {
    const g = generate("pinnacle", { height: 999, crockets: "3", width: { mode: "reshape", region: "shaft", delta: 0.1 } });
    assert.equal(g.params.height, GENERATORS.pinnacle.params.height.max);
    assert.equal(g.params.crockets, 3);
    assert.ok(Math.abs(g.params.width - (GENERATORS.pinnacle.params.width.default + 0.1)) < 1e-9);
    assert.ok(g.warnings.some((w) => w.startsWith("height")));
});

test("isClosed rejects an open mesh", () => {
    assert.equal(isClosed(new Uint32Array([0, 1, 2]), 3), false);
    assert.equal(isClosed(new Uint32Array([0, 2, 1, 0, 1, 3, 1, 2, 3, 0, 3, 2]), 4), true);
});

test("glb: valid container, Y-up positions, one primitive per material", () => {
    const g = generate("lamp");
    const { json, bin } = readGLB(toGLB(g));
    assert.equal(json.asset.version, "2.0");
    assert.equal(json.buffers[0].byteLength, bin.byteLength);
    assert.equal(json.accessors[0].count, g.render.positions.length / 3);
    assert.deepEqual(json.meshes[0].primitives.map((p: any) => json.materials[p.material].name), ["Iron", "Glass"]);
    // Kernel Z (height) becomes glTF Y.
    assert.ok(Math.abs(json.accessors[0].max[1] - g.bounds.max[2]) < 1e-4);
    assert.ok(Math.abs(json.accessors[0].min[1]) < 1e-4);
    assert.equal(json.nodes[0].extras.generator, "lamp");
});

test("obj: vertex, uv, normal and face counts match the render mesh", () => {
    const g = generate("balustrade");
    const { obj, mtl } = toOBJ(g, "b.mtl");
    const count = (prefix: string) => obj.split("\n").filter((l) => l.startsWith(prefix)).length;
    const nv = g.render.positions.length / 3;
    assert.equal(count("v "), nv);
    assert.equal(count("vt "), nv);
    assert.equal(count("vn "), nv);
    assert.equal(count("f "), g.render.indices.length / 3);
    assert.match(mtl, /newmtl Stone/);
});

test("applyMutation -> regenerateGeometry keeps the CAD cycle contract", () => {
    const params = { kind: "spire", height: 30, wallThickness: 2 };
    const updated = applyMutation(params, { param: "height", type: "increase", delta: 10 });
    const geo = regenerateGeometry(updated);
    assert.ok(geo.vertices.length > 0 && geo.faces.length === geo.metadata.triangleCount);
    assert.ok(Math.abs((geo.metadata.bounds as any).max[2] - 40) < 1e-3);
    assert.equal(geo.metadata.wallThicknessApplied, 2);
    assert.equal(geo.metadata.closed, true);
    for (const f of geo.faces) for (const i of f) if (i >= geo.vertices.length) assert.fail("face index out of range");

    const reshaped = applyMutation({ kind: "spire" }, { param: "height", type: "reshape", region: "top", delta: 5 });
    assert.equal((regenerateGeometry(reshaped).metadata.resolvedParams as any).height, GENERATORS.spire.params.height.default + 5);
});

test("cli: single piece, then a kit with manifest and preview", () => {
    const dir = mkdtempSync(join(tmpdir(), "gothic-"));
    try {
        const out = join(dir, "spire.glb");
        execFileSync(process.execPath, ["gothic.mjs", "spire", "--height", "20", "--sides", "6", "--out", out], { cwd: ROOT });
        const { json } = readGLB(new Uint8Array(readFileSync(out)));
        assert.equal(json.nodes[0].extras.params.height, 20);
        assert.equal(json.nodes[0].extras.params.sides, 6);

        execFileSync(process.execPath, ["gothic.mjs", "kit", "--out", join(dir, "kit")], { cwd: ROOT });
        const manifest = JSON.parse(readFileSync(join(dir, "kit", "manifest.json"), "utf8"));
        assert.ok(manifest.pieces.length >= Object.keys(GENERATORS).length);
        for (const piece of manifest.pieces) {
            assert.ok(piece.closed, `${piece.name} closed`);
            for (const f of piece.files) assert.ok(existsSync(join(dir, "kit", f)), f);
        }
        assert.ok(existsSync(join(dir, "kit", "preview.png")));

        assert.throws(() => execFileSync(process.execPath, ["gothic.mjs", "spire", "--hieght", "20"], { cwd: ROOT, stdio: "pipe" }));
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
