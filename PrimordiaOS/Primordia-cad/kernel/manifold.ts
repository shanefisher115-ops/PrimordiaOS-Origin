// Loads the manifold-3d WASM kernel once, with top-level await, so every geometry call made after
// import is synchronous (regenerateGeometry keeps its synchronous contract).
//
// WASM objects are not garbage collected by JavaScript. Every Manifold/CrossSection created inside
// scoped() is recorded and deleted when the scope ends, so agents can regenerate parts in a loop
// without leaking WASM memory.
import Module from "manifold-3d";
import type { CrossSection as CrossSectionT, Manifold as ManifoldT } from "manifold-3d/manifold";

const wasm = await Module();
wasm.setup();

export const Manifold = wasm.Manifold;
export const CrossSection = wasm.CrossSection;
export const Mesh = wasm.Mesh;
export const triangulate = wasm.triangulate;
export type Solid = ManifoldT;
export type Section = CrossSectionT;

export const DEFAULT_MATERIAL = "Stone";

type Deletable = { delete(): void };
let live: Deletable[] | null = null;
const materials = new Map<number, string>();

function track(target: any, names: string[]) {
    for (const name of names) {
        const original = target[name];
        if (typeof original !== "function") continue;
        target[name] = function (this: unknown, ...args: unknown[]) {
            const out = original.apply(this, args);
            if (live) {
                if (Array.isArray(out)) live.push(...out);
                else if (out && typeof out.delete === "function") live.push(out);
            }
            return out;
        };
    }
}

track(Manifold, ["cube", "cylinder", "sphere", "tetrahedron", "extrude", "revolve", "compose", "union",
    "difference", "intersection", "levelSet", "smooth", "ofMesh", "hull"]);
track(Manifold.prototype, ["add", "subtract", "intersect", "decompose", "warp", "transform", "translate",
    "rotate", "scale", "mirror", "calculateCurvature", "calculateNormals", "smoothByNormals", "smoothOut",
    "refine", "refineToLength", "refineToTolerance", "setProperties", "setTolerance", "simplify", "asOriginal",
    "trimByPlane", "split", "splitByPlane", "slice", "project", "hull"]);
track(CrossSection, ["square", "circle", "union", "difference", "intersection", "compose", "ofPolygons", "hull"]);
track(CrossSection.prototype, ["add", "subtract", "intersect", "rectClip", "decompose", "transform", "translate",
    "rotate", "scale", "mirror", "simplify", "offset", "hull", "extrude", "revolve"]);

/** Runs fn and frees every WASM object created while it ran. Nested calls share the outer scope. */
export function scoped<T>(fn: () => T): T {
    if (live) return fn();
    live = [];
    try {
        return fn();
    } finally {
        const created = live;
        live = null;
        for (const obj of created) {
            try { obj.delete(); } catch { /* already freed */ }
        }
        materials.clear();
    }
}

/** Marks a solid's triangles with a material name; the name survives booleans and transforms. */
export function tag(solid: Solid, material: string): Solid {
    const tagged = solid.asOriginal();
    materials.set(tagged.originalID(), material);
    return tagged;
}

export function materialOf(originalId: number, fallback = DEFAULT_MATERIAL): string {
    return materials.get(originalId) ?? fallback;
}
