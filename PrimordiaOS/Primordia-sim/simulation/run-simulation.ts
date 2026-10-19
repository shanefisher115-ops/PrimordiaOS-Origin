// PrimordiaSIM: deterministic structural metrics computed from the mesh regenerateGeometry returns
// (Primordia-cad/cadroot/regenerate-geometry.ts): closed triangles, counter-clockwise seen from outside,
// metres, Z up. The part stands free on its lowest point and carries only its own weight.
//
//   mass            volume x density of the part's material (kg)
//   maxStress       the worst of `levels` horizontal cuts: the weight above the cut pressing on the cut's
//                   cross-section, plus bending when the centre of mass above does not sit over the
//                   section's centroid, e.g. a lamp arm (MPa)
//   maxDeformation  how far the top moves: shortening under that compression plus the sideways lean from
//                   the bending, summed up the height with the moment-area method (mm)
//   overhangCount   connected patches of faces that face down and lean more than 45 degrees from vertical
//                   (they need support to print or carve), not counting the base it stands on
//
// The regions name the height band of the worst cut ("base", "lower", "middle", "upper", "top"), so the
// agents can aim their mutations at it.

const G = 9.81; // m/s^2

export interface Material {
    density: number; // kg/m^3
    youngsModulus: number; // Pa
}

/** Bulk properties by material name (matched case-insensitively). */
export const MATERIALS: Record<string, Material> = {
    stone: { density: 2400, youngsModulus: 30e9 }, // limestone-like building stone, the kernel's "Stone"
    limestone: { density: 2400, youngsModulus: 30e9 },
    sandstone: { density: 2300, youngsModulus: 15e9 },
    granite: { density: 2700, youngsModulus: 50e9 },
    marble: { density: 2700, youngsModulus: 50e9 },
    iron: { density: 7200, youngsModulus: 110e9 }, // grey cast iron, the kernel's "Iron"
    castIron: { density: 7200, youngsModulus: 110e9 },
    steel: { density: 7850, youngsModulus: 200e9 },
    stainlessSteel: { density: 8000, youngsModulus: 193e9 },
    aluminum: { density: 2700, youngsModulus: 69e9 },
    titanium: { density: 4500, youngsModulus: 114e9 },
    glass: { density: 2500, youngsModulus: 70e9 },
};

export interface SimulationOptions {
    levels?: number; // horizontal cuts for stress and deformation (default 128)
    overhangAngle?: number; // degrees from vertical a downward face may lean before it overhangs (default 45)
    minOverhangArea?: number; // m^2; smaller patches are slivers, not overhangs (default 1e-4)
}

export function runSimulation(geometry: any, options: SimulationOptions = {}) {
    console.log("[PrimordiaSIM] Running simulation on geometry...");

    const { levels = 128, overhangAngle = 45, minOverhangArea = 1e-4 } = options;
    const { p, t } = readMesh(geometry);
    const metadata = geometry.metadata ?? {};
    const material = pickMaterial(metadata);

    let zMin = Infinity, zMax = -Infinity;
    for (let i = 2; i < p.length; i += 3) { zMin = Math.min(zMin, p[i]); zMax = Math.max(zMax, p[i]); }
    const height = zMax - zMin;

    const volume = meshVolume(p, t);
    const structure = selfWeight(p, t, zMin, height, levels, material);
    const overhangs = findOverhangs(p, t, zMin, height, overhangAngle, minOverhangArea);
    const environment = typeof metadata.paramsUsed?.environment === "string" ? metadata.paramsUsed.environment : "normal";

    const metrics = {
        maxStress: structure.maxStress / 1e6, // MPa
        maxDeformation: structure.deformation * 1000, // mm
        mass: volume * material.density, // kg
        overhangCount: overhangs.count,
        environment,

        // Regions for agents to target
        highStressRegion: regionAt((structure.criticalZ - zMin) / height),
        deformationRegion: regionAt((structure.compliantZ - zMin) / height),

        material: material.name,
        volume, // m^3
        criticalHeight: structure.criticalZ - zMin, // m above the base
        overhangArea: overhangs.area, // m^2
        units: { maxStress: "MPa", maxDeformation: "mm", mass: "kg", volume: "m^3", criticalHeight: "m", overhangArea: "m^2" },
    };

    console.log("[PrimordiaSIM] Simulation complete. Metrics:", metrics);

    return metrics;
}

