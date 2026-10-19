// Genre packs: every pack is valid data, and pieces sampled inside its style ranges are closed meshes
// within the pack's triangle budget and size envelope (what the realm-asset engineer's judge enforces).
import { test } from "node:test";
import assert from "node:assert/strict";
import { GENRES, LIGHTING, packData, sampleStyle, validatePack } from "../genres/index.ts";
import { GENERATORS, generate } from "../kernel/index.ts";

function rng(seed: number) {
    return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

for (const [id, pack] of Object.entries(GENRES)) {
    test(`genre ${id}: pack is valid`, () => {
        assert.equal(pack.id, id);
        assert.deepEqual(validatePack(pack), []);
        const data = JSON.parse(JSON.stringify(packData(pack)));
        assert.equal(data.lightingPreset.doc, LIGHTING[pack.lighting].doc);
        for (const kind of Object.keys(pack.generators)) assert.equal(data.generators[kind].title, GENERATORS[kind].title);
    });

    test(`genre ${id}: style samples are closed, in budget and in size`, () => {
        for (const [kind, style] of Object.entries(pack.generators)) {
            const rand = rng(id.length * 131 + kind.length * 7);
            const lo = Object.fromEntries(Object.entries(style.ranges).map(([k, [a]]) => [k, a]));
            const hi = Object.fromEntries(Object.entries(style.ranges).map(([k, [, b]]) => [k, b]));
            const samples = [{ ...style.fixed, ...lo }, { ...style.fixed, ...hi }, sampleStyle(pack, kind, rand), sampleStyle(pack, kind, rand)];
            for (const params of samples) {
                const label = `${id}/${kind} ${JSON.stringify(params)}`;
                const g = generate(kind, params);
                assert.ok(g.stats.closed, `${label}: not closed`);
                assert.ok(g.stats.triangleCount <= style.triangleBudget, `${label}: ${g.stats.triangleCount} tris > budget ${style.triangleBudget}`);
                for (let k = 0; k < 3; k++) {
                    const size = g.bounds.max[k] - g.bounds.min[k];
                    assert.ok(size <= style.maxSize[k] + 1e-6, `${label}: size[${k}] ${size.toFixed(2)} > ${style.maxSize[k]}`);
                }
                assert.ok(!g.warnings.some((w) => w.includes("outside [")), `${label}: style range was clamped: ${g.warnings.join("; ")}`);
            }
        }
    });
}

test("validatePack catches bad ranges, generators and presets", () => {
    const bad = structuredClone(GENRES.gothic);
    bad.lighting = "nope";
    bad.generators.spire.ranges.height = [1, 500];
    bad.generators.nothing = { weight: 1, ranges: {}, triangleBudget: 1, maxSize: [1, 1, 1] };
    const errors = validatePack(bad);
    assert.ok(errors.some((e) => e.startsWith("lighting")));
    assert.ok(errors.some((e) => e.startsWith("spire.height")));
    assert.ok(errors.some((e) => e.startsWith("nothing")));
});

test("sampleStyle stays inside the ranges and rounds integer parameters", () => {
    const rand = rng(99);
    for (let i = 0; i < 50; i++) {
        const p = sampleStyle(GENRES.gothic, "spire", rand);
        for (const [k, [lo, hi]] of Object.entries(GENRES.gothic.generators.spire.ranges)) {
            assert.ok(p[k] >= lo && p[k] <= hi, `${k} ${p[k]}`);
            if (GENERATORS.spire.params[k].integer) assert.equal(p[k], Math.round(p[k]));
        }
    }
});
