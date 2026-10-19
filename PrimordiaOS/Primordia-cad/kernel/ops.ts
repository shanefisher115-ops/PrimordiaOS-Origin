// Mesh core: profile extrusion, sweep along a path, lathe, and booleans. Units are metres, Z is up.
// Solids come from manifold-3d, so every result is a closed, oriented 2-manifold.
import { CrossSection, Manifold, Mesh, triangulate } from "./manifold.ts";
import type { Section, Solid } from "./manifold.ts";

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Profile = Vec2[] | Vec2[][] | Section;

// ---------------------------------------------------------------- 2D profiles

export function signedArea(poly: Vec2[]): number {
    let a = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    return a / 2;
}

/** Returns the polygon wound counter-clockwise (manifold's convention for solid regions). */
export function ccw(poly: Vec2[]): Vec2[] {
    return signedArea(poly) < 0 ? poly.slice().reverse() : poly;
}

/** Regular n-gon of circumradius r. startDeg = 180/n puts a flat side facing +X. */
export function ngon(n: number, r: number, startDeg = 0, cx = 0, cy = 0): Vec2[] {
    const out: Vec2[] = [];
    for (let i = 0; i < n; i++) {
        const a = ((startDeg + (360 * i) / n) * Math.PI) / 180;
        out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return out;
}

export function section(profile: Profile): Section {
    if (!Array.isArray(profile)) return profile;
    const polys = (typeof profile[0][0] === "number" ? [profile] : profile) as Vec2[][];
    return CrossSection.ofPolygons(polys.map(ccw));
}

/** Points along a circular arc from angle a0 to a1 (radians), both ends included. */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number, segments: number): Vec2[] {
    const out: Vec2[] = [];
    for (let i = 0; i <= segments; i++) {
        const a = a0 + ((a1 - a0) * i) / segments;
        out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return out;
}

/**
 * Outline of a pointed (two-centred) arch opening, drawn in the (x, z) plane:
 * straight jambs at x = ±halfWidth from bottomZ up to springZ, then two arcs of the given radius whose
 * centres sit on the springline. radius = halfWidth gives a round arch, 2 * halfWidth an equilateral
 * arch, more a lancet. grow > 0 returns the concentric outline that far outside (for frames and
 * mouldings); grow < 0 an inset one. Counter-clockwise.
 */
export function pointedArch(halfWidth: number, springZ: number, radius: number, bottomZ = 0, grow = 0, segments = 12) {
    const r = Math.max(radius, halfWidth);
    const centre = halfWidth - r; // right arc centre x (<= 0); the left arc's is mirrored
    const rr = r + grow;
    const apexAngle = Math.acos(Math.min(1, Math.max(-1, -centre / rr)));
    const apexZ = springZ + rr * Math.sin(apexAngle);
    const w = halfWidth + grow;
    const right = arc(centre, springZ, rr, 0, apexAngle, segments);
    const left = arc(-centre, springZ, rr, Math.PI - apexAngle, Math.PI, segments);
    const pts: Vec2[] = [[-w, bottomZ], [w, bottomZ], ...right.slice(0, -1), [0, apexZ], ...left.slice(1)];
    return { outline: dedupe(pts), apexZ };
}

/**
 * A foiled opening (trefoil, quatrefoil, ...): `foils` lobes inside a circle of radius r, the stone
 * between lobes forming the cusps. First lobe points up (+y).
 */
export function foiled(cx: number, cy: number, r: number, foils: number, segments = 16): Section {
    const d = r * (foils <= 4 ? 0.42 : 0.5);
    const lobe = r - d;
    const parts: Vec2[][] = [ngon(segments, d * 1.02, 0, cx, cy)];
    for (let i = 0; i < foils; i++) {
        const a = Math.PI / 2 + (2 * Math.PI * i) / foils;
        parts.push(ngon(segments, lobe, 0, cx + d * Math.cos(a), cy + d * Math.sin(a)));
    }
    return CrossSection.union(parts.map((p) => CrossSection.ofPolygons([p])));
}

function dedupe(pts: Vec2[], eps = 1e-9): Vec2[] {
    const out: Vec2[] = [];
    for (const p of pts) {
        const q = out[out.length - 1];
        if (!q || Math.abs(p[0] - q[0]) > eps || Math.abs(p[1] - q[1]) > eps) out.push(p);
    }
    const first = out[0], last = out[out.length - 1];
    if (out.length > 1 && Math.abs(first[0] - last[0]) <= eps && Math.abs(first[1] - last[1]) <= eps) out.pop();
    return out;
}

/** Distance from a point to the nearest edge of any contour of a section. */
export function distanceToEdges(cs: Section, x: number, y: number): number {
    let best = Infinity;
    for (const poly of cs.toPolygons()) {
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const [ax, ay] = poly[j], [bx, by] = poly[i];
            const dx = bx - ax, dy = by - ay;
            const len2 = dx * dx + dy * dy;
            const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
            best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
        }
    }
    return best;
}