function readMesh(geometry: any): { p: Float64Array; t: Uint32Array } {
    const vertices = geometry?.vertices, faces = geometry?.faces;
    if (!Array.isArray(vertices) || !Array.isArray(faces) || faces.length === 0) {
        throw new Error("runSimulation needs a closed mesh { vertices, faces } as returned by regenerateGeometry");
    }
    const p = new Float64Array(vertices.length * 3);
    vertices.forEach((v: number[], i: number) => { p[3 * i] = v[0]; p[3 * i + 1] = v[1]; p[3 * i + 2] = v[2]; });
    const t = new Uint32Array(faces.length * 3);
    faces.forEach((f: number[], i: number) => {
        for (let k = 0; k < 3; k++) {
            if (!(f[k] >= 0 && f[k] < vertices.length)) throw new Error(`runSimulation: face ${i} has vertex index ${f[k]} out of range`);
            t[3 * i + k] = f[k];
        }
    });
    return { p, t };
}

/** The material the part asks for (MaterialAgent sets cadParams.material), else its kernel material slots. */
function pickMaterial(metadata: any): Material & { name: string } {
    const requested = [metadata.material, metadata.paramsUsed?.material].find((m) => typeof m === "string" && m !== "");
    if (requested) {
        const key = Object.keys(MATERIALS).find((k) => k.toLowerCase() === requested.toLowerCase());
        if (key) return { name: key, ...MATERIALS[key] };
        console.warn(`[PrimordiaSIM] Unknown material "${requested}"; using stone.`);
    }
    const slots: unknown[] = Array.isArray(metadata.materials) ? metadata.materials : [];
    const name = slots.includes("Iron") && !slots.includes("Stone") ? "iron" : "stone";
    return { name, ...MATERIALS[name] };
}

function meshVolume(p: Float64Array, t: Uint32Array): number {
    let v6 = 0;
    for (let f = 0; f < t.length; f += 3) {
        const a = 3 * t[f], b = 3 * t[f + 1], c = 3 * t[f + 2];
        v6 += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1])
            - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c])
            + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
    }
    return v6 / 6;
}

interface Cut {
    area: number; // m^2
    cx: number; cy: number; // section centroid
    ixx: number; iyy: number; ixy: number; // central second moments: integrals of y'^2, x'^2, x'y' (m^4)
    boundary: number[]; // x, y of the section outline's points, for the extreme fibre
    volumeAbove: number; // m^3
    mx: number; my: number; // centre of mass of the part above
}

/**
 * Cuts the closed mesh with the plane z = z0. The part above is measured with the divergence theorem using
 * the field (0, 0, z - z0), which vanishes on the cut, so only the triangles above the plane (clipped to it)
 * contribute; the cross-section is measured with Green's theorem on the clipped triangles' cut edges.
 */
