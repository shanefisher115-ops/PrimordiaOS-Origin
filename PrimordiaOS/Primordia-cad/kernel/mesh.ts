// Turns a manifold solid into data the rest of PrimordiaOS can use:
//  - the welded solid (shared vertices, closed): for simulation, validation, and the legacy vertices/faces
//  - a render mesh: vertices split at hard edges (crease angle) and UV seams, with normals, world-scale
//    box-projected UVs (1 UV unit = 1 metre, so tiling textures repeat at real-world size), and
//    triangles grouped by material.
import { DEFAULT_MATERIAL, materialOf } from "./manifold.ts";
import type { Solid } from "./manifold.ts";

export interface MaterialGroup { material: string; start: number; count: number } // index range
export interface RenderMesh {
    positions: Float32Array; // xyz, metres, Z up
    normals: Float32Array;
    uvs: Float32Array;
    indices: Uint32Array; // CCW seen from outside
    groups: MaterialGroup[];
}
export interface SolidMesh { positions: Float32Array; triangles: Uint32Array }
export interface Box { min: [number, number, number]; max: [number, number, number] }
export interface SolidStats {
    status: string; closed: boolean; genus: number; volume: number; surfaceArea: number;
    vertexCount: number; triangleCount: number;
}

export const CREASE_ANGLE_DEG = 40; // octagon faces (45 deg) stay crisp, 12+ segment lathes shade smooth
export const UV_METRES_PER_TILE = 1;

export function extract(solid: Solid, defaultMaterial = DEFAULT_MATERIAL): { solid: SolidMesh; render: RenderMesh; stats: SolidStats } {
    const mesh = solid.getMesh();
    const np = mesh.numProp;
    const nvRaw = mesh.vertProperties.length / np;
    // Weld vertices that manifold split for property seams (none for position-only meshes, but be exact).
    const remap = new Uint32Array(nvRaw);
    for (let i = 0; i < nvRaw; i++) remap[i] = i;
    if (mesh.mergeFromVert) for (let i = 0; i < mesh.mergeFromVert.length; i++) remap[mesh.mergeFromVert[i]] = mesh.mergeToVert[i];
    const compact = new Int32Array(nvRaw).fill(-1);
    let nv = 0;
    for (let i = 0; i < nvRaw; i++) if (remap[i] === i) compact[i] = nv++;
    const positions = new Float32Array(nv * 3);
    for (let i = 0; i < nvRaw; i++) {
        if (remap[i] !== i) continue;
        positions.set([mesh.vertProperties[i * np], mesh.vertProperties[i * np + 1], mesh.vertProperties[i * np + 2]], compact[i] * 3);
    }
    const nt = mesh.triVerts.length / 3;
    const triangles = new Uint32Array(nt * 3);
    for (let k = 0; k < nt * 3; k++) triangles[k] = compact[remap[mesh.triVerts[k]]];

    // Material per triangle, from the runs manifold keeps through booleans.
    const names: string[] = [defaultMaterial];
    const triMat = new Uint8Array(nt);
    const runIndex = mesh.runIndex, runIds = mesh.runOriginalID;
    if (runIndex && runIds) {
        for (let r = 0; r < runIds.length; r++) {
            const name = materialOf(runIds[r], defaultMaterial);
            let m = names.indexOf(name);
            if (m < 0) m = names.push(name) - 1;
            for (let t = runIndex[r] / 3; t < runIndex[r + 1] / 3; t++) triMat[t] = m;
        }
    }

    const render = buildRenderMesh(positions, triangles, triMat, names);
    const stats: SolidStats = {
        status: String(solid.status()),
        closed: isClosed(triangles, nv),
        genus: solid.genus(),
        volume: solid.volume(),
        surfaceArea: solid.surfaceArea(),
        vertexCount: nv,
        triangleCount: nt,
    };
    return { solid: { positions, triangles }, render, stats };
}

/** True when every edge is shared by exactly two triangles with opposite winding (closed, oriented). */
export function isClosed(triangles: Uint32Array, vertexCount: number): boolean {
    const edges = new Map<number, number>();
    for (let t = 0; t < triangles.length; t += 3) {
        for (let c = 0; c < 3; c++) {
            const a = triangles[t + c], b = triangles[t + ((c + 1) % 3)];
            if (a === b) return false;
            const key = a * vertexCount + b;
            if (edges.has(key)) return false; // the same directed edge twice: not 2-manifold
            edges.set(key, 1);
        }
    }
    for (const key of edges.keys()) {
        const a = Math.floor(key / vertexCount), b = key % vertexCount;
        if (!edges.has(b * vertexCount + a)) return false;
    }
    return edges.size > 0;
}

export function bounds(positions: Float32Array): Box {
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
        for (let k = 0; k < 3; k++) {
            min[k] = Math.min(min[k], positions[i + k]);
            max[k] = Math.max(max[k], positions[i + k]);
        }
    }
    return { min, max };
}