// ---------------------------------------------------------------- 3D constructors

/** Extrudes a profile in the XY plane up +Z. scaleTop < 1 tapers it; 0 makes a pyramid. */
export function extrude(profile: Profile, height: number, scaleTop: number | Vec2 = 1): Solid {
    const top: Vec2 = typeof scaleTop === "number" ? [scaleTop, scaleTop] : scaleTop;
    return Manifold.extrude(section(profile), height, 0, 0, top);
}

/**
 * Extrudes an elevation drawn in the (x, z) plane (the profile's y is world z) through `depth` along Y,
 * centred on y = 0. For window frames, tracery, flying buttress arches: anything seen face-on.
 */
export function extrudeElevation(profile: Profile, depth: number): Solid {
    // Rotating +90 degrees about X maps (x, y, z) to (x, -z, y).
    return Manifold.extrude(section(profile), depth).rotate([90, 0, 0]).translate([0, depth / 2, 0]);
}

/** Extrudes a cross-section drawn in the (y, z) plane along +X from x0 to x1: rails, copings, mouldings. */
export function extrudeAlongX(profile: Profile, x0: number, x1: number): Solid {
    // X then Z rotations map (u, v, w) to (w, u, v).
    return Manifold.extrude(section(profile), x1 - x0).rotate([90, 0, 90]).translate([x0, 0, 0]);
}

/**
 * Lathe: revolves a profile of (radius, z) points around the Z axis. Points with radius 0 lie on the axis.
 * segments = 4, 6, 8 gives square, hexagonal, octagonal solids of revolution.
 */
export function lathe(profile: Vec2[], segments = 24, degrees = 360): Solid {
    return Manifold.revolve(section(profile), segments, degrees);
}

/**
 * Sweeps a closed 2D profile along an open 3D polyline with rotation-minimising frames, capping both
 * ends. Profile u runs along the frame normal, v along the binormal. scales (one per path point)
 * taper the profile along the path. The path must not fold back on itself tighter than the profile.
 */
export function sweep(profile: Vec2[], path: Vec3[], scales?: number[]): Solid {
    const prof = ccw(profile);
    const m = prof.length, n = path.length;
    if (n < 2 || m < 3) throw new Error("sweep needs a path of 2+ points and a profile of 3+ points");
    const tangents: Vec3[] = path.map((_, i) => norm(sub(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)])));
    // Initial normal: any vector perpendicular to the first tangent.
    const t0 = tangents[0];
    const helper: Vec3 = Math.abs(t0[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let normal = norm(cross(cross(t0, helper), t0));
    const verts = new Float32Array(n * m * 3);
    for (let i = 0; i < n; i++) {
        const t = tangents[i];
        if (i > 0) normal = norm(sub(normal, scale(t, dot(normal, t)))); // parallel transport by projection
        const binormal = cross(t, normal);
        const s = scales ? scales[i] : 1;
        for (let j = 0; j < m; j++) {
            const [u, v] = prof[j];
            const o = (i * m + j) * 3;
            for (let k = 0; k < 3; k++) verts[o + k] = path[i][k] + s * (u * normal[k] + v * binormal[k]);
        }
    }
    const tris: number[] = [];
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < m; j++) {
            const a = i * m + j, b = i * m + ((j + 1) % m), c = a + m, d = b + m;
            tris.push(a, b, d, a, d, c);
        }
    }
    for (const [a, b, c] of triangulate([prof])) {
        tris.push(a, c, b); // start cap faces back along the path
        const e = (n - 1) * m;
        tris.push(e + a, e + b, e + c);
    }
    return Manifold.ofMesh(new Mesh({ numProp: 3, vertProperties: verts, triVerts: new Uint32Array(tris) }));
}

// ---------------------------------------------------------------- booleans

export function union(parts: Solid[]): Solid {
    const solids = parts.filter((p) => p && !p.isEmpty());
    if (solids.length === 0) return Manifold.cube([0, 0, 0]);
    return solids.length === 1 ? solids[0] : Manifold.union(solids);
}

export function difference(base: Solid, cutters: Solid[]): Solid {
    const cuts = cutters.filter((c) => c && !c.isEmpty());
    return cuts.length === 0 ? base : base.subtract(union(cuts));
}

export function intersection(parts: Solid[]): Solid {
    return Manifold.intersection(parts);
}

/** Axis-aligned box from min corner to max corner. */
export function box(min: Vec3, max: Vec3): Solid {
    return Manifold.cube([max[0] - min[0], max[1] - min[1], max[2] - min[2]]).translate(min);
}

// ---------------------------------------------------------------- small vector helpers

export function sub(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function scale(a: Vec3, s: number): Vec3 { return [a[0] * s, a[1] * s, a[2] * s]; }
export function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function cross(a: Vec3, b: Vec3): Vec3 {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function norm(a: Vec3): Vec3 {
    const l = Math.hypot(a[0], a[1], a[2]);
    return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 1];
}