export function cutAt(p: Float64Array, t: Uint32Array, z0: number): Cut {
    let vol = 0, sx = 0, sy = 0; // volume above and its x, y first moments
    let a2 = 0, ax = 0, ay = 0, axx = 0, ayy = 0, axy = 0; // section integrals (scaled, see below)
    const boundary: number[] = [];
    const X = [0, 0, 0, 0], Y = [0, 0, 0, 0], H = [0, 0, 0, 0]; // the triangle clipped to z >= z0

    for (let f = 0; f < t.length; f += 3) {
        let n = 0, exitX = 0, exitY = 0, entryX = 0, entryY = 0, crossings = 0;
        // Walk a -> b -> c so the clipped polygon keeps the triangle's winding.
        for (let k = 0; k < 3; k++) {
            const i = 3 * t[f + k], j = 3 * t[f + ((k + 1) % 3)];
            const hi = p[i + 2] - z0, hj = p[j + 2] - z0;
            const inI = hi >= 0, inJ = hj >= 0;
            if (inI) { X[n] = p[i]; Y[n] = p[i + 1]; H[n] = hi; n++; }
            if (inI === inJ) continue;
            // Interpolate from the lower vertex index so both triangles sharing the edge get the same point.
            const [u, w, hu, hw] = i < j ? [i, j, hi, hj] : [j, i, hj, hi];
            const s = hu / (hu - hw);
            const x = p[u] + s * (p[w] - p[u]), y = p[u + 1] + s * (p[w + 1] - p[u + 1]);
            X[n] = x; Y[n] = y; H[n] = 0; n++;
            crossings++;
            if (inI) { exitX = x; exitY = y; } else { entryX = x; entryY = y; }
        }
        // Fan the clipped polygon. Each piece adds the integral of (z - z0) * n_z, i.e. its signed area seen
        // from above times its mean height over the cut (and x, y times that for the centre of mass).
        for (let m = 1; m + 1 < n; m++) {
            const area = 0.5 * ((X[m] - X[0]) * (Y[m + 1] - Y[0]) - (X[m + 1] - X[0]) * (Y[m] - Y[0]));
            const hSum = H[0] + H[m] + H[m + 1];
            vol += (area * hSum) / 3;
            sx += (area / 12) * (X[0] * H[0] + X[m] * H[m] + X[m + 1] * H[m + 1] + (X[0] + X[m] + X[m + 1]) * hSum);
            sy += (area / 12) * (Y[0] * H[0] + Y[m] * H[m] + Y[m + 1] * H[m + 1] + (Y[0] + Y[m] + Y[m + 1]) * hSum);
        }
        if (crossings !== 2) continue;
        // The cut edge from exit to entry runs counter-clockwise seen from above around the solid section
        // (holes come out clockwise and subtract), so the loops need not be chained.
        const c = exitX * entryY - entryX * exitY;
        a2 += c;
        ax += (exitX + entryX) * c;
        ay += (exitY + entryY) * c;
        axx += (exitX * exitX + exitX * entryX + entryX * entryX) * c;
        ayy += (exitY * exitY + exitY * entryY + entryY * entryY) * c;
        axy += (exitX * entryY + 2 * exitX * exitY + 2 * entryX * entryY + entryX * exitY) * c;
        boundary.push(exitX, exitY);
    }

    const area = a2 / 2;
    const cx = area > 0 ? ax / 6 / area : 0, cy = area > 0 ? ay / 6 / area : 0;
    return {
        area, cx, cy,
        ixx: ayy / 12 - area * cy * cy,
        iyy: axx / 12 - area * cx * cx,
        ixy: axy / 24 - area * cx * cy,
        boundary,
        volumeAbove: vol,
        mx: vol > 0 ? sx / vol : cx,
        my: vol > 0 ? sy / vol : cy,
    };
}