function buildRenderMesh(P: Float32Array, T: Uint32Array, triMat: Uint8Array, names: string[]): RenderMesh {
    const nv = P.length / 3, nt = T.length / 3;
    const faceN = new Float64Array(nt * 3);
    const axis = new Uint8Array(nt); // dominant signed axis of the face normal: 0..5 = +x -x +y -y +z -z
    for (let t = 0; t < nt; t++) {
        const a = T[t * 3] * 3, b = T[t * 3 + 1] * 3, c = T[t * 3 + 2] * 3;
        const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
        const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz);
        if (l > 1e-30) { nx /= l; ny /= l; nz /= l; } else { nx = 0; ny = 0; nz = 1; }
        faceN[t * 3] = nx; faceN[t * 3 + 1] = ny; faceN[t * 3 + 2] = nz;
        const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
        axis[t] = ax >= ay && ax >= az ? (nx >= 0 ? 0 : 1) : ay >= az ? (ny >= 0 ? 2 : 3) : (nz >= 0 ? 4 : 5);
    }

    // Corners incident to each vertex (CSR).
    const start = new Uint32Array(nv + 1);
    for (let k = 0; k < nt * 3; k++) start[T[k] + 1]++;
    for (let v = 0; v < nv; v++) start[v + 1] += start[v];
    const fill = start.slice(0, nv);
    const corners = new Uint32Array(nt * 3);
    for (let k = 0; k < nt * 3; k++) corners[fill[T[k]]++] = k;

    // Smoothing: around each vertex, faces within the crease angle of a cluster's seed share a normal.
    const cosCrease = Math.cos((CREASE_ANGLE_DEG * Math.PI) / 180);
    const cornerCluster = new Uint32Array(nt * 3);
    const seeds: number[] = [], sums: number[] = [];
    for (let v = 0; v < nv; v++) {
        const first = seeds.length / 3;
        for (let i = start[v]; i < start[v + 1]; i++) {
            const k = corners[i], t = (k / 3) | 0;
            const nx = faceN[t * 3], ny = faceN[t * 3 + 1], nz = faceN[t * 3 + 2];
            let cluster = -1;
            for (let c = first; c < seeds.length / 3; c++) {
                if (seeds[c * 3] * nx + seeds[c * 3 + 1] * ny + seeds[c * 3 + 2] * nz >= cosCrease) { cluster = c; break; }
            }
            if (cluster < 0) { cluster = seeds.length / 3; seeds.push(nx, ny, nz); sums.push(0, 0, 0); }
            const w = cornerAngle(P, T, k);
            sums[cluster * 3] += nx * w; sums[cluster * 3 + 1] += ny * w; sums[cluster * 3 + 2] += nz * w;
            cornerCluster[k] = cluster;
        }
    }

    // Emit vertices per (cluster, UV projection axis, material), triangles sorted by material.
    const key2out = new Map<number, number>();
    const pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
    const groups: MaterialGroup[] = [];
    const s = 1 / UV_METRES_PER_TILE;
    for (let m = 0; m < names.length; m++) {
        const groupStart = idx.length;
        for (let t = 0; t < nt; t++) {
            if (triMat[t] !== m) continue;
            for (let c = 0; c < 3; c++) {
                const k = t * 3 + c, v = T[k], cluster = cornerCluster[k];
                const key = (cluster * 6 + axis[t]) * names.length + m;
                let out = key2out.get(key);
                if (out === undefined) {
                    out = pos.length / 3;
                    key2out.set(key, out);
                    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
                    pos.push(x, y, z);
                    let nx = sums[cluster * 3], ny = sums[cluster * 3 + 1], nz = sums[cluster * 3 + 2];
                    const l = Math.hypot(nx, ny, nz);
                    if (l > 1e-30) { nx /= l; ny /= l; nz /= l; } else { nx = seeds[cluster * 3]; ny = seeds[cluster * 3 + 1]; nz = seeds[cluster * 3 + 2]; }
                    nrm.push(nx, ny, nz);
                    // Box projection, oriented so the texture reads upright and unmirrored from outside.
                    switch (axis[t]) {
                        case 0: uv.push(y * s, -z * s); break;
                        case 1: uv.push(-y * s, -z * s); break;
                        case 2: uv.push(-x * s, -z * s); break;
                        case 3: uv.push(x * s, -z * s); break;
                        case 4: uv.push(x * s, -y * s); break;
                        default: uv.push(x * s, y * s); break;
                    }
                }
                idx.push(out);
            }
        }
        if (idx.length > groupStart) groups.push({ material: names[m], start: groupStart, count: idx.length - groupStart });
    }
    return {
        positions: new Float32Array(pos), normals: new Float32Array(nrm), uvs: new Float32Array(uv),
        indices: new Uint32Array(idx), groups,
    };
}

function cornerAngle(P: Float32Array, T: Uint32Array, k: number): number {
    const t = (k / 3) | 0, c = k % 3;
    const o = T[k] * 3, a = T[t * 3 + ((c + 1) % 3)] * 3, b = T[t * 3 + ((c + 2) % 3)] * 3;
    const ux = P[a] - P[o], uy = P[a + 1] - P[o + 1], uz = P[a + 2] - P[o + 2];
    const vx = P[b] - P[o], vy = P[b + 1] - P[o + 1], vz = P[b + 2] - P[o + 2];
    const lu = Math.hypot(ux, uy, uz), lv = Math.hypot(vx, vy, vz);
    if (lu < 1e-30 || lv < 1e-30) return 0;
    return Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy + uz * vz) / (lu * lv))));
}
