// glTF 2.0 binary (.glb) writer: one node, one mesh, one primitive per material.
// The kernel is Z up; glTF is Y up, so (x, y, z) is written as (x, z, -y). Metres are glTF's unit.
import type { Geometry } from "./index.ts";

export const MATERIAL_LOOKS: Record<string, { color: number[]; metallic: number; roughness: number; emissive?: number[] }> = {
    Stone: { color: [0.62, 0.6, 0.56, 1], metallic: 0, roughness: 0.85 },
    Glass: { color: [1.0, 0.78, 0.42, 1], metallic: 0, roughness: 0.1, emissive: [1.0, 0.7, 0.35] },
    Iron: { color: [0.04, 0.04, 0.045, 1], metallic: 1, roughness: 0.45 },
};

export function toGLB(g: Geometry): Uint8Array {
    const r = g.render;
    const n = r.positions.length / 3;
    const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
        const x = r.positions[i * 3], y = r.positions[i * 3 + 1], z = r.positions[i * 3 + 2];
        pos[i * 3] = x; pos[i * 3 + 1] = z; pos[i * 3 + 2] = -y;
        nrm[i * 3] = r.normals[i * 3]; nrm[i * 3 + 1] = r.normals[i * 3 + 2]; nrm[i * 3 + 2] = -r.normals[i * 3 + 1];
        for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], pos[i * 3 + k]); max[k] = Math.max(max[k], pos[i * 3 + k]); }
    }
    const wide = n > 65535;
    const idx = wide ? new Uint32Array(r.indices) : new Uint16Array(r.indices);

    const chunks: Uint8Array[] = [];
    const bufferViews: object[] = [];
    let offset = 0;
    const addView = (data: ArrayBufferView, target: number) => {
        const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.byteLength, target });
        chunks.push(bytes);
        offset += bytes.byteLength;
        const pad = (4 - (offset % 4)) % 4;
        if (pad) { chunks.push(new Uint8Array(pad)); offset += pad; }
        return bufferViews.length - 1;
    };
    const vPos = addView(pos, 34962), vNrm = addView(nrm, 34962), vUv = addView(r.uvs, 34962), vIdx = addView(idx, 34963);

    const accessors: object[] = [
        { bufferView: vPos, componentType: 5126, count: n, type: "VEC3", min, max },
        { bufferView: vNrm, componentType: 5126, count: n, type: "VEC3" },
        { bufferView: vUv, componentType: 5126, count: n, type: "VEC2" },
    ];
    const materials: object[] = [];
    const primitives: object[] = [];
    for (const group of r.groups) {
        const look = MATERIAL_LOOKS[group.material] ?? MATERIAL_LOOKS.Stone;
        materials.push({
            name: group.material,
            pbrMetallicRoughness: { baseColorFactor: look.color, metallicFactor: look.metallic, roughnessFactor: look.roughness },
            ...(look.emissive ? { emissiveFactor: look.emissive } : {}),
        });
        accessors.push({
            bufferView: vIdx, byteOffset: group.start * (wide ? 4 : 2), componentType: wide ? 5125 : 5123,
            count: group.count, type: "SCALAR",
        });
        primitives.push({ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: accessors.length - 1, material: materials.length - 1, mode: 4 });
    }

    const json = {
        asset: { version: "2.0", generator: "PrimordiaOS Primordia-cad gothic kernel" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ name: g.name, mesh: 0, extras: { generator: g.kind, params: g.params, sockets: g.sockets, units: "m" } }],
        meshes: [{ name: g.name, primitives }],
        materials,
        accessors,
        bufferViews,
        buffers: [{ byteLength: offset }],
    };
    const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    const jsonPad = (4 - (jsonBytes.byteLength % 4)) % 4;
    const jsonLen = jsonBytes.byteLength + jsonPad;
    const total = 12 + 8 + jsonLen + 8 + offset;
    const out = new Uint8Array(total);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, 0x46546c67, true); // "glTF"
    dv.setUint32(4, 2, true);
    dv.setUint32(8, total, true);
    dv.setUint32(12, jsonLen, true);
    dv.setUint32(16, 0x4e4f534a, true); // "JSON"
    out.set(jsonBytes, 20);
    out.fill(0x20, 20 + jsonBytes.byteLength, 20 + jsonLen);
    let at = 20 + jsonLen;
    dv.setUint32(at, offset, true);
    dv.setUint32(at + 4, 0x004e4942, true); // "BIN\0"
    at += 8;
    for (const c of chunks) { out.set(c, at); at += c.byteLength; }
    return out;
}

/** Reads a .glb back into its JSON and binary chunk (for tests and tooling). */
export function readGLB(bytes: Uint8Array): { json: any; bin: Uint8Array } {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("not a glb");
    const jsonLen = dv.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLen)));
    const binLen = dv.getUint32(20 + jsonLen, true);
    return { json, bin: bytes.subarray(28 + jsonLen, 28 + jsonLen + binLen) };
}