/** Self-weight stress and top displacement from `levels` evenly spaced horizontal cuts. */
function selfWeight(p: Float64Array, t: Uint32Array, zMin: number, height: number, levels: number, material: Material) {
    const dz = height / levels, zTop = zMin + height, E = material.youngsModulus;
    let maxStress = 0, criticalZ = zMin, axial = 0, leanX = 0, leanY = 0, worstShare = -1, compliantZ = zMin;

    for (let k = 0; k < levels; k++) {
        const z = zMin + (k + 0.5) * dz;
        const cut = cutAt(p, t, z);
        if (!(cut.area > 1e-12) || !(cut.volumeAbove > 0)) continue;

        const weight = material.density * G * cut.volumeAbove; // N
        const compression = weight / cut.area; // Pa
        let bending = 0, curvature = 0, ux = 0, uy = 0;
        const ex = cut.mx - cut.cx, ey = cut.my - cut.cy, e = Math.hypot(ex, ey);
        if (e > 0) {
            // Bending in the direction the weight leans, about the section's centroid.
            ux = ex / e; uy = ey / e;
            const I = ux * ux * cut.iyy + 2 * ux * uy * cut.ixy + uy * uy * cut.ixx;
            let fibre = 0;
            for (let i = 0; i < cut.boundary.length; i += 2) {
                fibre = Math.max(fibre, Math.abs((cut.boundary[i] - cut.cx) * ux + (cut.boundary[i + 1] - cut.cy) * uy));
            }
            if (I > 0) {
                const moment = weight * e; // N m
                bending = (moment * fibre) / I;
                curvature = moment / (E * I); // 1/m
            }
        }

        const stress = compression + bending;
        if (stress > maxStress) { maxStress = stress; criticalZ = z; }

        // Moment-area method: a cut's curvature tilts everything above it, moving the top by curvature * lever.
        const lever = zTop - z;
        axial += (compression / E) * dz;
        leanX += curvature * ux * lever * dz;
        leanY += curvature * uy * lever * dz;
        const share = (compression / E) * dz + curvature * lever * dz;
        if (share > worstShare) { worstShare = share; compliantZ = z; }
    }

    return { maxStress, criticalZ, deformation: Math.hypot(axial, Math.hypot(leanX, leanY)), compliantZ };
}

/** Connected patches of downward faces leaning more than `angle` degrees from vertical, above the base. */
function findOverhangs(p: Float64Array, t: Uint32Array, zMin: number, height: number, angle: number, minArea: number) {
    const limit = -Math.sin((angle * Math.PI) / 180);
    const baseTol = 1e-6 + 1e-5 * height;
    const nf = t.length / 3, nv = p.length / 3;
    const parent = new Int32Array(nf).fill(-1); // -1: not an overhang face
    const areas = new Float64Array(nf);

    for (let f = 0; f < nf; f++) {
        const a = 3 * t[3 * f], b = 3 * t[3 * f + 1], c = 3 * t[3 * f + 2];
        if (Math.max(p[a + 2], p[b + 2], p[c + 2]) <= zMin + baseTol) continue; // resting on the ground
        const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
        const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz);
        if (len > 0 && nz / len < limit) { parent[f] = f; areas[f] = len / 2; }
    }

    const root = (f: number): number => {
        while (parent[f] !== f) { parent[f] = parent[parent[f]]; f = parent[f]; }
        return f;
    };
    const edgeFace = new Map<number, number>();
    for (let f = 0; f < nf; f++) {
        if (parent[f] < 0) continue;
        for (let k = 0; k < 3; k++) {
            const a = t[3 * f + k], b = t[3 * f + ((k + 1) % 3)];
            const key = Math.min(a, b) * nv + Math.max(a, b);
            const other = edgeFace.get(key);
            if (other === undefined) { edgeFace.set(key, f); continue; }
            const ra = root(f), rb = root(other);
            if (ra !== rb) parent[ra] = rb;
        }
    }

    const patchArea = new Map<number, number>();
    for (let f = 0; f < nf; f++) if (parent[f] >= 0) patchArea.set(root(f), (patchArea.get(root(f)) ?? 0) + areas[f]);
    let count = 0, area = 0;
    for (const a of patchArea.values()) if (a >= minArea) { count++; area += a; }
    return { count, area };
}

function regionAt(fraction: number): string {
    if (!(fraction >= 0.15)) return "base";
    if (fraction < 0.4) return "lower";
    if (fraction < 0.65) return "middle";
    if (fraction < 0.85) return "upper";
    return "top";
}
