// Blender finishing stage (blender/finish.py via kernel/blender.ts). Skipped when Blender isn't installed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generate, toGLB } from "../kernel/index.ts";
import { readGLB } from "../kernel/export-gltf.ts";
import { findBlender, finishMesh } from "../kernel/blender.ts";

const blender = findBlender();

test("blender finishing: bevels, bake UVs, maps, LOD and exports", { skip: blender ? false : "Blender not found" }, () => {
    const dir = mkdtempSync(join(tmpdir(), "gothic-finish-"));
    try {
        const g = generate("pinnacle", { height: 3, width: 0.6 }, "Pin");
        const src = join(dir, "Pin.glb");
        writeFileSync(src, toGLB(g));
        const r = finishMesh(src, join(dir, "out"), { bake: 128, samples: 4, lods: [0.5], preview: 0 });
        assert.ok(r.triangles_out > r.triangles_in, "bevels add geometry");
        for (const f of ["Pin.glb", "Pin.web.glb", "Pin.fbx", "Pin_AO.png", "Pin_Curvature.png", "Pin_LOD1.glb"]) {
            assert.ok(existsSync(join(dir, "out", f)), f);
        }
        const { json } = readGLB(new Uint8Array(readFileSync(join(dir, "out", "Pin.glb"))));
        const attrs = json.meshes[0].primitives[0].attributes;
        assert.ok("TEXCOORD_0" in attrs && "TEXCOORD_1" in attrs, "tiling UVs and bake UVs");
        // Still real size, base on the ground: glTF is Y up, so height is the Y extent.
        const pos = json.accessors[attrs.POSITION];
        assert.ok(Math.abs(pos.max[1] - 3) < 0.05 && Math.abs(pos.min[1]) < 0.05, `height ${pos.min[1]}..${pos.max[1]}`);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
