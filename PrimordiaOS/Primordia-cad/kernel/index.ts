// Primordia-cad geometry kernel: generate(kind, params) -> closed triangle mesh + render mesh + stats.
import { scoped } from "./manifold.ts";
import { bounds, extract } from "./mesh.ts";
import type { Box, RenderMesh, SolidMesh, SolidStats } from "./mesh.ts";
import { GENERATORS as GOTHIC } from "./gothic.ts";
import type { Generator } from "./gothic.ts";
import { SCIFI } from "./scifi.ts";
import { resolveParams } from "./params.ts";
import type { Params } from "./params.ts";
import type { Vec3 } from "./ops.ts";

export type { Generator } from "./gothic.ts";
export { toGLB } from "./export-gltf.ts";
export { toOBJ } from "./export-obj.ts";
export type { Box, RenderMesh, SolidMesh, SolidStats } from "./mesh.ts";

/** Every generator: the Gothic set and the sci-fi spires (names are unique across sets). */
export const GENERATORS: Record<string, Generator> = { ...GOTHIC, ...SCIFI };

export const DEFAULT_KIND = "spire";
// Keys that callers put in the params object that are not generator parameters.
const NON_PARAM_KEYS = ["kind", "generator", "name", "wallThickness", "material", "topologyMode"];

export interface Geometry {
    kind: string;
    name: string; // asset name, e.g. SM_GothicSpire or SM_SciFiArcologySpire
    params: Params; // resolved: defaults filled in, clamped
    warnings: string[];
    solid: SolidMesh; // welded, closed
    render: RenderMesh; // split normals, UVs, material groups
    stats: SolidStats;
    bounds: Box; // actual
    statedBounds: Box; // the generator's guaranteed envelope
    sockets: Record<string, Vec3>;
}

export function generatorFor(kind: string): Generator {
    const gen = GENERATORS[kind];
    if (!gen) throw new Error(`unknown generator "${kind}"; known: ${Object.keys(GENERATORS).join(", ")}`);
    return gen;
}

export function generate(kind: string = DEFAULT_KIND, raw: Record<string, unknown> = {}, name?: string): Geometry {
    const gen = generatorFor(kind);
    const { params, warnings } = resolveParams(gen.params, raw, NON_PARAM_KEYS);
    return scoped(() => {
        const solid = gen.build(params, (msg) => warnings.push(msg));
        if (solid.status() !== "NoError") throw new Error(`${kind}: kernel reported ${solid.status()}`);
        const out = extract(solid, gen.material);
        return {
            kind,
            name: name ?? `SM_${gen.prefix ?? "Gothic"}${gen.title}`,
            params,
            warnings,
            solid: out.solid,
            render: out.render,
            stats: out.stats,
            bounds: bounds(out.solid.positions),
            statedBounds: gen.bounds(params),
            sockets: gen.sockets ? gen.sockets(params) : {},
        };
    });
}
